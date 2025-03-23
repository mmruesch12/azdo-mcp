#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import * as azdev from "azure-devops-node-api";
import { z } from "zod";

// Environment variables for authentication
const PAT = process.env.AZURE_DEVOPS_PAT;
const ORG_URL = process.env.AZURE_DEVOPS_ORG_URL;

if (!PAT || !ORG_URL) {
  throw new Error(
    "AZURE_DEVOPS_PAT and AZURE_DEVOPS_ORG_URL environment variables are required"
  );
}

// Azure DevOps client setup
const authHandler = azdev.getPersonalAccessTokenHandler(PAT);
const connection = new azdev.WebApi(ORG_URL, authHandler);

// Helper function to make authenticated REST API calls
async function makeAzureDevOpsRequest(
  url: string,
  method = "GET",
  body?: any,
  extraHeaders?: Record<string, string>
) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`PAT:${PAT}`).toString("base64")}`,
    ...extraHeaders,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Input validation schemas
const listWorkItemsSchema = z.object({
  project: z.string(),
  types: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

const getWorkItemSchema = z.object({
  project: z.string(),
  id: z.number(),
});

const createWorkItemSchema = z.object({
  project: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
});

// Pull Request schemas
const listPullRequestsSchema = z.object({
  project: z.string(),
  repository: z.string(),
  status: z.enum(["active", "completed", "abandoned"]).optional(), // Azure DevOps API pull request status
});

const getPullRequestSchema = z.object({
  project: z.string(),
  repository: z.string(),
  pullRequestId: z.number(),
});

const createPullRequestSchema = z.object({
  project: z.string(),
  repository: z.string(),
  title: z.string(),
  description: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  reviewers: z.array(z.string()).optional(),
});

// Wiki schemas
const createWikiPageSchema = z.object({
  project: z.string(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
});

const editWikiPageSchema = z.object({
  project: z.string(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
  etag: z.string(),
});

// Create the MCP server
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

// Error handling helpers
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function logError(context: string, error: unknown) {
  console.error(`[Error] ${context}:`, error);
  if (error && typeof error === "object" && "serverError" in error) {
    console.error(
      "Server details:",
      (error as { serverError: unknown }).serverError
    );
  }
}

// Tool implementations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Work Items
      {
        name: "list_work_items",
        description: "List work items in a project",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            types: {
              type: "array",
              items: { type: "string" },
              description: "Filter by work item types",
            },
            states: {
              type: "array",
              items: { type: "string" },
              description: "Filter by states",
            },
            assignedTo: {
              type: "string",
              description: "Filter by assigned user",
            },
          },
          required: ["project"],
        },
      },
      {
        name: "get_work_item",
        description: "Get details of a specific work item",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            id: {
              type: "number",
              description: "ID of the work item",
            },
          },
          required: ["project", "id"],
        },
      },
      {
        name: "create_work_item",
        description: "Create a new work item",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            type: {
              type: "string",
              description: "Type of work item (e.g., 'Task', 'Bug')",
            },
            title: {
              type: "string",
              description: "Title of the work item",
            },
            description: {
              type: "string",
              description: "Description of the work item",
            },
            assignedTo: {
              type: "string",
              description: "User to assign the work item to",
            },
          },
          required: ["project", "type", "title"],
        },
      },

      // Pull Requests
      {
        name: "list_pull_requests",
        description: "List pull requests in a repository",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            repository: {
              type: "string",
              description: "Name of the repository",
            },
            status: {
              type: "string",
              enum: ["active", "completed", "abandoned"],
              description: "Filter by PR status",
            },
          },
          required: ["project", "repository"],
        },
      },
      {
        name: "get_pull_request",
        description: "Get details of a specific pull request",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            repository: {
              type: "string",
              description: "Name of the repository",
            },
            pullRequestId: {
              type: "number",
              description: "ID of the pull request",
            },
          },
          required: ["project", "repository", "pullRequestId"],
        },
      },
      {
        name: "create_pull_request",
        description: "Create a new pull request",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            repository: {
              type: "string",
              description: "Name of the repository",
            },
            title: {
              type: "string",
              description: "Title of the pull request",
            },
            description: {
              type: "string",
              description: "Description of the pull request",
            },
            sourceBranch: {
              type: "string",
              description: "Source branch name",
            },
            targetBranch: {
              type: "string",
              description: "Target branch name",
            },
            reviewers: {
              type: "array",
              items: { type: "string" },
              description: "Array of reviewer email addresses",
            },
          },
          required: [
            "project",
            "repository",
            "title",
            "description",
            "sourceBranch",
            "targetBranch",
          ],
        },
      },

      // Wiki
      {
        name: "create_wiki_page",
        description: "Create a new wiki page",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            wiki: {
              type: "string",
              description: "Name of the wiki",
            },
            path: {
              type: "string",
              description: "Path of the wiki page",
            },
            content: {
              type: "string",
              description: "Content of the wiki page",
            },
          },
          required: ["project", "wiki", "path", "content"],
        },
      },
      {
        name: "edit_wiki_page",
        description: "Edit an existing wiki page",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Name of the Azure DevOps project",
            },
            wiki: {
              type: "string",
              description: "Name of the wiki",
            },
            path: {
              type: "string",
              description: "Path of the wiki page",
            },
            content: {
              type: "string",
              description: "New content of the wiki page",
            },
            etag: {
              type: "string",
              description: "ETag for concurrency control",
            },
          },
          required: ["project", "wiki", "path", "content", "etag"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      // Work Items
      case "list_work_items": {
        const params = listWorkItemsSchema.parse(request.params.arguments);
        console.error("[API] Listing work items for project:", params.project);

        const client = await connection.getWorkItemTrackingApi();
        const query = `SELECT [System.Id] FROM WorkItems`;
        const queryResult = await client.queryByWiql(
          { query },
          { project: params.project }
        );

        if (!queryResult.workItems?.length) {
          return {
            content: [
              {
                type: "text",
                text: "No work items found",
              },
            ],
          };
        }

        const ids = queryResult.workItems
          .map((wi) => wi.id)
          .filter((id): id is number => id !== undefined);
        const workItems = await client.getWorkItems(ids);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(workItems, null, 2),
            },
          ],
        };
      }

      case "get_work_item": {
        const params = getWorkItemSchema.parse(request.params.arguments);
        console.error("[API] Getting work item:", params.id);

        const client = await connection.getWorkItemTrackingApi();
        const workItem = await client.getWorkItem(params.id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(workItem, null, 2),
            },
          ],
        };
      }

      case "create_work_item": {
        const params = createWorkItemSchema.parse(request.params.arguments);
        console.error("[API] Creating work item in project:", params.project);

        const client = await connection.getWorkItemTrackingApi();
        const patchDocument = [
          {
            op: "add",
            path: "/fields/System.Title",
            value: params.title,
          },
        ];

        if (params.description) {
          patchDocument.push({
            op: "add",
            path: "/fields/System.Description",
            value: params.description,
          });
        }

        if (params.assignedTo) {
          patchDocument.push({
            op: "add",
            path: "/fields/System.AssignedTo",
            value: params.assignedTo,
          });
        }

        const workItem = await client.createWorkItem(
          undefined,
          patchDocument,
          params.project,
          params.type
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(workItem, null, 2),
            },
          ],
        };
      }

      // Pull Requests
      case "list_pull_requests": {
        const params = listPullRequestsSchema.parse(request.params.arguments);
        console.error(
          "[API] Listing pull requests for repo:",
          params.repository
        );

        const client = await connection.getGitApi();
        const pullRequests = await client.getPullRequests(
          params.repository,
          {
            status:
              params.status === "completed"
                ? 3
                : params.status === "abandoned"
                ? 2
                : 1, // 1=active, 2=abandoned, 3=completed
          },
          params.project
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pullRequests, null, 2),
            },
          ],
        };
      }

      case "get_pull_request": {
        const params = getPullRequestSchema.parse(request.params.arguments);
        console.error("[API] Getting pull request:", params.pullRequestId);

        const client = await connection.getGitApi();
        const pullRequest = await client.getPullRequest(
          params.repository,
          params.pullRequestId,
          params.project
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pullRequest, null, 2),
            },
          ],
        };
      }

      case "create_pull_request": {
        const params = createPullRequestSchema.parse(request.params.arguments);
        console.error(
          "[API] Creating pull request in repo:",
          params.repository
        );

        const client = await connection.getGitApi();
        const pullRequest = await client.createPullRequest(
          {
            sourceRefName: `refs/heads/${params.sourceBranch}`,
            targetRefName: `refs/heads/${params.targetBranch}`,
            title: params.title,
            description: params.description,
            reviewers: params.reviewers?.map((email) => ({ id: email })),
          },
          params.repository,
          params.project
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(pullRequest, null, 2),
            },
          ],
        };
      }

      // Wiki
      case "create_wiki_page": {
        const params = createWikiPageSchema.parse(request.params.arguments);
        console.error("[API] Creating wiki page:", params.path);

        // Use REST API directly for wiki operations
        const wikiUrl = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${
          params.wiki
        }/pages?path=${encodeURIComponent(params.path)}&api-version=7.0`;

        const page = await makeAzureDevOpsRequest(wikiUrl, "PUT", {
          content: params.content,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      }

      case "edit_wiki_page": {
        const params = editWikiPageSchema.parse(request.params.arguments);
        console.error("[API] Editing wiki page:", params.path);

        // Use REST API directly for wiki operations
        const wikiUrl = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${
          params.wiki
        }/pages?path=${encodeURIComponent(params.path)}&api-version=7.0`;

        // Update wiki page with etag for concurrency control
        const page = await makeAzureDevOpsRequest(
          wikiUrl,
          "PUT",
          { content: params.content },
          { "If-Match": params.etag }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: unknown) {
    logError(`Tool ${request.params.name} failed`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Operation failed: ${getErrorMessage(error)}`
    );
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
