import type {
  AdminCreateUserCommand,
  AdminCreateUserCommandOutput,
  AdminSetUserPasswordCommand,
  AdminSetUserPasswordCommandOutput,
  ListUsersCommand,
  ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import type { EventBridgeEvent } from "aws-lambda";

/**
 * Event emitted by TeamManagement when a team member accepts their invitation.
 */
export type TeamMemberActivatedEvent = EventBridgeEvent<
  "TeamMemberActivated",
  {
    email: string;
    name: string;
    teamId: string;
    subscriptionId: string;
    invitationId: string;
    role: string;
    activatedAt: number;
  }
>;

export type TeamMemberActivatedDependencies = {
  userPoolId: string;
  cognitoClient: {
    send: (
      command:
        | AdminCreateUserCommand
        | AdminSetUserPasswordCommand
        | ListUsersCommand,
    ) => Promise<
      | AdminCreateUserCommandOutput
      | AdminSetUserPasswordCommandOutput
      | ListUsersCommandOutput
    >;
  };
  eventBridge: {
    putEvent: (
      eventBusName: string,
      source: string,
      detailType: string,
      detail: Record<string, unknown>,
    ) => Promise<void>;
  };
  eventBusName: string;
  logger: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
  };
};
