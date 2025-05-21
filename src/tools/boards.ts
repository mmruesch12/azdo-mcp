import { DEFAULT_PROJECT } from "../config/env.js";
import { getWorkApi } from "../auth/client.js";
import { logError } from "../utils/error.js";
import {
  getBoardsSchema,
  type GetBoardsParams,
} from "../schemas/boards.js";
import { TeamContext } from "azure-devops-node-api/interfaces/CoreInterfaces.js";

/**
 * Get available boards in a project for a specific team, or default team.
 */
export async function getBoards(rawParams: any) {
  const params = getBoardsSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    team: rawParams.team, // Team can be optional, API might use default if not provided for project
  });

  console.error("[API] Getting boards:", params);

  if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

  try {
    const workApi = await getWorkApi();

    const teamContext: TeamContext = {
      project: params.project,
      projectId: undefined, // Not strictly needed if project name is provided
      team: params.team,    // If undefined, API usually defaults to the project's default team
      teamId: undefined,  // Not strictly needed if team name is provided
    };

    const boards = await workApi.getBoards(teamContext);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(boards, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error getting boards", error);
    throw error;
  }
}

/**
 * Tool definitions for boards
 */
export const boardTools = [
  {
    name: "get_boards",
    description: "List available boards in the project, optionally filtering by team.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project (optional, uses default if not provided)",
        },
        team: {
          type: "string",
          description: "Name of the team (optional, defaults to project's default team)",
        },
      },
      required: [], // Project is handled by default
    },
  },
]; 