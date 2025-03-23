/**
 * Common response type for MCP tools
 */
export interface McpToolResponse {
  content: {
    type: string;
    text: string;
  }[];
  isError?: boolean;
}

/**
 * Type for tool handler functions
 */
export type ToolHandler = (rawParams: any) => Promise<McpToolResponse>;

/**
 * Type for tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}
