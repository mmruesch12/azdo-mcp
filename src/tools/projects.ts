import { getCoreClient } from "../auth/client.js";
import { logError } from "../utils/error.js";
import { createMcpError } from "../utils/error.js";
import {
  listProjectsSchema,
  getProjectSchema,
  type ListProjectsParams,
  type GetProjectParams,
} from "../schemas/projects.js";

/**
 * List all accessible projects in the organization
 */
export async function listProjects(rawParams: any) {
  // Parse arguments
  const params = listProjectsSchema.parse(rawParams);

  console.error("[API] Listing projects");

  try {
    // Get the Core API client
    const coreClient = await getCoreClient();

    // Get projects
    const projects = await coreClient.getProjects();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error listing projects", error);
    throw error;
  }
}

/**
 * Get details of a specific Azure DevOps project
 */
export async function getProject(rawParams: any) {
  // Parse arguments
  const params = getProjectSchema.parse({
    id: rawParams.id,
    name: rawParams.name,
  });

  console.error("[API] Getting project details:", params);

  try {
    // Get the Core API client
    const coreClient = await getCoreClient();

    // Check if we have an identifier
    const projectIdentifier = params.id || params.name;
    if (!projectIdentifier) {
      throw new Error("Either project ID or name must be provided");
    }

    // Call the API to get project details
    const project = await coreClient.getProject(projectIdentifier, true);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error getting project details", error);
    return {
      content: [
        {
          type: "text",
          text: `Error getting project details: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Tool definitions for projects
 */
export const projectTools = [
  {
    name: "list_projects",
    description:
      "List all accessible projects in the Azure DevOps organization",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_project",
    description: "Get details of a specific Azure DevOps project",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID (GUID) of the project",
        },
        name: {
          type: "string",
          description: "Name of the project",
        },
      },
      required: [],
    },
  },
];
