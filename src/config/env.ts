// Environment variables for authentication and defaults
export const PAT = process.env.AZURE_DEVOPS_PAT;
export const ORG_URL = process.env.AZURE_DEVOPS_ORG_URL;
export const DEFAULT_PROJECT = process.env.AZURE_DEVOPS_PROJECT;
export const DEFAULT_REPOSITORY = process.env.AZURE_DEVOPS_REPOSITORY;

// Validate required environment variables
if (!PAT || !ORG_URL) {
  throw new Error(
    "AZURE_DEVOPS_PAT and AZURE_DEVOPS_ORG_URL environment variables are required"
  );
}

// Log configuration
console.error("[Setup] Using organization URL:", ORG_URL);
console.error("[Setup] Default project:", DEFAULT_PROJECT);
console.error("[Setup] Default repository:", DEFAULT_REPOSITORY);
