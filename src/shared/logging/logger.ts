import {
  createStrogger,
  getEnvironment,
  createJsonFormatter,
  createCloudWatchTransport,
} from "strogger";
import { env } from "../config/environment";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  functionName?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

// Logger factory
export const createLogger = (functionName?: string) => {
  // Get log level from environment
  const getLogLevel = (): LogLevel => {
    const level = env.get("LOG_LEVEL")?.toLowerCase();
    switch (level) {
      case "debug":
        return "debug";
      case "info":
        return "info";
      case "warn":
        return "warn";
      case "error":
        return "error";
      default:
        return env.isProduction ? "info" : "debug";
    }
  };

  // Create strogger logger instance
  const stroggerEnv = getEnvironment();
  
  const stroggerLogger = createStrogger({
    env: stroggerEnv,
    config: {
      instanceId: functionName || "service-cognito",
    },
    formatter: createJsonFormatter(),
  });

  // Create wrapper that maintains the same interface
  const log = (
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void => {
    const metadata = {
      ...context,
      functionName:
        functionName ||
        context?.functionName ||
        process.env.AWS_LAMBDA_FUNCTION_NAME,
      stage: env.stage,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };

    switch (level) {
      case "debug":
        stroggerLogger.debug(message, metadata);
        break;
      case "info":
        stroggerLogger.info(message, metadata);
        break;
      case "warn":
        stroggerLogger.warn(message, metadata);
        break;
      case "error":
        stroggerLogger.error(message, metadata);
        break;
    }
  };

  return {
    debug: (message: string, context?: LogContext) =>
      log("debug", message, context),
    info: (message: string, context?: LogContext) =>
      log("info", message, context),
    warn: (message: string, context?: LogContext, error?: Error) =>
      log("warn", message, context, error),
    error: (message: string, context?: LogContext, error?: Error) =>
      log("error", message, context, error),

    // Convenience methods for common patterns
    start: (operation: string, context?: LogContext) => {
      log("info", `Starting: ${operation}`, context);
    },
    success: (operation: string, context?: LogContext) => {
      log("info", `Completed: ${operation}`, context);
    },
    failure: (operation: string, error: Error, context?: LogContext) => {
      log("error", `Failed: ${operation}`, context, error);
    },
  };
};

export const getLogger = (
  functionName?: string,
): ReturnType<typeof createLogger> => {
  return createLogger(functionName);
}; 