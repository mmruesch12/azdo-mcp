import { DEFAULT_PROJECT, DEFAULT_REPOSITORY, ORG_URL } from "../config/env.js";
import { getGitClient } from "../auth/client.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { logError } from "../utils/error.js";
import * as Diff from "diff";
import {
  listPullRequestsSchema,
  getPullRequestSchema,
  createPullRequestSchema,
  createPullRequestCommentSchema,
  getPullRequestDiffSchema,
  type ListPullRequestsParams,
  type GetPullRequestParams,
  type CreatePullRequestParams,
  type CreatePullRequestCommentParams,
  type GetPullRequestDiffParams,
  updatePullRequestSchema,
  type UpdatePullRequestParams,
} from "../schemas/pullRequests.js";

/**
 * List pull requests in a repository
 */
export async function listPullRequests(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = listPullRequestsSchema.parse({
    status: rawParams.status,
  });

  console.error("[API] Listing pull requests:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Convert status string to number
    let statusId: number | undefined;
    if (params.status) {
      switch (params.status) {
        case "active":
          statusId = 1;
          break;
        case "completed":
          statusId = 3;
          break;
        case "abandoned":
          statusId = 2;
          break;
      }
    }

    // Get pull requests
    if (!DEFAULT_PROJECT || !DEFAULT_REPOSITORY) {
      throw new Error("Default project and repository must be configured");
    }

    const pullRequests = await gitClient.getPullRequests(
      DEFAULT_REPOSITORY,
      { status: statusId },
      DEFAULT_PROJECT
    );

    console.error(`[API] Found ${pullRequests.length} pull requests`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(pullRequests, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error listing pull requests", error);
    throw error;
  }
}

/**
 * Get details of a specific pull request
 */
export async function getPullRequest(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = getPullRequestSchema.parse({
    pullRequestId: rawParams.pullRequestId,
  });

  console.error("[API] Getting pull request details:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Get pull request details
    const pullRequest = await gitClient.getPullRequestById(
      params.pullRequestId,
      DEFAULT_PROJECT
    );

    console.error(`[API] Found pull request: ${pullRequest.pullRequestId}`);

    // Fetch linked work items if the link exists
    let linkedWorkItems: { id: number; url: string }[] = []; // Initialize with specific type
    if (pullRequest._links?.workItems?.href) {
      try {
        console.error(
          `[API] Fetching linked work items from: ${pullRequest._links.workItems.href}`
        );
        const workItemsResponse = await makeAzureDevOpsRequest(
          pullRequest._links.workItems.href
        );
        if (workItemsResponse && workItemsResponse.value) {
          linkedWorkItems = workItemsResponse.value.map(
            (item: { id: string; url: string }) => ({
              id: parseInt(item.id, 10), // Convert ID back to number
              url: item.url,
            })
          );
          console.error(
            `[API] Found ${linkedWorkItems.length} linked work items.`
          );
        } else {
          console.error(
            "[API] No linked work items found or unexpected response format from workItems link."
          );
          // Log the actual response for debugging
          console.error(
            "[API] Work items response received:",
            JSON.stringify(workItemsResponse, null, 2)
          );
        }
      } catch (wiError) {
        logError(
          "Error fetching linked work items from workItems link",
          wiError
        );
        // Explicitly set to empty array on error, but log it
        linkedWorkItems = [];
      }
    } else {
      console.error(
        "[API] No _links.workItems.href found in pull request response."
      );
    }

    // Add linked work items to the response object
    const responsePayload = {
      ...pullRequest,
      linkedWorkItems: linkedWorkItems, // Add the fetched work items
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responsePayload, null, 2), // Use the modified payload
        },
      ],
    };
  } catch (error) {
    logError("Error getting pull request", error);
    throw error;
  }
}

/**
 * Create a new pull request
 */
