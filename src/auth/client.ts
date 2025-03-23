import * as azdev from "azure-devops-node-api";
import { PAT, ORG_URL } from "../config/env.js";

// Azure DevOps client setup
// We can safely assert non-null as env.ts validates these values
const authHandler = azdev.getPersonalAccessTokenHandler(PAT as string);
export const connection = new azdev.WebApi(ORG_URL as string, authHandler);

// Initialize and export API clients
export async function getGitClient() {
  console.error("[Auth] Getting Git API client");
  return await connection.getGitApi();
}

export async function getWorkItemClient() {
  console.error("[Auth] Getting Work Item API client");
  return await connection.getWorkItemTrackingApi();
}

export async function getWikiClient() {
  console.error("[Auth] Getting Wiki API client");
  return await connection.getWikiApi();
}
