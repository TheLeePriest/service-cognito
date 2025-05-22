import { RemovalPolicy, Duration, Stack } from "aws-cdk-lib";
import type { Construct } from "constructs";
import {
	UserPool,
	UserPoolClient,
	UserPoolEmail,
	StringAttribute,
	CfnIdentityPool,
	CfnIdentityPoolRoleAttachment,
} from "aws-cdk-lib/aws-cognito";
import type { CognitoStackProps } from "../types/stacks.types";
import path from "node:path";
import { FederatedPrincipal, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { TSLambdaFunction } from "the-ldk";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

export class ServiceCognitoStack extends Stack {
	public readonly userPoolClient: UserPoolClient;
	public readonly identityPoolId: string;

	constructor(scope: Construct, id: string, props: CognitoStackProps) {
		super(scope, id, props);

		const { stage, eventBusName, serviceName } = props;
		const tsConfigPath = path.join(__dirname, "../../tsconfig.json");

		const eventBus = EventBus.fromEventBusName(
			this,
			`${serviceName}-event-bus-${stage}`,
			eventBusName,
		);

		const userPool = new UserPool(this, `${serviceName}user-pool-${stage}`, {
			userPoolName: `${serviceName}-user-pool-${stage}`,
			selfSignUpEnabled: true,
			signInAliases: {
				email: true,
			},
			autoVerify: {
				email: true,
			},
			removalPolicy: RemovalPolicy.DESTROY,
			email: UserPoolEmail.withCognito(),
			customAttributes: {
				subscriptionTier: new StringAttribute({
					mutable: true,
					minLen: 1,
					maxLen: 50,
				}),
				stripeCustomerId: new StringAttribute({ mutable: true, maxLen: 100 }),
				apiKeyId: new StringAttribute({ mutable: true, maxLen: 100 }),
			},
		});

		this.userPoolClient = new UserPoolClient(
			this,
			`${serviceName}user-pool-client-${stage}`,
			{
				userPool,
				generateSecret: false,
			},
		);

		const identityPool = new CfnIdentityPool(
			this,
			`${serviceName}-identity-pool-${stage}`,
			{
				identityPoolName: `${serviceName}-identity-pool-${stage}`,
				allowUnauthenticatedIdentities: false,
				cognitoIdentityProviders: [
					{
						clientId: this.userPoolClient.userPoolClientId,
						providerName: userPool.userPoolProviderName,
					},
				],
			},
		);
		this.identityPoolId = identityPool.ref;

		const authRole = new Role(this, `CognitoAuthRole-${stage}`, {
			assumedBy: new FederatedPrincipal(
				"cognito-identity.amazonaws.com",
				{
					StringEquals: {
						"cognito-identity.amazonaws.com:aud": identityPool.ref,
					},
					"ForAnyValue:StringLike": {
						"cognito-identity.amazonaws.com:amr": "authenticated",
					},
				},
				"sts:AssumeRoleWithWebIdentity",
			),
		});

		authRole.addToPolicy(
			new PolicyStatement({
				actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
				resources: ["*"],
			}),
		);

		const unauthRole = new Role(this, `CognitoUnauthRole-${stage}`, {
			assumedBy: new FederatedPrincipal(
				"cognito-identity.amazonaws.com",
				{
					StringEquals: {
						"cognito-identity.amazonaws.com:aud": identityPool.ref,
					},
					"ForAnyValue:StringLike": {
						"cognito-identity.amazonaws.com:amr": "unauthenticated",
					},
				},
				"sts:AssumeRoleWithWebIdentity",
			),
		});

		new CfnIdentityPoolRoleAttachment(
			this,
			`IdentityPoolRoleAttachment-${stage}`,
			{
				identityPoolId: identityPool.ref,
				roles: {
					authenticated: authRole.roleArn,
					unauthenticated: unauthRole.roleArn,
				},
			},
		);

		const createCognitoUserLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/CreateCognitoUser/CreateCognitoUser.handler.ts",
		);

		const createCognitoUserLogGroup = new LogGroup(
			this,
			`${serviceName}-user-stream-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-create-cognito-user-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const createCognitoUserLambda = new TSLambdaFunction(
			this,
			`${serviceName}-create-cognito-user-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "createCognitoUserHandler",
				entryPath: createCognitoUserLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-create-cognito-user-${stage}`,
				customOptions: {
					logGroup: createCognitoUserLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 256,
					environment: {
						EVENT_BUS_NAME: eventBus.eventBusName,
						USER_POOL_ID: userPool.userPoolId,
					},
				},
			},
		);

		eventBus.grantPutEventsTo(createCognitoUserLambda.tsLambdaFunction);

		createCognitoUserLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				actions: [
					"cognito-idp:AdminCreateUser",
					"cognito-idp:AdminGetUser",
					"cognito-idp:AdminSetUserPassword",
				],
				resources: [userPool.userPoolArn],
			}),
		);

		const createCognitoUserRule = new Rule(
			this,
			`${serviceName}-subscription-conductor-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-subscription-conductor-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["CustomerCreated"],
				},
			},
		);

		createCognitoUserRule.addTarget(
			new LambdaFunction(createCognitoUserLambda.tsLambdaFunction),
		);
	}
}
