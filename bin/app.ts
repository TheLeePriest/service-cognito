#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ServiceCognitoStack } from "../cdk/stacks/ServiceCognitoStack";

const stage = process.env.STAGE || "dev";
const eventBusName = process.env.EVENT_BUS_NAME || "event-bus";

const app = new cdk.App();
new ServiceCognitoStack(app, `ServiceCognitoStack-${stage}`, {
	stage,
	serviceName: "service-cognito",
	eventBusName: `${eventBusName}-${stage}`,
});
