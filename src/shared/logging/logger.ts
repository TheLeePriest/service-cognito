import {
  LogLevel,
  createConsoleTransport,
  createJsonFormatter,
  createLogger,
  getEnvironment,
} from "strogger";
import { env } from "../config/environment";

export interface LogContext {
  requestId?: string;
  userId?: string;
  functionName?: string;
  stage?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
  info: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
  warn: (
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, unknown>,
  ) => void;
  error: (
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, unknown>,
  ) => void;
  fatal: (
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, unknown>,
  ) => void;
  logFunctionStart: (
    functionName: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
  logFunctionEnd: (
    functionName: string,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
  logDatabaseOperation: (
    operation: string,
    table: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
  logApiRequest: (
    method: string,
    path: string,
    statusCode: number,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => void;
}

const getLogLevelFromEnv = (): LogLevel => {
  const level = env.get("LOG_LEVEL")?.toUpperCase();
  switch (level) {
    case "DEBUG":
      return LogLevel.DEBUG;
    case "INFO":
      return LogLevel.INFO;
    case "WARN":
      return LogLevel.WARN;
    case "ERROR":
      return LogLevel.ERROR;
    case "FATAL":
      return LogLevel.FATAL;
    default:
      return env.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }
};

const createStroggerLogger = (): Logger => {
  const stroggerEnv = getEnvironment();
  const formatter = createJsonFormatter();
  const transport = createConsoleTransport({
    formatter,
    level: getLogLevelFromEnv(),
    useColors: !env.isProduction,
  });

  const stroggerLogger = createLogger({
    config: {
      level: getLogLevelFromEnv(),
      serviceName: "service-cognito",
      stage: env.stage,
    },
    transports: [transport],
    formatter,
    env: stroggerEnv,
  });

  const enrichContext = (
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ) => ({
    ...context,
    stage: env.stage,
    ...metadata,
  });

  return {
    debug: (
      message: string,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.debug(message, enrichContext(context, metadata));
    },

    info: (
      message: string,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.info(message, enrichContext(context, metadata));
    },

    warn: (
      message: string,
      context?: LogContext,
      error?: Error,
      metadata?: Record<string, unknown>,
    ) => {
      const enrichedContext = enrichContext(context, metadata);
      if (error) {
        stroggerLogger.warn(
          message,
          { ...enrichedContext, error: error.message },
          error,
        );
      } else {
        stroggerLogger.warn(message, enrichedContext);
      }
    },

    error: (
      message: string,
      context?: LogContext,
      error?: Error,
      metadata?: Record<string, unknown>,
    ) => {
      const enrichedContext = enrichContext(context, metadata);
      if (error) {
        stroggerLogger.error(
          message,
          { ...enrichedContext, error: error.message },
          error,
        );
      } else {
        stroggerLogger.error(message, enrichedContext);
      }
    },

    fatal: (
      message: string,
      context?: LogContext,
      error?: Error,
      metadata?: Record<string, unknown>,
    ) => {
      const enrichedContext = enrichContext(context, metadata);
      if (error) {
        stroggerLogger.fatal(
          message,
          { ...enrichedContext, error: error.message },
          error,
        );
      } else {
        stroggerLogger.fatal(message, enrichedContext);
      }
    },

    logFunctionStart: (
      functionName: string,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.logFunctionStart(
        functionName,
        enrichContext({ ...context, functionName }, metadata),
      );
    },

    logFunctionEnd: (
      functionName: string,
      duration: number,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.logFunctionEnd(
        functionName,
        duration,
        enrichContext({ ...context, functionName, duration }, metadata),
      );
    },

    logDatabaseOperation: (
      operation: string,
      table: string,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.logDatabaseOperation(
        operation,
        table,
        enrichContext({ ...context, operation, table }, metadata),
      );
    },

    logApiRequest: (
      method: string,
      path: string,
      statusCode: number,
      context?: LogContext,
      metadata?: Record<string, unknown>,
    ) => {
      stroggerLogger.logApiRequest(
        method,
        path,
        statusCode,
        enrichContext({ ...context, method, path, statusCode }, metadata),
      );
    },
  };
};

// Export singleton instance
export const logger = createStroggerLogger(); 