export async function createPullRequest(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = createPullRequestSchema.parse({
    title: rawParams.title,
    description: rawParams.description,
    sourceBranch: rawParams.sourceBranch,
    targetBranch: rawParams.targetBranch,
    reviewers: rawParams.reviewers,
    workItemIds: rawParams.workItemIds,
    isDraft: rawParams.isDraft,
  });

  console.error(
    "[API] Creating pull request:",
    JSON.stringify(params, null, 2)
  );

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Format branch names if they don't have refs/heads/ prefix
    const sourceBranch = params.sourceBranch.startsWith("refs/")
      ? params.sourceBranch
      : `refs/heads/${params.sourceBranch}`;

    const targetBranch = params.targetBranch.startsWith("refs/")
      ? params.targetBranch
      : `refs/heads/${params.targetBranch}`;

    // Create pull request
    if (!DEFAULT_PROJECT || !DEFAULT_REPOSITORY) {
      throw new Error("Default project and repository must be configured");
    }

    const pullRequest = await gitClient.createPullRequest(
      {
        sourceRefName: sourceBranch,
        targetRefName: targetBranch,
        title: params.title,
        description: params.description,
        reviewers: params.reviewers
          ? params.reviewers.map((email: string) => ({ id: email })) // Assuming email maps to user ID/descriptor
          : undefined,
        // Link work items if provided
        workItemRefs: params.workItemIds
          ? params.workItemIds.map((id: number) => ({
              id: id.toString(),
              url: `${ORG_URL}/_apis/wit/workItems/${id}`, // Construct work item URL
            }))
          : undefined,
      },
      DEFAULT_REPOSITORY,
      DEFAULT_PROJECT
    );

    console.error(`[API] Created pull request: ${pullRequest.pullRequestId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(pullRequest, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error creating pull request", error);
    throw error;
  }
}

/**
 * Add a comment to a pull request, including support for file and line-specific comments
 */
export async function createPullRequestComment(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = createPullRequestCommentSchema.parse({
    pullRequestId: rawParams.pullRequestId,
    content: rawParams.content,
    threadId: rawParams.threadId,
    filePath: rawParams.filePath,
    lineNumber: rawParams.lineNumber,
    status: rawParams.status,
  });

  console.error("[API] Creating PR comment:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    if (params.threadId) {
      // Reply to an existing thread
      console.error(`[API] Adding comment to thread ${params.threadId}`);

      const comment = {
        content: params.content,
        parentCommentId: 0, // Root-level comment in thread
      };

      const commentUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/threads/${params.threadId}/comments?api-version=7.0`;
      const result = await makeAzureDevOpsRequest(commentUrl, "POST", comment);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else {
      // Create a new thread
      let thread: any = {
        comments: [
          {
            content: params.content,
            commentType: 1, // 1 = text comment
          },
        ],
        status: params.status || "active",
      };

      // Handle file and line-specific comments
      if (params.filePath) {
        console.error(
          `[API] Creating code comment on file: ${params.filePath}`
        );

        // Get iterations in ascending order
        const iterationsUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/iterations?api-version=7.1-preview.1`;
        const iterationsResponse = await makeAzureDevOpsRequest(iterationsUrl);

        if (
          !iterationsResponse.value ||
          iterationsResponse.value.length === 0
        ) {
          throw new Error("No iterations found for pull request");
        }

        // Normalize file path
        const normalizedPath = params.filePath.replace(/^\/+/, "");
        console.error(`[API] Looking for file: ${normalizedPath}`);

        // Find the iteration where the file existed
        let targetIteration = null;
        let targetFileChange = null;

        for (const iteration of iterationsResponse.value) {
          console.error(`[API] Checking iteration ${iteration.id}`);
          const changesUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/iterations/${iteration.id}/changes?api-version=7.1-preview.1`;
          const changes = await makeAzureDevOpsRequest(changesUrl);

          console.error(
            `[API] Iteration ${iteration.id} changes:`,
            JSON.stringify(
              changes.changeEntries?.map((c: any) => c.item?.path),
              null,
              2
            )
          );

          // Try different path formats
          const pathVariations = [
            normalizedPath,
            normalizedPath.replace(/^\/+/, ""),
            `/${normalizedPath}`,
            normalizedPath.toLowerCase(),
            normalizedPath.replace(/^\/+/, "").toLowerCase(),
          ];

          console.error(`[API] Trying path variations:`, pathVariations);

          const fileChange = changes.changeEntries?.find(
            (change: { item?: { path?: string } }) => {
              const changePath = change.item?.path || "";
              const match = pathVariations.some(
                (p) => changePath.toLowerCase() === p.toLowerCase()
              );
              if (match) {
                console.error(
                  `[API] Found match: ${changePath} matches ${pathVariations.find(
                    (p) => changePath.toLowerCase() === p.toLowerCase()
                  )}`
                );
              }
              return match;
            }
          );

          if (fileChange) {
            targetIteration = iteration;
            targetFileChange = fileChange;
            console.error(
              `[API] Found file in iteration ${iteration.id} with path ${fileChange.item.path}`
            );
            break;
          }
        }

        if (!targetIteration || !targetFileChange) {
          throw new Error(`File ${normalizedPath} not found in any iteration`);
        }

        // Create thread with file position
        thread.threadContext = {
          filePath: normalizedPath,
          rightFileStart: {
            line: params.lineNumber,
            offset: 1,
          },
          rightFileEnd: {
            line: params.lineNumber,
            offset: 1,
          },
        };

        // Set up the thread with version information
        const targetIterationId = Number(targetIteration.id);
        console.error(
          `[API] Using iteration ${targetIterationId} with change ID ${targetFileChange.changeTrackingId}`
        );

        // Set thread properties for version control
        thread.properties = {
          "Microsoft.TeamFoundation.Discussion.SourceCommitId": {
            $type: "System.String",
            $value: targetFileChange.item.commitId,
          },
          "Microsoft.TeamFoundation.Discussion.TargetCommitId": {
            $type: "System.String",
            $value: targetFileChange.item.commitId,
          },
          "Microsoft.TeamFoundation.Discussion.Iteration": {
            $type: "System.String",
            $value: targetIterationId.toString(),
          },
        };

        // Set iteration context
        thread.pullRequestThreadContext = {
          iterationContext: {
            firstComparingIteration: targetIterationId,
            secondComparingIteration: targetIterationId,
          },
          changeTrackingId: targetFileChange.changeTrackingId,
        };

        thread.comments = [
          {
            parentCommentId: 0,
            content: params.content,
            commentType: 1,
          },
        ];

        thread.status = "active";

        console.error(
          "[API] Thread context:",
          JSON.stringify(
            {
              iteration: targetIteration.id,
              changeTracking: targetFileChange.changeTrackingId,
            },
            null,
            2
          )
        );
      } else {
        console.error("[API] Creating general PR comment");
      }

      // Create the new thread
      const threadUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/threads?api-version=7.0`;
      const result = await makeAzureDevOpsRequest(threadUrl, "POST", thread);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  } catch (error) {
    logError("Error creating PR comment", error);
    throw error;
  }
}
/**
 * Get the diff for a pull request
 */
export async function getPullRequestDiff(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = getPullRequestDiffSchema.parse({
    pullRequestId: rawParams.pullRequestId,
    filePath: rawParams.filePath,
    iterationId: rawParams.iterationId,
  });

  console.error("[API] Getting PR diff:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Get pull request details first to get source and target commits
    const pullRequest = await gitClient.getPullRequestById(
      params.pullRequestId,
      DEFAULT_PROJECT
    );

    // Check for missing sourceRefName or targetRefName
    if (!pullRequest.sourceRefName) {
      throw new Error(
        "Source branch reference is missing in pull request data"
      );
    }
    if (!pullRequest.targetRefName) {
      throw new Error(
        "Target branch reference is missing in pull request data"
      );
    }

    const sourceBranch = pullRequest.sourceRefName.replace("refs/heads/", "");
    const targetBranch = pullRequest.targetRefName.replace("refs/heads/", "");

    if (!sourceBranch) {
      throw new Error(
        "Invalid source branch name extracted from sourceRefName"
      );
    }
    if (!targetBranch) {
      throw new Error(
        "Invalid target branch name extracted from targetRefName"
      );
    }

    // Get the iterations to find the latest one if not specified
    const iterationsUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/iterations?api-version=7.1-preview.1`;
    const iterations = await makeAzureDevOpsRequest(iterationsUrl);
    const iterationId =
      params.iterationId ||
      (iterations.value.length > 0
        ? iterations.value[iterations.value.length - 1].id
        : 1);

    // Get the changes for this iteration
    let changesUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullRequests/${params.pullRequestId}/iterations/${iterationId}/changes?api-version=7.1-preview.1`;
    if (params.filePath) {
      changesUrl += `&path=${encodeURIComponent(params.filePath)}`;
    }
    const changes = await makeAzureDevOpsRequest(changesUrl);

    // Prepare the diff output
    let fullDiff = "";

    if (changes.changeEntries && changes.changeEntries.length > 0) {
      for (const change of changes.changeEntries) {
        const oldPath = `a${change.item.path}`;
        const newPath = `b${change.item.path}`;
        let patch = "";

        if (change.changeType === "add") {
          const newContent = await getFileContent(
            change.item.path,
            sourceBranch
          );
          patch = generateUnifiedDiff(
            oldPath, // Represents /dev/null effectively
            newPath,
            "", // Old content is empty for add
            newContent || "<Unable to retrieve file content>",
            change.item.objectId || "unknown",
            true // Indicate it's a new file
          );
        } else if (change.changeType === "delete") {
          const oldContent = await getFileContent(
            change.item.path,
            targetBranch
          );
          patch = generateUnifiedDiff(
            oldPath,
            newPath, // Represents /dev/null effectively
            oldContent || "<Unable to retrieve file content>",
            "", // New content is empty for delete
            change.item.objectId || "unknown",
            false,
            true // Indicate it's a deleted file
          );
        } else if (change.changeType === "edit") {
          const oldContent = await getFileContent(
            change.item.path,
            targetBranch
          );
          const newContent = await getFileContent(
            change.item.path,
            sourceBranch
          );

          // Handle cases where content retrieval might fail
          const oldContentStr =
            oldContent || "<Unable to retrieve old content>";
          const newContentStr =
            newContent || "<Unable to retrieve new content>";

          patch = generateUnifiedDiff(
            oldPath,
            newPath,
            oldContentStr,
            newContentStr,
            change.item.objectId || "unknown" // Use objectId for index line if available
          );
        }
        // Ensure a newline separates patches for different files
        if (patch) {
          fullDiff += patch + "\n";
        }
      }
    } else {
      fullDiff = "No changes found in this pull request.";
    }

    return {
      content: [
        {
          type: "text",
          text: fullDiff,
        },
      ],
    };
  } catch (error) {
    logError("Error getting PR diff", error);
    throw error;
  }
}
// Helper function to get file content
async function getFileContent(path: string, version: string): Promise<string> {
  if (!DEFAULT_PROJECT || !DEFAULT_REPOSITORY) {
    throw new Error("Default project and repository must be configured");
  }
  try {
    const itemUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/items?path=${encodeURIComponent(
      path
    )}&versionType=branch&version=${encodeURIComponent(
      version
    )}&api-version=7.1-preview.1`;
    const headers = { Accept: "application/octet-stream" };
    const response = await makeAzureDevOpsRequest(
      itemUrl,
      "GET",
      undefined,
      headers
    );
    // Add detailed logging to inspect the response
    console.error(
      `[API] Response received in getFileContent for ${path} (version: ${version}):`,
      `Type: ${typeof response}`,
      `Value Preview: ${
        response
          ? JSON.stringify(response).substring(0, 200) + "..."
          : "null or undefined"
      }`
    );

    if (response && typeof response === "object" && response.content) {
      console.error(
        `[API] getFileContent returning object content for ${path}`
      );
      return response.content;
    } else if (typeof response === "string") {
      // Check if the string indicates an error we missed
      if (response.startsWith("<") && response.endsWith(">")) {
        console.error(
          `[API] getFileContent received potential error string: ${response}`
        );
        return ""; // Treat placeholder errors as empty
      }
      console.error(
        `[API] getFileContent returning string content for ${path}`
      );
      return response;
    }
    console.error(
      `[API] getFileContent returning empty string for ${path} because response was not handled.`
    );
    return "";
  } catch (error) {
    console.error(`[API] Error fetching file content for ${path}:`, error);
    return "";
  }
}

