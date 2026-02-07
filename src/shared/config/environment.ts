import { env as envolutionEnv } from "envolution";
import { z } from "zod";

// Environment variable schema with validation
const EnvironmentSchema = z.object({
  // Core configuration
  STAGE: z.enum(["dev", "prod", "test"]).default("dev"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),

  // AWS Resources
  USER_POOL_ID: z.string().min(1).optional(),
  EVENT_BUS_NAME: z.string().min(1).optional(),
  SES_FROM_EMAIL: z.string().email().optional(),
  SES_REPLY_TO_EMAIL: z.string().email().optional(),

  // Cross-service consent checking
  CONSENT_TABLE_NAME: z.string().min(1).optional(),
  USERS_TABLE_NAME: z.string().min(1).optional(),

  // AWS Lambda specific
  AWS_REGION: z.string().optional(),
  AWS_LAMBDA_FUNCTION_NAME: z.string().optional(),
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: z.string().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// Create a wrapper that maintains the same API as the original
export const env = {
  get: <K extends keyof Environment>(key: K): Environment[K] => {
    return envolutionEnv.get(key as string) as Environment[K];
  },

  getRequired: <K extends keyof Environment>(
    key: K,
    context?: string,
  ): NonNullable<Environment[K]> => {
    return envolutionEnv.getRequired(key as string, context) as NonNullable<
      Environment[K]
    >;
  },

  getAll: (): Environment => {
    return envolutionEnv.getAll() as Environment;
  },

  // Convenience getters for commonly used values
  get stage(): Environment["STAGE"] {
    return envolutionEnv.stage as Environment["STAGE"];
  },

  get isProduction(): boolean {
    return envolutionEnv.isProduction;
  },

  get isDevelopment(): boolean {
    return envolutionEnv.isDevelopment;
  },

  get isTest(): boolean {
    return envolutionEnv.isTest;
  },
};

// Export the envolution instance for advanced usage if needed
export const envConfigInstance = envolutionEnv; 