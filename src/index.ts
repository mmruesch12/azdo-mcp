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

  try {
    console.error(`[API] Making request to: ${url}`);
    console.error(`[API] Method: ${method}`);
    if (body) console.error(`[API] Body:`, JSON.stringify(body, null, 2));
    if (extraHeaders) console.error(`[API] Extra headers:`, extraHeaders);

    const requestBody = body ? JSON.stringify(body) : undefined;
    console.error(`[API] Request body:`, requestBody);

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    console.error(`[API] Response status:`, response.status);
    console.error(
      `[API] Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.error(`[API] Response body:`, responseText);

    if (!response.ok) {
      throw new Error(
        `API request failed (${response.status}): ${responseText}`
      );
    }

    if (responseText) {
      return JSON.parse(responseText);
    }
    return null;
  } catch (error) {
    console.error(`[API] Request failed:`, error);
    throw error;
  }
}

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
  status: z.enum(["active", "completed", "abandoned"]).optional(),
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
      // ... (other tool definitions)
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "list_work_items": {
        const params = listWorkItemsSchema.parse(request.params.arguments);
        // ... (existing implementation)
      }

      // Wiki
      case "create_wiki_page": {
        const params = createWikiPageSchema.parse(request.params.arguments);
        console.error("[API] Creating wiki page:", params.path);

        const projectId = "899988fe-5224-40ba-828d-68d6c660d2eb";

        // First try to get all wikis in the project
        const wikiListUrl = `${ORG_URL}/${params.project}/_wiki/wikis/${params.wiki}?api-version=7.1-preview.1`;
        console.error("[API] Getting wikis from:", wikiListUrl);
        const wikis = await makeAzureDevOpsRequest(wikiListUrl);
        console.error("[API] Found wikis:", wikis);

        // Try to find existing wiki
        let wiki = wikis.value.find((w: any) => w.name === params.wiki);

        if (!wiki) {
          // Create new project wiki
          console.error("[API] Creating new project wiki");
          const createWikiUrl = `${ORG_URL}/${params.project}/_wiki/wikis?api-version=7.1-preview.1`;
          wiki = await makeAzureDevOpsRequest(createWikiUrl, "POST", {
            name: `${params.wiki}.wiki`,
            projectId: params.project,
            type: "projectWiki",
          });
          console.error("[API] Created wiki:", wiki);
        }

        // Create the page using REST API
        const pageUrl = `${ORG_URL}/${params.project}/_wiki/wikis/${
          wiki.id
        }/pages?path=${encodeURIComponent(
          params.path
        )}&api-version=7.1-preview.1`;
        const page = await makeAzureDevOpsRequest(pageUrl, "PUT", {
          content: params.content,
        });
        console.error("[API] Created page:", page);

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

        const projectId = "899988fe-5224-40ba-828d-68d6c660d2eb";
        const editPageUrl = `${ORG_URL}/${params.project}/_wiki/wikis/${
          params.wiki
        }/pages?path=${encodeURIComponent(
          params.path
        )}&api-version=7.1-preview.1`;

        const page = await makeAzureDevOpsRequest(
          editPageUrl,
          "PUT",
          params.content,
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
