import * as azdev from "azure-devops-node-api";
import { PAT, ORG_URL } from "../config/env.js";
import { IGitApi } from "azure-devops-node-api/GitApi.js";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi.js";
import { IWikiApi } from "azure-devops-node-api/WikiApi.js";
import { ICoreApi } from "azure-devops-node-api/CoreApi.js";
import { IWorkApi } from "azure-devops-node-api/WorkApi.js";
import { IBuildApi } from "azure-devops-node-api/BuildApi.js";

// Azure DevOps client setup
// We can safely assert non-null as env.ts validates these values
const authHandler = azdev.getPersonalAccessTokenHandler(PAT as string);
export const connection = new azdev.WebApi(ORG_URL as string, authHandler);

// Initialize and export API clients
export async function getGitClient(): Promise<IGitApi> {
  console.error("[Auth] Getting Git API client");
  return await connection.getGitApi();
}

export async function getWorkItemClient(): Promise<IWorkItemTrackingApi> {
  console.error("[Auth] Getting Work Item API client");
  return await connection.getWorkItemTrackingApi();
}

export async function getWikiClient(): Promise<IWikiApi> {
  console.error("[Auth] Getting Wiki API client");
  return await connection.getWikiApi();
}

export async function getCoreClient(): Promise<ICoreApi> {
  console.error("[Auth] Getting Core API client");
  return await connection.getCoreApi();
}

export async function getWorkApi(): Promise<IWorkApi> {
  console.error("[Auth] Getting Work API client");
  return await connection.getWorkApi();
}

export async function getBuildApi(): Promise<IBuildApi> {
  console.error("[Auth] Getting Build API client");
  return await connection.getBuildApi();
}
