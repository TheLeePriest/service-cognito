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
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { Effect } from "aws-cdk-lib/aws-iam";

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

		// Setup SES email identity only for production
		let cdkInsightsEmailIdentity: EmailIdentity | undefined;
		if (stage === "prod") {
			const domainName = "cdkinsights.dev";
			
			const cdkInsightsHostedZone = HostedZone.fromLookup(
				this,
				"CdkInsightsHostedZone",
				{
					domainName: domainName,
				},
			);

			// Create SES email identity for the domain
			cdkInsightsEmailIdentity = new EmailIdentity(
				this,
				`${serviceName}-ses-identity-${stage}`,
				{
					identity: Identity.publicHostedZone(cdkInsightsHostedZone),
				},
			);

			// Output the SES identity ARN
			new CfnOutput(this, "SesIdentityArn", {
				value: cdkInsightsEmailIdentity.emailIdentityArn,
				description: `SES Email Identity ARN for ${domainName}`,
				exportName: `${serviceName}-ses-identity-arn-${stage}`,
			});

			console.log(
				`✅ SES email identity configured for ${domainName}`,
			);
		}

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

		
		
		// Create User Pool with proper SES configuration
		const userPoolEmail = stage === "prod" 
			? UserPoolEmail.withSES({
				fromEmail: "support@cdkinsights.dev",
				fromName: "CDK Insights",
				replyTo: "support@cdkinsights.dev",
				sesRegion: "eu-west-2",
				sesVerifiedDomain: "cdkinsights.dev",
			})
			: UserPoolEmail.withCognito();

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
			email: userPoolEmail,
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
		// Ensure the SES email identity is created before the User Pool
		if (stage === "prod" && cdkInsightsEmailIdentity) {
			userPool.node.addDependency(cdkInsightsEmailIdentity);
		}

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

		// SES email configuration
		const sesFromEmail =
			stage === "prod" ? "support@cdkinsights.dev" : "support@dev.cdkinsights.dev";
		const sesReplyToEmail =
			stage === "prod" ? "support@cdkinsights.dev" : "support@dev.cdkinsights.dev";

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
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
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
					"cognito-idp:AdminUpdateUserAttributes",
					"cognito-idp:ListUsers",
				],
				resources: [userPool.userPoolArn],
			}),
		);

		// Allow SES sending for welcome emails with license key
		customerCreatedLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		// Listen to LicenseCreated events from service.license
		// This ensures the license key is available when creating the Cognito user
		// so we can send a combined welcome email with temp password + license key
		const customerCreatedRule = new Rule(
			this,
			`${serviceName}-customer-created-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-customer-created-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["LicenseCreated"],
				},
			},
		);

		customerCreatedRule.addTarget(
			new LambdaFunction(customerCreatedLambda.tsLambdaFunction),
		);

		// ============================================================================
		// Team Member Activated Lambda (for team invitations)
		// ============================================================================

		const teamMemberActivatedLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/TeamMemberActivated/TeamMemberActivated.handler.ts",
		);

		const teamMemberActivatedLogGroup = new LogGroup(
			this,
			`${serviceName}-team-member-activated-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-team-member-activated-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const teamMemberActivatedLambda = new TSLambdaFunction(
			this,
			`${serviceName}-team-member-activated-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "handler",
				entryPath: teamMemberActivatedLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-team-member-activated-${stage}`,
				customOptions: {
					logGroup: teamMemberActivatedLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 256,
					environment: {
						EVENT_BUS_NAME: eventBus.eventBusName,
						USER_POOL_ID: userPool.userPoolId,
					},
				},
			},
		);

		eventBus.grantPutEventsTo(teamMemberActivatedLambda.tsLambdaFunction);

		teamMemberActivatedLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				actions: [
					"cognito-idp:AdminCreateUser",
					"cognito-idp:AdminSetUserPassword",
					"cognito-idp:ListUsers",
				],
				resources: [userPool.userPoolArn],
			}),
		);

		// Listen for TeamMemberActivated events from service-user
		const teamMemberActivatedRule = new Rule(
			this,
			`${serviceName}-team-member-activated-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-team-member-activated-rule-${stage}`,
				eventPattern: {
					source: ["service.user"],
					detailType: ["TeamMemberActivated"],
				},
			},
		);

		teamMemberActivatedRule.addTarget(
			new LambdaFunction(teamMemberActivatedLambda.tsLambdaFunction),
		);

		// ============================================================================
		// Send Trial Will End Email (via SES)
		// ============================================================================

		const sendTrialWillEndEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendTrialWillEndEmail/SendTrialWillEndEmail.handler.ts",
		);

		const sendTrialWillEndEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-send-trial-will-end-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-send-trial-will-end-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		// Note: sesFromEmail and sesReplyToEmail are defined earlier in this file

		const sendTrialWillEndEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-send-trial-will-end-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendTrialWillEndEmailHandler",
				entryPath: sendTrialWillEndEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-send-trial-will-end-email-${stage}`,
				customOptions: {
					logGroup: sendTrialWillEndEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 256,
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		// Allow SES sending
		sendTrialWillEndEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendTrialWillEndEmailRule = new Rule(
			this,
			`${serviceName}-send-trial-will-end-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-send-trial-will-end-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendTrialWillEndEmail"],
				},
			},
		);

		sendTrialWillEndEmailRule.addTarget(
			new LambdaFunction(sendTrialWillEndEmailLambda.tsLambdaFunction),
		);

		// ============================================================================
		// Send License Upgraded Email (via SES)
		// ============================================================================

		const sendLicenseUpgradedEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendLicenseUpgradedEmail/SendLicenseUpgradedEmail.handler.ts",
		);

		const sendLicenseUpgradedEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-send-license-upgraded-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-send-license-upgraded-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendLicenseUpgradedEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-send-license-upgraded-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendLicenseUpgradedEmailHandler",
				entryPath: sendLicenseUpgradedEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-send-license-upgraded-email-${stage}`,
				customOptions: {
					logGroup: sendLicenseUpgradedEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 256,
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		// Allow SES sending
		sendLicenseUpgradedEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendLicenseUpgradedEmailRule = new Rule(
			this,
			`${serviceName}-send-license-upgraded-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-send-license-upgraded-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendLicenseUpgradedEmail"],
				},
			},
		);

		sendLicenseUpgradedEmailRule.addTarget(
			new LambdaFunction(sendLicenseUpgradedEmailLambda.tsLambdaFunction),
		);
	}
}