// Helper function to generate unified diff
function generateUnifiedDiff(
  oldPath: string,
  newPath: string,
  oldContent: string,
  newContent: string,
  objectId?: string, // Optional object ID for index line
  isNewFile: boolean = false,
  isDeletedFile: boolean = false
): string {
  // Use createPatch from the 'diff' library
  const patch = Diff.createPatch(
    oldPath, // File name for the patch header
    oldContent,
    newContent,
    "", // oldHeader - not typically needed here
    "", // newHeader - not typically needed here
    { context: 3 } // Number of context lines, standard is 3
  );

  // The createPatch function includes the --- and +++ lines.
  // We need to potentially add the git diff header, index, and mode lines manually
  // if the library doesn't format it exactly like `git diff`.

  // Let's analyze the output of createPatch and adjust if needed.
  // Often, createPatch output looks like:
  // Index: filename
  // ===================================================================
  // --- filename
  // +++ filename
  // @@ ... @@
  // ... diff lines ...

  // We want the standard git diff header format:
  // diff --git a/path b/path
  // index oldsha..newsha mode (optional)
  // --- a/path
  // +++ b/path
  // @@ ... @@
  // ... diff lines ...

  let gitDiffHeader = `diff --git ${oldPath} ${newPath}\n`;
  if (isNewFile) {
    gitDiffHeader += `new file mode 100644\n`;
    gitDiffHeader += `index 0000000..${objectId || "new"}\n`;
  } else if (isDeletedFile) {
    gitDiffHeader += `deleted file mode 100644\n`;
    gitDiffHeader += `index ${objectId || "old"}..0000000\n`;
  } else if (objectId) {
    // For edits, the library might not know the SHAs, so we add a basic index line
    // A more accurate approach would involve fetching commit SHAs if needed, but objectId is a start.
    gitDiffHeader += `index ${objectId}..${objectId} 100644\n`; // Placeholder SHAs
  }

  // Remove the library's default header lines if they exist and prepend our own.
  const patchLines = patch.split("\n");
  let startIndex = 0;
  // Find the start of the actual diff content (--- line)
  for (let i = 0; i < patchLines.length; i++) {
    if (patchLines[i].startsWith("---")) {
      startIndex = i;
      break;
    }
    // Handle cases where createPatch might return minimal output for no changes
    if (i === patchLines.length - 1) {
      return ""; // No actual diff content found
    }
  }

  const corePatch = patchLines.slice(startIndex).join("\n");

  // Ensure the patch ends with a newline if it contains content
  const finalPatch = corePatch.trim()
    ? gitDiffHeader + corePatch + (corePatch.endsWith("\n") ? "" : "\n")
    : "";

  return finalPatch;
}

