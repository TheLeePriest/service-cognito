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
import { Queue } from "aws-cdk-lib/aws-sqs";
import {
	Alarm,
	ComparisonOperator,
	TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Table } from "aws-cdk-lib/aws-dynamodb";

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

		const eventHandlerDLQ = new Queue(
			this,
			`${serviceName}-event-handler-dlq-${stage}`,
			{
				queueName: `${serviceName}-event-handler-dlq-${stage}`,
				retentionPeriod: Duration.days(14),
			},
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
				customerName: new StringAttribute({ mutable: true, maxLen: 100 }),
				licenseKey: new StringAttribute({ mutable: true, maxLen: 100 }),
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
		// In dev, use a verified email address since dev.cdkinsights.dev domain is not in this account
		const sesFromEmail =
			stage === "prod" ? "support@cdkinsights.dev" : "lpleepriest@gmail.com";
		const sesReplyToEmail =
			stage === "prod" ? "support@cdkinsights.dev" : "lpleepriest@gmail.com";

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
					memorySize: 192, // Optimized: I/O bound (Cognito + EventBridge + SES)
					environment: {
						EVENT_BUS_NAME: eventBus.eventBusName,
						USER_POOL_ID: userPool.userPoolId,
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
						STAGE: stage,
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
			new LambdaFunction(customerCreatedLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
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
					memorySize: 192, // Optimized: I/O bound (Cognito + EventBridge)
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
			new LambdaFunction(teamMemberActivatedLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
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
					memorySize: 192, // Optimized: I/O bound (SES only)
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
			new LambdaFunction(sendTrialWillEndEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
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
					memorySize: 192, // Optimized: I/O bound (SES only)
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
			new LambdaFunction(sendLicenseUpgradedEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Payment Failed Email (via SES)
		// ============================================================================

		const sendPaymentFailedEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendPaymentFailedEmail/SendPaymentFailedEmail.handler.ts",
		);

		const sendPaymentFailedEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-payment-failed-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-payment-failed-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendPaymentFailedEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-payment-failed-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendPaymentFailedEmailHandler",
				entryPath: sendPaymentFailedEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-payment-failed-email-${stage}`,
				customOptions: {
					logGroup: sendPaymentFailedEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendPaymentFailedEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendPaymentFailedEmailRule = new Rule(
			this,
			`${serviceName}-payment-failed-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-payment-failed-email-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["SendPaymentFailedEmail"],
				},
			},
		);

		sendPaymentFailedEmailRule.addTarget(
			new LambdaFunction(sendPaymentFailedEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Trial Expired Email (via SES)
		// ============================================================================

		const sendTrialExpiredEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendTrialExpiredEmail/SendTrialExpiredEmail.handler.ts",
		);

		const sendTrialExpiredEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-trial-expired-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-trial-expired-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendTrialExpiredEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-trial-expired-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendTrialExpiredEmailHandler",
				entryPath: sendTrialExpiredEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-trial-expired-email-${stage}`,
				customOptions: {
					logGroup: sendTrialExpiredEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendTrialExpiredEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendTrialExpiredEmailRule = new Rule(
			this,
			`${serviceName}-trial-expired-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-trial-expired-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendTrialExpiredEmail"],
				},
			},
		);

		sendTrialExpiredEmailRule.addTarget(
			new LambdaFunction(sendTrialExpiredEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Subscription Cancelled Email (via SES)
		// ============================================================================

		const sendSubscriptionCancelledEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendSubscriptionCancelledEmail/SendSubscriptionCancelledEmail.handler.ts",
		);

		const sendSubscriptionCancelledEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-sub-cancelled-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-sub-cancelled-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendSubscriptionCancelledEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-sub-cancelled-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendSubscriptionCancelledEmailHandler",
				entryPath: sendSubscriptionCancelledEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-sub-cancelled-email-${stage}`,
				customOptions: {
					logGroup: sendSubscriptionCancelledEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendSubscriptionCancelledEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendSubscriptionCancelledEmailRule = new Rule(
			this,
			`${serviceName}-sub-cancelled-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-sub-cancelled-email-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["SendSubscriptionCancelledEmail"],
				},
			},
		);

		sendSubscriptionCancelledEmailRule.addTarget(
			new LambdaFunction(sendSubscriptionCancelledEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Subscription Renewal Reminder Email (via SES)
		// ============================================================================

		const sendSubscriptionRenewalReminderEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendSubscriptionRenewalReminderEmail/SendSubscriptionRenewalReminderEmail.handler.ts",
		);

		const sendSubscriptionRenewalReminderEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-sub-renewal-reminder-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-sub-renewal-reminder-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendSubscriptionRenewalReminderEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-sub-renewal-reminder-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendSubscriptionRenewalReminderEmailHandler",
				entryPath: sendSubscriptionRenewalReminderEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-sub-renewal-reminder-email-${stage}`,
				customOptions: {
					logGroup: sendSubscriptionRenewalReminderEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendSubscriptionRenewalReminderEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendSubscriptionRenewalReminderEmailRule = new Rule(
			this,
			`${serviceName}-sub-renewal-reminder-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-sub-renewal-reminder-email-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["SendSubscriptionRenewalReminderEmail"],
				},
			},
		);

		sendSubscriptionRenewalReminderEmailRule.addTarget(
			new LambdaFunction(sendSubscriptionRenewalReminderEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Subscription Renewed Email (via SES)
		// ============================================================================

		const sendSubscriptionRenewedEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendSubscriptionRenewedEmail/SendSubscriptionRenewedEmail.handler.ts",
		);

		const sendSubscriptionRenewedEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-sub-renewed-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-sub-renewed-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendSubscriptionRenewedEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-sub-renewed-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendSubscriptionRenewedEmailHandler",
				entryPath: sendSubscriptionRenewedEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-sub-renewed-email-${stage}`,
				customOptions: {
					logGroup: sendSubscriptionRenewedEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendSubscriptionRenewedEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendSubscriptionRenewedEmailRule = new Rule(
			this,
			`${serviceName}-sub-renewed-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-sub-renewed-email-rule-${stage}`,
				eventPattern: {
					source: ["service.stripe"],
					detailType: ["SendSubscriptionRenewedEmail"],
				},
			},
		);

		sendSubscriptionRenewedEmailRule.addTarget(
			new LambdaFunction(sendSubscriptionRenewedEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Quota Warning Email (via SES)
		// ============================================================================

		const sendQuotaWarningEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendQuotaWarningEmail/SendQuotaWarningEmail.handler.ts",
		);

		const sendQuotaWarningEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-quota-warning-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-quota-warning-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendQuotaWarningEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-quota-warning-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendQuotaWarningEmailHandler",
				entryPath: sendQuotaWarningEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-quota-warning-email-${stage}`,
				customOptions: {
					logGroup: sendQuotaWarningEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendQuotaWarningEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendQuotaWarningEmailRule = new Rule(
			this,
			`${serviceName}-quota-warning-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-quota-warning-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendQuotaWarningEmail"],
				},
			},
		);

		sendQuotaWarningEmailRule.addTarget(
			new LambdaFunction(sendQuotaWarningEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Quota Exceeded Email (via SES)
		// ============================================================================

		const sendQuotaExceededEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendQuotaExceededEmail/SendQuotaExceededEmail.handler.ts",
		);

		const sendQuotaExceededEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-quota-exceeded-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-quota-exceeded-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendQuotaExceededEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-quota-exceeded-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendQuotaExceededEmailHandler",
				entryPath: sendQuotaExceededEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-quota-exceeded-email-${stage}`,
				customOptions: {
					logGroup: sendQuotaExceededEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendQuotaExceededEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendQuotaExceededEmailRule = new Rule(
			this,
			`${serviceName}-quota-exceeded-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-quota-exceeded-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendQuotaExceededEmail"],
				},
			},
		);

		sendQuotaExceededEmailRule.addTarget(
			new LambdaFunction(sendQuotaExceededEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Monthly Usage Summary Email (via SES)
		// ============================================================================

		const sendMonthlyUsageSummaryEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendMonthlyUsageSummaryEmail/SendMonthlyUsageSummaryEmail.handler.ts",
		);

		const sendMonthlyUsageSummaryEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-usage-summary-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-usage-summary-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendMonthlyUsageSummaryEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-usage-summary-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendMonthlyUsageSummaryEmailHandler",
				entryPath: sendMonthlyUsageSummaryEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-usage-summary-email-${stage}`,
				customOptions: {
					logGroup: sendMonthlyUsageSummaryEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendMonthlyUsageSummaryEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendMonthlyUsageSummaryEmailRule = new Rule(
			this,
			`${serviceName}-usage-summary-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-usage-summary-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendMonthlyUsageSummaryEmail"],
				},
			},
		);

		sendMonthlyUsageSummaryEmailRule.addTarget(
			new LambdaFunction(sendMonthlyUsageSummaryEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Re-Engagement Email (via SES)
		// ============================================================================

		const sendReEngagementEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendReEngagementEmail/SendReEngagementEmail.handler.ts",
		);

		const sendReEngagementEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-reengagement-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-reengagement-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendReEngagementEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-reengagement-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendReEngagementEmailHandler",
				entryPath: sendReEngagementEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-reengagement-email-${stage}`,
				customOptions: {
					logGroup: sendReEngagementEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendReEngagementEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendReEngagementEmailRule = new Rule(
			this,
			`${serviceName}-reengagement-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-reengagement-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendReEngagementEmail"],
				},
			},
		);

		sendReEngagementEmailRule.addTarget(
			new LambdaFunction(sendReEngagementEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Feature Announcement Email (via SES)
		// ============================================================================

		const sendFeatureAnnouncementEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendFeatureAnnouncementEmail/SendFeatureAnnouncementEmail.handler.ts",
		);

		const sendFeatureAnnouncementEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-feature-announce-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-feature-announce-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendFeatureAnnouncementEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-feature-announce-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendFeatureAnnouncementEmailHandler",
				entryPath: sendFeatureAnnouncementEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-feature-announce-email-${stage}`,
				customOptions: {
					logGroup: sendFeatureAnnouncementEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendFeatureAnnouncementEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendFeatureAnnouncementEmailRule = new Rule(
			this,
			`${serviceName}-feature-announce-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-feature-announce-email-rule-${stage}`,
				eventPattern: {
					source: ["service.marketing"],
					detailType: ["SendFeatureAnnouncementEmail"],
				},
			},
		);

		sendFeatureAnnouncementEmailRule.addTarget(
			new LambdaFunction(sendFeatureAnnouncementEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Send Feedback Request Email (via SES)
		// ============================================================================

		const sendFeedbackRequestEmailLambdaPath = path.join(
			__dirname,
			"../../src/functions/Lambda/Email/SendFeedbackRequestEmail/SendFeedbackRequestEmail.handler.ts",
		);

		const sendFeedbackRequestEmailLogGroup = new LogGroup(
			this,
			`${serviceName}-feedback-email-log-group-${stage}`,
			{
				logGroupName: `/aws/lambda/${serviceName}-feedback-email-${stage}`,
				retention: 7,
				removalPolicy:
					stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			},
		);

		const sendFeedbackRequestEmailLambda = new TSLambdaFunction(
			this,
			`${serviceName}-feedback-email-lambda-${stage}`,
			{
				serviceName,
				stage,
				handlerName: "sendFeedbackRequestEmailHandler",
				entryPath: sendFeedbackRequestEmailLambdaPath,
				tsConfigPath,
				functionName: `${serviceName}-feedback-email-${stage}`,
				customOptions: {
					logGroup: sendFeedbackRequestEmailLogGroup,
					timeout: Duration.seconds(30),
					memorySize: 192, // Optimized: I/O bound (SES only)
					environment: {
						SES_FROM_EMAIL: sesFromEmail,
						SES_REPLY_TO_EMAIL: sesReplyToEmail,
					},
				},
			},
		);

		sendFeedbackRequestEmailLambda.tsLambdaFunction.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ["ses:SendEmail", "ses:SendRawEmail"],
				resources: stage === "prod" && cdkInsightsEmailIdentity
					? [cdkInsightsEmailIdentity.emailIdentityArn]
					: ["*"],
			}),
		);

		const sendFeedbackRequestEmailRule = new Rule(
			this,
			`${serviceName}-feedback-email-rule-${stage}`,
			{
				eventBus,
				ruleName: `${serviceName}-feedback-email-rule-${stage}`,
				eventPattern: {
					source: ["service.license"],
					detailType: ["SendFeedbackRequestEmail"],
				},
			},
		);

		sendFeedbackRequestEmailRule.addTarget(
			new LambdaFunction(sendFeedbackRequestEmailLambda.tsLambdaFunction, {
				deadLetterQueue: eventHandlerDLQ,
				maxEventAge: Duration.hours(1),
				retryAttempts: 2,
			}),
		);

		// ============================================================================
		// Consent Checking — cross-service DynamoDB access
		// ============================================================================

		const consentTableName = StringParameter.fromStringParameterAttributes(
			this,
			`${serviceName}-consent-table-name-${stage}`,
			{ parameterName: `/${stage}/cdkinsights/consent/table-name` },
		).stringValue;

		const usersTableName = StringParameter.fromStringParameterAttributes(
			this,
			`${serviceName}-users-table-name-${stage}`,
			{ parameterName: `/${stage}/cdkinsights/users/table-name` },
		).stringValue;

		const consentTable = Table.fromTableName(this, "ConsentTableRef", consentTableName);
		const usersTable = Table.fromTableName(this, "UsersTableRef", usersTableName);

		const emailLambdas = [
			sendTrialWillEndEmailLambda,
			sendLicenseUpgradedEmailLambda,
			sendPaymentFailedEmailLambda,
			sendTrialExpiredEmailLambda,
			sendSubscriptionCancelledEmailLambda,
			sendSubscriptionRenewalReminderEmailLambda,
			sendSubscriptionRenewedEmailLambda,
			sendQuotaWarningEmailLambda,
			sendQuotaExceededEmailLambda,
			sendMonthlyUsageSummaryEmailLambda,
			sendReEngagementEmailLambda,
			sendFeatureAnnouncementEmailLambda,
			sendFeedbackRequestEmailLambda,
		];

		for (const lambda of emailLambdas) {
			lambda.tsLambdaFunction.addEnvironment("CONSENT_TABLE_NAME", consentTableName);
			lambda.tsLambdaFunction.addEnvironment("USERS_TABLE_NAME", usersTableName);
			consentTable.grantReadData(lambda.tsLambdaFunction);
			usersTable.grantReadData(lambda.tsLambdaFunction);
		}

		// ============================================================================
		// Centralised Alerting
		// ============================================================================

		const alertingTopicArn = StringParameter.fromStringParameterAttributes(
			this,
			`${serviceName}-alerting-topic-arn-${stage}`,
			{ parameterName: `/${stage}/cdkinsights/alerting/sns-topic-arn` },
		).stringValue;

		const alertingTopic = Topic.fromTopicArn(
			this,
			`${serviceName}-alerting-topic-ref-${stage}`,
			alertingTopicArn,
		);

		const dlqAlarm = new Alarm(
			this,
			`${serviceName}-event-handler-dlq-alarm-${stage}`,
			{
				alarmName: `${serviceName}-event-handler-dlq-alarm-${stage}`,
				alarmDescription:
					`[service-cognito] [${stage}] Failed event handler messages detected in DLQ. ` +
					"Events failed processing after 2 retries and are queued for inspection. " +
					"Check the target Lambda's CloudWatch logs to identify the root cause.",
				metric: eventHandlerDLQ.metricApproximateNumberOfMessagesVisible({
					period: Duration.minutes(5),
				}),
				threshold: 1,
				evaluationPeriods: 1,
				comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
			},
		);

		dlqAlarm.addAlarmAction(new SnsAction(alertingTopic));
	}
}
