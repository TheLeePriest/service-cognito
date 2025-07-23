import { RemovalPolicy, Duration, Stack, CfnOutput } from "aws-cdk-lib";
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
import {
	FederatedPrincipal,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { TSLambdaFunction } from "the-ldk";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { userInvitationHtml } from "../../src/email/html/userInvitation/userInvitation";

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

		const userInvitationEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/UserInvitation/UserInvitation.handler.ts",
		);

		const userInvitationEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-user-invitation-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-user-invitation-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const userInvitationEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-user-invitation-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "userInvitationHandler",
				entryPath: userInvitationEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-user-invitation-email-${stage}`,
				customOptions: {
					logGroup: userInvitationEmailLogGroup,
					timeout: Duration.seconds(10),
					memorySize: 128,
				},
			},
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
			// TODO: Re-enable SES integration once domain verification is complete
			// email: UserPoolEmail.withSES({
			// 	fromEmail: stage === "dev" ? "noreply@dev.cdkinsights.dev" : "noreply@cdkinsights.dev",
			// 	fromName: "CDK Insights",
			// 	replyTo: stage === "dev" ? "support@dev.cdkinsights.dev" : "support@cdkinsights.dev",
			// 	sesRegion: "eu-west-2",
			// 	sesVerifiedDomain: stage === "dev" ? "dev.cdkinsights.dev" : "cdkinsights.dev",
			// }),
			customAttributes: {
				subscriptionTier: new StringAttribute({
					mutable: true,
					minLen: 1,
					maxLen: 50,
				}),
				stripeCustomerId: new StringAttribute({ mutable: true, maxLen: 100 }),
				apiKeyId: new StringAttribute({ mutable: true, maxLen: 100 }),
				name: new StringAttribute({ mutable: true, maxLen: 100 }),
			},
			lambdaTriggers: {
				customMessage: userInvitationEmailLambda.tsLambdaFunction,
			},
		});

		userInvitationEmailLambda.tsLambdaFunction.addPermission(
			"AllowCognitoInvoke",
			{
				principal: new ServicePrincipal("cognito-idp.amazonaws.com"),
				action: "lambda:InvokeFunction",
				sourceArn: userPool.userPoolArn,
			},
		);

		// Grant Cognito permission to send emails via SES
		// The SES integration will handle permissions automatically
		// when using UserPoolEmail.withSES()

		new StringParameter(this, `${serviceName}-user-pool-id-param`, {
			parameterName: `/${stage}/userPoolId`,
			stringValue: userPool.userPoolId,
			description: `Cognito User Pool ID for ${serviceName}`,
		});

		// Outputs for verification
		new CfnOutput(this, "UserPoolId", {
			value: userPool.userPoolId,
			description: "Cognito User Pool ID",
			exportName: `${serviceName}-user-pool-id-${stage}`,
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

		const customerCreatedLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/CustomerCreated/CustomerCreated.handler.ts",
		);

		const customerCreatedLogGroup = new LogGroup(
			this,
			`${serviceName}-customer-created-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-customer-created-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const customerCreatedLambda = new TSLambdaFunction(
			this,
			`${serviceName}-customer-created-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "customerCreatedHandler",
				entryPath: customerCreatedLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-customer-created-${stage}`,
				customOptions: {
					logGroup: customerCreatedLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 256,
					environment: {
						EVENT_BUS_NAME: eventBus.eventBusName,
						USER_POOL_ID: userPool.userPoolId,
					},
				},
			},
		);

		eventBus.grantPutEventsTo(customerCreatedLambda.tsLambdaFunction);

		customerCreatedLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				actions: [
					"cognito-idp:AdminCreateUser",
					"cognito-idp:AdminGetUser",
					"cognito-idp:AdminSetUserPassword",
				],
				resources: [userPool.userPoolArn],
			}),
		);

		const customerCreatedRule = new Rule(
			this,
			`${serviceName}-customer-created-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-customer-created-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["CustomerCreated"],
				},
			},
		);

		customerCreatedRule.addTarget(
			new LambdaFunction(customerCreatedLambda.tsLambdaFunction),
		);
	}
}
