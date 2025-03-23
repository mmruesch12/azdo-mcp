import "dotenv/config";
import * as azdev from "azure-devops-node-api";

async function testListPullRequests() {
  const pat = process.env.AZURE_DEVOPS_PAT;
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  const repository = process.env.AZURE_DEVOPS_REPOSITORY;

  if (!pat || !orgUrl || !project || !repository) {
    throw new Error("Missing required environment variables");
  }

  const authHandler = azdev.getPersonalAccessTokenHandler(pat);
  const connection = new azdev.WebApi(orgUrl, authHandler);

  try {
    const client = await connection.getGitApi();

    // Test listing active PRs
    console.log("\nListing active pull requests...");
    const activePRs = await client.getPullRequests(
      repository,
      { status: 1 },
      project
    );
    console.log(`Found ${activePRs.length} active PRs`);
    console.log(JSON.stringify(activePRs, null, 2));

    // Test listing completed PRs
    console.log("\nListing completed pull requests...");
    const completedPRs = await client.getPullRequests(
      repository,
      { status: 3 },
      project
    );
    console.log(`Found ${completedPRs.length} completed PRs`);
    console.log(JSON.stringify(completedPRs, null, 2));
  } catch (error) {
    console.error("Error testing pull requests:", error);
    process.exit(1);
  }
}

testListPullRequests().catch(console.error);