/**
 * Update an existing pull request
 */
export async function updatePullRequest(rawParams: any) {
  // Parse arguments
  const params = updatePullRequestSchema.parse({
    pullRequestId: rawParams.pullRequestId,
    title: rawParams.title,
    description: rawParams.description,
    status: rawParams.status,
    workItemIds: rawParams.workItemIds,
    isDraft: rawParams.isDraft,
  });

  console.error(
    "[API] Updating pull request:",
    JSON.stringify(params, null, 2)
  );

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Prepare the update payload
    const updateData: any = {};
    if (params.title !== undefined) {
      updateData.title = params.title;
    }
    if (params.description !== undefined) {
      updateData.description = params.description;
    }
    if (params.status !== undefined) {
      // Map status string to the API's expected enum/value if necessary
      // For azure-devops-node-api, it might handle the string directly or need a specific type.
      // Let's assume it handles the string for now, but this might need adjustment.
      // The REST API uses numbers: 1=active, 2=abandoned, 3=completed
      let statusId: number | undefined;
      switch (params.status) {
        case "active":
          statusId = 1;
          break;
        case "completed":
          statusId = 3;
          break;
        case "abandoned":
          statusId = 2;
          break;
      }
      if (statusId !== undefined) {
        updateData.status = statusId;
      }
    }
    // Add work item references if provided
    // Note: This typically *replaces* existing links, doesn't append.
    if (params.workItemIds !== undefined) {
      updateData.workItemRefs = params.workItemIds.map((id: number) => ({
        id: id.toString(),
        url: `${ORG_URL}/_apis/wit/workItems/${id}`, // Construct work item URL
      }));
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      console.error("[API] No fields provided to update.");
      return {
        content: [
          {
            type: "text",
            text: "No fields provided to update.",
          },
        ],
      };
    }

    // Update pull request
    if (!DEFAULT_PROJECT || !DEFAULT_REPOSITORY) {
      throw new Error("Default project and repository must be configured");
    }

    // Use makeAzureDevOpsRequest directly with PATCH
    const updateUrl = `${ORG_URL}/${DEFAULT_PROJECT}/_apis/git/repositories/${DEFAULT_REPOSITORY}/pullrequests/${params.pullRequestId}?api-version=7.1-preview.1`;

    console.error(
      `[API] Calling PATCH ${updateUrl} with data:`,
      JSON.stringify(updateData, null, 2)
    );

    const updatedPullRequest = await makeAzureDevOpsRequest(
      updateUrl,
      "PATCH",
      updateData
    );

    console.error(
      `[API] Updated pull request via REST: ${updatedPullRequest.pullRequestId}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(updatedPullRequest, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error updating pull request", error);
    throw error;
  }
}

/**
 * Tool definitions for pull requests
 */
export const pullRequestTools = [
  {
    name: "list_pull_requests",
    description: "List pull requests in a repository",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned"],
          description: "Filter by PR status",
        },
      },
      required: [],
    },
  },
  {
    name: "get_pull_request",
    description: "Get details of a specific pull request",
    inputSchema: {
      type: "object",
      properties: {
        pullRequestId: {
          type: "number",
          description: "ID of the pull request",
        },
      },
      required: ["pullRequestId"],
    },
  },
  {
    name: "create_pull_request",
    description: "Create a new pull request",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the pull request",
        },
        description: {
          type: "string",
          description: "Description of the pull request",
        },
        sourceBranch: {
          type: "string",
          description: "Source branch name",
        },
        targetBranch: {
          type: "string",
          description: "Target branch name",
        },
        reviewers: {
          type: "array",
          items: { type: "string" },
          description: "Array of reviewer email addresses",
        },
        workItemIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of work item IDs to link",
        },
      },
      required: ["title", "description", "sourceBranch", "targetBranch"],
    },
  },
  {
    name: "create_pull_request_comment",
    description: "Add a comment to a pull request",
    inputSchema: {
      type: "object",
      properties: {
        pullRequestId: {
          type: "number",
          description: "ID of the pull request",
        },
        content: {
          type: "string",
          description: "Comment content",
        },
        threadId: {
          type: "number",
          description: "Thread ID for replies (optional)",
        },
        filePath: {
          type: "string",
          description: "File path for file-specific comments (optional)",
        },
        lineNumber: {
          type: "number",
          description: "Line number for line-specific comments (optional)",
        },
        status: {
          type: "string",
          enum: ["active", "fixed", "pending", "wontfix", "closed"],
          description: "Thread status (optional)",
        },
      },
      required: ["pullRequestId", "content"],
    },
  },
  {
    name: "get_pull_request_diff",
    description: "Get the diff for a pull request",
    inputSchema: {
      type: "object",
      properties: {
        pullRequestId: {
          type: "number",
          description: "ID of the pull request",
        },
        filePath: {
          type: "string",
          description: "Specific file path to get diff for (optional)",
        },
        iterationId: {
          type: "number",
          description: "Specific iteration to get diff for (optional)",
        },
      },
      required: ["pullRequestId"],
    },
  },
  {
    name: "update_pull_request",
    description: "Update an existing pull request",
    inputSchema: {
      type: "object",
      properties: {
        pullRequestId: {
          type: "number",
          description: "ID of the pull request to update",
        },
        title: {
          type: "string",
          description: "New title for the pull request (optional)",
        },
        description: {
          type: "string",
          description: "New description for the pull request (optional)",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned"],
          description: "New status for the pull request (optional)",
        },
        workItemIds: {
          type: "array",
          items: { type: "number" },
          description:
            "Array of work item IDs to link (replaces existing links)",
        },
        // Add other updatable fields here if needed
      },
      required: ["pullRequestId"],
    },
  },
];
