import type { StackProps } from "aws-cdk-lib";

export type CognitoStackProps = StackProps & {
	stage: string;
	serviceName: string;
	eventBusName: string;
};
