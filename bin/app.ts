#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ServiceCognitoStack } from "../cdk/stacks/ServiceCognitoStack";

const stage = process.env.STAGE || "dev";
const eventBusName = process.env.EVENT_BUS_NAME || "event-bus";

const app = new cdk.App();
new ServiceCognitoStack(app, `service-cognito-${stage}`, {
	stage,
	serviceName: "service-cognito",
	eventBusName: `${eventBusName}-${stage}`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT ?? app.account,
		region: process.env.CDK_DEFAULT_REGION ?? app.region,
	},
});
