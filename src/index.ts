#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

// Import utility functions
import { createMcpError, logError } from "./utils/error.js";

// Import tool implementations
import {
  listWorkItems,
  getWorkItem,
  createWorkItem,
  workItemTools,
} from "./tools/workItems.js";

import {
  listPullRequests,
  getPullRequest,
  createPullRequest,
  createPullRequestComment,
  getPullRequestDiff,
  updatePullRequest, // Added import
  getPullRequestComments, // Added import
  pullRequestTools,
} from "./tools/pullRequests.js";

import { createWikiPage, editWikiPage, wikiTools } from "./tools/wiki.js";
import { listProjects, getProject, projectTools } from "./tools/projects.js";

// Create MCP server
const server = new Server(
  {
    name: "azure-devops",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool implementations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Work Items
      ...workItemTools,
      // Pull Requests
      ...pullRequestTools,
      // Wiki
      ...wikiTools,
      // Projects
      ...projectTools,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      // Work Items
      case "list_work_items":
        return await listWorkItems(request.params.arguments || {});
      case "get_work_item":
        return await getWorkItem(request.params.arguments || {});
      case "create_work_item":
        return await createWorkItem(request.params.arguments || {});

      // Pull Requests
      case "list_pull_requests":
        return await listPullRequests(request.params.arguments || {});
      case "get_pull_request":
        return await getPullRequest(request.params.arguments || {});
      case "create_pull_request":
        return await createPullRequest(request.params.arguments || {});
      case "create_pull_request_comment":
        return await createPullRequestComment(request.params.arguments || {});
      case "get_pull_request_diff":
        return await getPullRequestDiff(request.params.arguments || {});
      case "update_pull_request": // Added case
        return await updatePullRequest(request.params.arguments || {});
      case "get_pull_request_comments":
        return await getPullRequestComments(request.params.arguments || {});

      // Wiki
      case "create_wiki_page":
        return await createWikiPage(request.params.arguments || {});
      case "edit_wiki_page":
        return await editWikiPage(request.params.arguments || {});

      // Projects
      case "list_projects":
        return await listProjects(request.params.arguments || {});
      case "get_project":
        return await getProject(request.params.arguments || {});

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: unknown) {
    return {
      content: [
        {
          type: "text",
          text: `Operation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    console.error("[Setup] Initializing Azure DevOps MCP server");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Setup] Server running on stdio");
  } catch (error) {
    logError("Server initialization failed", error);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  logError("Unhandled error", error);
  process.exit(1);
});
