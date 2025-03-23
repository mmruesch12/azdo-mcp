import { DEFAULT_PROJECT } from "../config/env.js";
import { getWorkItemClient } from "../auth/client.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { logError } from "../utils/error.js";
import {
  listWorkItemsSchema,
  getWorkItemSchema,
  createWorkItemSchema,
  type ListWorkItemsParams,
  type GetWorkItemParams,
  type CreateWorkItemParams,
} from "../schemas/workItems.js";

/**
 * List work items in a project
 */
export async function listWorkItems(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = listWorkItemsSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    types: rawParams.types,
    states: rawParams.states,
    assignedTo: rawParams.assignedTo,
  });

  console.error("[API] Listing work items:", params);

  try {
    // Implementation would go here
    // This is a placeholder as the original code didn't have a complete implementation
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { message: "Work items listing not implemented yet" },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logError("Error listing work items", error);
    throw error;
  }
}

/**
 * Get details of a specific work item
 */
export async function getWorkItem(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = getWorkItemSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    id: rawParams.id,
  });

  console.error("[API] Getting work item details:", params);

  try {
    // Implementation would go here
    // This is a placeholder as the original code didn't have a complete implementation
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { message: "Get work item not implemented yet" },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logError("Error getting work item", error);
    throw error;
  }
}

/**
 * Create a new work item
 */
export async function createWorkItem(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = createWorkItemSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    type: rawParams.type,
    title: rawParams.title,
    description: rawParams.description,
    assignedTo: rawParams.assignedTo,
  });

  console.error("[API] Creating work item:", params);

  try {
    // Implementation would go here
    // This is a placeholder as the original code didn't have a complete implementation
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { message: "Create work item not implemented yet" },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logError("Error creating work item", error);
    throw error;
  }
}

/**
 * Tool definitions for work items
 */
export const workItemTools = [
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
];
