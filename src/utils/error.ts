import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * Extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Log error with context
 */
export function logError(context: string, error: unknown) {
  console.error(`[Error] ${context}:`, error);
  if (error && typeof error === "object" && "serverError" in error) {
    console.error(
      "Server details:",
      (error as { serverError: unknown }).serverError
    );
  }
}

/**
 * Create a standardized MCP error from any error
 */
export function createMcpError(context: string, error: unknown): McpError {
  logError(context, error);
  return new McpError(
    ErrorCode.InternalError,
    `Operation failed: ${getErrorMessage(error)}`
  );
}
