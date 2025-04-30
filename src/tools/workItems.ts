import { DEFAULT_PROJECT } from "../config/env.js";
import { getWorkItemClient } from "../auth/client.js";
import { logError } from "../utils/error.js";
import {
  listWorkItemsSchema,
  getWorkItemSchema,
  createWorkItemSchema,
  type ListWorkItemsParams,
  type GetWorkItemParams,
  type CreateWorkItemParams,
} from "../schemas/workItems.js";
import * as WorkItemInterfaces from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js";

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
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Build WIQL query
    let wiql = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${params.project}'`;

    if (params.types && params.types.length > 0) {
      wiql += ` AND [System.WorkItemType] IN ('${params.types.join("','")}')`;
    }

    if (params.states && params.states.length > 0) {
      wiql += ` AND [System.State] IN ('${params.states.join("','")}')`;
    }

    if (params.assignedTo) {
      wiql += ` AND [System.AssignedTo] = '${params.assignedTo}'`;
    }

    // Execute the query
    const queryResult = await witClient.queryByWiql({ query: wiql });

    if (!queryResult.workItems) {
      return {
        content: [{ type: "text", text: JSON.stringify([], null, 2) }],
      };
    }

    // Get full work item details
    const workItems = await witClient.getWorkItems(
      queryResult.workItems.map(
        (wi: WorkItemInterfaces.WorkItemReference) => wi.id!
      ),
      undefined,
      undefined
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(workItems, null, 2),
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
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Get work item details
    const workItem = await witClient.getWorkItem(
      params.id,
      undefined,
      undefined
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(workItem, null, 2),
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
    technologyInvestmentType: rawParams.technologyInvestmentType,
    securityVulnerability: rawParams.securityVulnerability,
  });

  console.error("[API] Creating work item:", params);

  // Specific validation for 'Feature' type
  if (params.type === "Feature") {
    if (!params.technologyInvestmentType) {
      throw new Error(
        "Field 'technologyInvestmentType' is required for work item type 'Feature'."
      );
    }
    if (!params.securityVulnerability) {
      throw new Error(
        "Field 'securityVulnerability' is required for work item type 'Feature'."
      );
    }
  }

  try {
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Create patch operations for the work item
    const patchOperations = [ // Removed explicit type annotation
      {
        op: "add",
        path: "/fields/System.Title",
        value: params.title,
      },
    ];

    // Conditionally add optional fields
    if (params.technologyInvestmentType) {
      patchOperations.push({
        op: "add",
        path: "/fields/Technology Investment Type", // Assuming field name
        value: params.technologyInvestmentType,
      });
    }

    if (params.securityVulnerability) {
      patchOperations.push({
        op: "add",
        path: "/fields/Security Vulnerability", // Assuming field name
        value: params.securityVulnerability,
      });
    }

    if (params.description) {
      patchOperations.push({
        op: "add",
        path: "/fields/System.Description",
        value: params.description,
      });
    }

    if (params.assignedTo) {
      patchOperations.push({
        op: "add",
        path: "/fields/System.AssignedTo",
        value: params.assignedTo,
      });
    }

    // Create the work item
    const workItem = await witClient.createWorkItem(
      undefined,
      patchOperations,
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
        technologyInvestmentType: {
          type: "string",
          description:
            "The Technology Investment Type for the work item (Required for Features)", // Updated description
        },
        securityVulnerability: {
          type: "string",
          description:
            "The Security Vulnerability status for the work item (Required for Features)", // Updated description
        },
      },
      required: ["project", "type", "title"], // Removed optional fields from required
    },
  },
];
