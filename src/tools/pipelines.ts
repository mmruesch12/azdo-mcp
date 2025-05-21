import { DEFAULT_PROJECT } from "../config/env.js";
import { getBuildApi } from "../auth/client.js";
import { logError } from "../utils/error.js";
import {
  listPipelinesSchema,
  triggerPipelineSchema,
  type ListPipelinesParams,
  type TriggerPipelineParams,
} from "../schemas/pipelines.js";
import { Build } from "azure-devops-node-api/interfaces/BuildInterfaces.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * List all pipelines in the project
 */
export async function listPipelines(rawParams: any) {
  const params = listPipelinesSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    folder: rawParams.folder,
    name: rawParams.name,
  });

  console.error("[API] Listing pipelines:", params);
  if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

  try {
    const buildApi = await getBuildApi();
    const pipelines = await buildApi.getDefinitions(
      params.project,
      params.name, // name
      params.folder // repositoryId (used as folder path here based on azure-devops-mcp-server example)
    );
    return {
      content: [
        { type: "text", text: JSON.stringify(pipelines, null, 2) },
      ],
    };
  } catch (error) {
    logError("Error listing pipelines", error);
    throw error;
  }
}

/**
 * Trigger a pipeline run
 */
export async function triggerPipeline(rawParams: any) {
  const params = triggerPipelineSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    pipelineId: rawParams.pipelineId,
    branch: rawParams.branch,
    variables: rawParams.variables,
  });

  console.error("[API] Triggering pipeline:", params);
  if (!params.project) {
    throw new Error("Project must be specified or have a default configured.");
  }

  try {
    const buildApi = await getBuildApi();
    const definition = await buildApi.getDefinition(params.project, params.pipelineId);

    if (!definition) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Pipeline with ID ${params.pipelineId} not found in project ${params.project}`
      );
    }

    const build: Build = {
      definition: {
        id: params.pipelineId,
      },
      project: definition.project, // Use project from definition
      sourceBranch: params.branch || definition.repository?.defaultBranch,
      parameters: params.variables ? JSON.stringify(params.variables) : undefined,
    };

    const queuedBuild = await buildApi.queueBuild(build, params.project);
    return {
      content: [
        { type: "text", text: JSON.stringify(queuedBuild, null, 2) },
      ],
    };
  } catch (error) {
    logError("Error triggering pipeline " + params.pipelineId, error);
    throw error;
  }
}

/**
 * Tool definitions for pipelines
 */
export const pipelineTools = [
  {
    name: "list_pipelines",
    description: "List all pipelines in the project, optionally filtering by name or folder.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        folder: { type: "string", description: "Filter pipelines by folder path (e.g., \\myfolder) (optional)" },
        name: { type: "string", description: "Filter pipelines by name (optional)" },
      },
      required: [], 
    },
  },
  {
    name: "trigger_pipeline",
    description: "Trigger a pipeline run.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        pipelineId: { type: "number", description: "ID of the pipeline to trigger" },
        branch: { type: "string", description: "Branch to run the pipeline on (optional, defaults to pipeline's default branch)" },
        variables: { 
          type: "object", 
          additionalProperties: { type: "string" },
          description: "Pipeline variables to override (optional, key-value pairs)"
        },
      },
      required: ["pipelineId"], 
    },
  },
]; 