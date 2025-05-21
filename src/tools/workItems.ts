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
  updateWorkItemSchema,
  type UpdateWorkItemParams,
} from "../schemas/workItems.js";
import * as WorkItemInterfaces from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js";
import { Operation, JsonPatchOperation } from "azure-devops-node-api/interfaces/common/VSSInterfaces.js";

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
  if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

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
    const queryResult = await witClient.queryByWiql({ query: wiql }, { project: params.project });

    if (!queryResult.workItems || queryResult.workItems.length === 0) {
      return {
        content: [{ type: "text", text: JSON.stringify([], null, 2) }],
      };
    }

    // Get full work item details
    const workItemIds = queryResult.workItems.map(
        (wi: WorkItemInterfaces.WorkItemReference) => wi.id!
      );
    
    const workItems = await witClient.getWorkItems(
      workItemIds,
      undefined, // fields (string[])
      undefined, // asOf (Date)
      WorkItemInterfaces.WorkItemExpand.All, // expand
      undefined, // errorPolicy
      params.project // project as last argument
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

  console.error("[API] Getting work item details for ID:", params.id, "in project context:", params.project);
  
  try {
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Use signature: getWorkItem(id: number, fields?: string[], asOf?: Date, expand?: WorkItemExpand, errorPolicy?: WorkItemErrorPolicy)
    // This signature does not take project directly. Work item IDs are unique across the org.
    const workItem = await witClient.getWorkItem(
      params.id,
      undefined,    // fields
      undefined,    // asOf
      WorkItemInterfaces.WorkItemExpand.All, // expand
      undefined     // errorPolicy
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
    logError("Error getting work item " + params.id, error);
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
   if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

  // Specific validation for 'Feature' type
  if (params.type.toLowerCase() === "feature") { // case-insensitive check
    if (!params.technologyInvestmentType) {
      throw new Error(
        "Field 'technologyInvestmentType' is required for work item type 'Feature'."
      );
    }
    // Security Vulnerability is optional as per schema, but if you want it to be mandatory for Feature:
    /* if (!params.securityVulnerability) {
      throw new Error(
        "Field 'securityVulnerability' is required for work item type 'Feature'."
      );
    }*/
  }

  try {
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Create patch operations for the work item
    const patchOperations: JsonPatchOperation[] = [
      { op: Operation.Add, path: "/fields/System.Title", value: params.title },
    ];

    if (params.description) {
      patchOperations.push({ op: Operation.Add, path: "/fields/System.Description", value: params.description });
    }

    if (params.assignedTo) {
      patchOperations.push({ op: Operation.Add, path: "/fields/System.AssignedTo", value: params.assignedTo });
    }
    
    // Custom fields - ensure these are correct for your Azure DevOps process template
    if (params.technologyInvestmentType) {
      patchOperations.push({ op: Operation.Add, path: "/fields/Custom.TechnologyInvestmentType", value: params.technologyInvestmentType });
    }

    if (params.securityVulnerability) {
      patchOperations.push({ op: Operation.Add, path: "/fields/Custom.SecurityVulnerability", value: params.securityVulnerability });
    }

    // Create the work item
    const workItem = await witClient.createWorkItem(
      undefined, // comment, not used for payload
      patchOperations,
      params.project,
      params.type,
      false, // validateOnly
      false, // bypassRules
      false, // suppressNotifications
      WorkItemInterfaces.WorkItemExpand.All // expand
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
 * Update an existing work item
 */
export async function updateWorkItem(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = updateWorkItemSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    id: rawParams.id,
    document: rawParams.document,
  });

  console.error("[API] Updating work item:", params.id, "in project context:", params.project);

  if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

  try {
    // Get the Work Item Tracking API client
    const witClient = await getWorkItemClient();

    // Map string 'op' to Operation enum
    const patchDocument: JsonPatchOperation[] = params.document.map(opDetails => ({
      ...opDetails,
      op: Operation[opDetails.op.charAt(0).toUpperCase() + opDetails.op.slice(1) as keyof typeof Operation],
      value: opDetails.value // Ensure value is always passed, even if undefined, as JsonPatchOperation expects it
    }));

    // Update the work item
    const workItem = await witClient.updateWorkItem(
      undefined, 
      patchDocument,
      params.id,
      params.project,
      false, // bypassRules
      false, // suppressNotifications
      false,  // validateOnly
      WorkItemInterfaces.WorkItemExpand.All // expand
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
    logError("Error updating work item " + params.id, error);
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
          description: "Name of the Azure DevOps project (optional, uses default if not provided)",
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
      required: [], // Project is handled by default
    },
  },
  {
    name: "get_work_item",
    description: "Get details of a specific work item by its ID. Project context is optional.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project (optional, for context, uses default if not provided)",
        },
        id: {
          type: "number",
          description: "ID of the work item (unique across organization)",
        },
      },
      required: ["id"],
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
          description: "Name of the Azure DevOps project (optional, uses default if not provided)",
        },
        type: {
          type: "string",
          description: "Type of work item (e.g., 'Task', 'Bug', 'Feature')",
        },
        title: {
          type: "string",
          description: "Title of the work item",
        },
        description: {
          type: "string",
          description: "Description of the work item (optional)",
        },
        assignedTo: {
          type: "string",
          description: "User to assign the work item to (optional)",
        },
        technologyInvestmentType: {
          type: "string",
          description:
            "The Technology Investment Type for the work item. (Required for Features, use a valid value from your Azure DevOps process template e.g. 'Strategic', 'Discretionary')", 
        },
        securityVulnerability: {
          type: "string",
          description:
            "The Security Vulnerability status for the work item. (e.g. 'Critical', 'High', 'Medium', 'Low', 'None')", 
        },
      },
      required: ["type", "title"], // Project is handled by default
    },
  },
  {
    name: "update_work_item",
    description: "Update an existing work item using JSON patch operations",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project (optional, uses default if not provided)",
        },
        id: {
          type: "number",
          description: "ID of the work item to update",
        },
        document: {
          type: "array",
          description: "Array of JSON patch operations to apply. 'op' should be 'add', 'remove', 'replace', 'move', 'copy', or 'test'.",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["add", "remove", "replace", "move", "copy", "test"],
                description: "The patch operation to perform",
              },
              path: {
                type: "string",
                description: "The path for the operation (e.g., /fields/System.Title)",
              },
              from: {
                type: "string",
                description: "For 'move' and 'copy' operations (optional)",
              },
              value: {
                type: "any", 
                description: "The value for the operation (optional)",
              },
            },
            required: ["op", "path"],
          },
        },
      },
      required: ["id", "document"],
    },
  },
];
