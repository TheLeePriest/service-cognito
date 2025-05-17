import type { NestedStackProps } from "aws-cdk-lib";

export type CognitoStackProps = NestedStackProps & {
	stage: string;
	serviceName: string;
	eventBusName: string;
};
