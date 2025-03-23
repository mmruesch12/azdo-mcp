import { DEFAULT_PROJECT, DEFAULT_REPOSITORY, ORG_URL } from "../config/env.js";
import { getGitClient } from "../auth/client.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { logError } from "../utils/error.js";
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
} from "../schemas/pullRequests.js";

/**
 * List pull requests in a repository
 */
export async function listPullRequests(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = listPullRequestsSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    repository: rawParams.repository || DEFAULT_REPOSITORY,
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
    const pullRequests = await gitClient.getPullRequests(
      params.repository,
      { status: statusId },
      params.project
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
    project: rawParams.project || DEFAULT_PROJECT,
    repository: rawParams.repository || DEFAULT_REPOSITORY,
    pullRequestId: rawParams.pullRequestId,
  });

  console.error("[API] Getting pull request details:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Get pull request details
    const pullRequest = await gitClient.getPullRequestById(
      params.pullRequestId,
      params.project
    );

    console.error(`[API] Found pull request: ${pullRequest.pullRequestId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(pullRequest, null, 2),
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
    project: rawParams.project || DEFAULT_PROJECT,
    repository: rawParams.repository || DEFAULT_REPOSITORY,
    title: rawParams.title,
    description: rawParams.description,
    sourceBranch: rawParams.sourceBranch,
    targetBranch: rawParams.targetBranch,
    reviewers: rawParams.reviewers,
  });

  console.error("[API] Creating pull request:", params);

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
    const pullRequest = await gitClient.createPullRequest(
      {
        sourceRefName: sourceBranch,
        targetRefName: targetBranch,
        title: params.title,
        description: params.description,
        reviewers: params.reviewers
          ? params.reviewers.map((email) => ({ id: email }))
          : undefined,
      },
      params.repository,
      params.project
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
 * Add a comment to a pull request
 */
export async function createPullRequestComment(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = createPullRequestCommentSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    repository: rawParams.repository || DEFAULT_REPOSITORY,
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
      // This is a reply to an existing thread
      console.error(`[API] Adding comment to thread ${params.threadId}`);

      // Create comment in existing thread
      const comment = {
        content: params.content,
        parentCommentId: 0, // Root level comment in thread
      };

      const commentUrl = `${ORG_URL}/${params.project}/_apis/git/repositories/${params.repository}/pullRequests/${params.pullRequestId}/threads/${params.threadId}/comments?api-version=7.1-preview.1`;
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
          },
        ],
        status: params.status || "active",
      };

      // If file path is provided, this is a code comment
      if (params.filePath) {
        console.error(
          `[API] Creating code comment on file: ${params.filePath}`
        );

        // Get the latest iteration
        const iterationsUrl = `${ORG_URL}/${params.project}/_apis/git/repositories/${params.repository}/pullRequests/${params.pullRequestId}/iterations?api-version=7.1-preview.1`;
        const iterations = await makeAzureDevOpsRequest(iterationsUrl);
        const latestIteration =
          iterations.value.length > 0
            ? iterations.value[iterations.value.length - 1].id
            : 1;

        // Add file position information
        thread.threadContext = {
          filePath: params.filePath,
          rightFileStart: {
            line: params.lineNumber || 1,
            offset: 1,
          },
          rightFileEnd: {
            line: params.lineNumber || 1,
            offset: 1,
          },
        };

        thread.pullRequestThreadContext = {
          iterationContext: {
            firstComparingIteration: latestIteration,
            secondComparingIteration: latestIteration,
          },
        };
      } else {
        console.error("[API] Creating general PR comment");
      }

      // Create the thread
      const threadUrl = `${ORG_URL}/${params.project}/_apis/git/repositories/${params.repository}/pullRequests/${params.pullRequestId}/threads?api-version=7.1-preview.1`;
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
    project: rawParams.project || DEFAULT_PROJECT,
    repository: rawParams.repository || DEFAULT_REPOSITORY,
    pullRequestId: rawParams.pullRequestId,
    filePath: rawParams.filePath,
    iterationId: rawParams.iterationId,
  });

  console.error("[API] Getting PR diff:", params);

  try {
    // Get the Git API client
    const gitClient = await getGitClient();

    // Get the iterations to find the latest one if not specified
    const iterationsUrl = `${ORG_URL}/${params.project}/_apis/git/repositories/${params.repository}/pullRequests/${params.pullRequestId}/iterations?api-version=7.1-preview.1`;
    const iterations = await makeAzureDevOpsRequest(iterationsUrl);
    console.error("[API] PR iterations:", iterations);

    const iterationId =
      params.iterationId ||
      (iterations.value.length > 0
        ? iterations.value[iterations.value.length - 1].id
        : 1);

    console.error(`[API] Using iteration ID: ${iterationId}`);

    // Build the URL for getting changes
    let changesUrl = `${ORG_URL}/${params.project}/_apis/git/repositories/${params.repository}/pullRequests/${params.pullRequestId}/iterations/${iterationId}/changes?api-version=7.1-preview.1`;

    // Add file path filter if specified
    if (params.filePath) {
      changesUrl += `&path=${encodeURIComponent(params.filePath)}`;
    }

    // Get the changes
    const changes = await makeAzureDevOpsRequest(changesUrl);
    console.error("[API] PR changes:", changes);

    // Format the diff output
    let formattedDiff = "";

    if (changes.changeEntries && changes.changeEntries.length > 0) {
      for (const change of changes.changeEntries) {
        formattedDiff += `\n--- ${change.item.path} (${change.changeType})\n`;

        // If we need the actual diff content, we need to get the file content
        if (change.item && change.item.objectId) {
          const itemUrl = `${ORG_URL}/${
            params.project
          }/_apis/git/repositories/${
            params.repository
          }/items?path=${encodeURIComponent(
            change.item.path
          )}&versionType=commit&version=${
            change.item.objectId
          }&api-version=7.1-preview.1`;
          try {
            const itemContent = await makeAzureDevOpsRequest(itemUrl);
            if (itemContent && itemContent.content) {
              formattedDiff += `\n${itemContent.content}\n`;
            }
          } catch (error) {
            formattedDiff += `\nUnable to retrieve file content: ${
              error instanceof Error ? error.message : String(error)
            }\n`;
          }
        }
      }
    } else {
      formattedDiff = "No changes found in this pull request.";
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(changes, null, 2),
        },
        {
          type: "text",
          text: formattedDiff,
        },
      ],
    };
  } catch (error) {
    logError("Error getting PR diff", error);
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
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        repository: {
          type: "string",
          description: "Name of the repository",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned"],
          description: "Filter by PR status",
        },
      },
      required: ["project", "repository"],
    },
  },
  {
    name: "get_pull_request",
    description: "Get details of a specific pull request",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        repository: {
          type: "string",
          description: "Name of the repository",
        },
        pullRequestId: {
          type: "number",
          description: "ID of the pull request",
        },
      },
      required: ["project", "repository", "pullRequestId"],
    },
  },
  {
    name: "create_pull_request",
    description: "Create a new pull request",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        repository: {
          type: "string",
          description: "Name of the repository",
        },
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
      },
      required: [
        "project",
        "repository",
        "title",
        "description",
        "sourceBranch",
        "targetBranch",
      ],
    },
  },
  {
    name: "create_pull_request_comment",
    description: "Add a comment to a pull request",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        repository: {
          type: "string",
          description: "Name of the repository",
        },
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
      required: ["project", "repository", "pullRequestId", "content"],
    },
  },
  {
    name: "get_pull_request_diff",
    description: "Get the diff for a pull request",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        repository: {
          type: "string",
          description: "Name of the repository",
        },
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
      required: ["project", "repository", "pullRequestId"],
    },
  },
];
