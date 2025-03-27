import { ORG_URL } from "../config/env.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { ListProjectsSchema, ListProjectsResponseSchema, ListProjects } from "../schemas/projects.js";

// Export tool definitions
export const projectTools = [
  {
    name: "list_projects",
    description: "List all projects in Azure DevOps organization",
    inputSchema: ListProjectsSchema,
  },
];

/**
 * Lists all projects in the Azure DevOps organization
 */
export async function listProjects(args: ListProjects) {
  console.error("[Projects] Listing projects with args:", args);

  try {
    // Build URL with optional name filter
    let url = `${ORG_URL}/_apis/projects`;
    if (args.name) {
      url += `?name=${encodeURIComponent(args.name)}`;
    }

    // Make API request
    const response = await makeAzureDevOpsRequest(url);

    // Parse and validate response
    const validatedResponse = ListProjectsResponseSchema.parse(response);
    console.error(`[Projects] Found ${validatedResponse.count} projects`);

    return validatedResponse;
  } catch (error) {
    console.error("[Projects] Error listing projects:", error);
    throw error;
  }
}
