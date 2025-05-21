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
  updateWorkItem,
  workItemTools,
} from "./tools/workItems.js";

import {
  listPullRequests,
  getPullRequest,
  createPullRequest,
  createPullRequestComment,
  getPullRequestDiff,
  updatePullRequest, // Added import
  pullRequestTools,
} from "./tools/pullRequests.js";

import {
  createWikiPage,
  editWikiPage,
  wikiTools,
  // Newly added imports for wiki tools
  getWikis,
  getWikiPage,
  createWiki,
  listWikiPages,
  getWikiPageById,
} from "./tools/wiki.js";
import { listProjects, getProject, projectTools } from "./tools/projects.js";
import { getBoards, boardTools } from "./tools/boards.js"; // Added import
import {
  listPipelines,
  triggerPipeline,
  pipelineTools,
} from "./tools/pipelines.js"; // Added import

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
  },
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
      // Boards
      ...boardTools,
      // Pipelines
      ...pipelineTools,
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
      case "update_work_item":
        return await updateWorkItem(request.params.arguments || {});

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

      // Wiki
      case "create_wiki_page":
        return await createWikiPage(request.params.arguments || {});
      case "edit_wiki_page":
        return await editWikiPage(request.params.arguments || {});

      // Newly added cases for wiki tools
      case "get_wikis":
        return await getWikis(request.params.arguments || {});
      case "get_wiki_page":
        return await getWikiPage(request.params.arguments || {});
      case "create_wiki":
        return await createWiki(request.params.arguments || {});
      case "list_wiki_pages":
        return await listWikiPages(request.params.arguments || {});
      case "get_wiki_page_by_id":
        return await getWikiPageById(request.params.arguments || {});

      // Projects
      case "list_projects":
        return await listProjects(request.params.arguments || {});
      case "get_project":
        return await getProject(request.params.arguments || {});

      // Boards
      case "get_boards": // Added case
        return await getBoards(request.params.arguments || {});

      // Pipelines
      case "list_pipelines": // Added case
        return await listPipelines(request.params.arguments || {});
      case "trigger_pipeline": // Added case
        return await triggerPipeline(request.params.arguments || {});

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`,
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
