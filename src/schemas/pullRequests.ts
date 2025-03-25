import { z } from "zod";

/**
 * Schema for listing pull requests
 */
export const listPullRequestsSchema = z.object({
  status: z.enum(["active", "completed", "abandoned"]).optional(),
});

export type ListPullRequestsParams = z.infer<typeof listPullRequestsSchema>;

/**
 * Schema for getting a pull request
 */
export const getPullRequestSchema = z.object({
  pullRequestId: z.number(),
});

export type GetPullRequestParams = z.infer<typeof getPullRequestSchema>;

/**
 * Schema for creating a pull request
 */
export const createPullRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  reviewers: z.array(z.string()).optional(),
});

export type CreatePullRequestParams = z.infer<typeof createPullRequestSchema>;

/**
 * Schema for creating a pull request comment
 */
export const createPullRequestCommentSchema = z.object({
  pullRequestId: z.number(),
  content: z.string(),
  threadId: z.number().optional(), // For replying to existing threads
  filePath: z.string().optional(), // For file-specific comments
  lineNumber: z.number().optional(), // For line-specific comments
  status: z
    .enum(["active", "fixed", "pending", "wontfix", "closed"])
    .optional(), // Thread status
});

export type CreatePullRequestCommentParams = z.infer<
  typeof createPullRequestCommentSchema
>;

/**
 * Schema for getting pull request diff
 */
export const getPullRequestDiffSchema = z.object({
  pullRequestId: z.number(),
  filePath: z.string().optional(), // For specific file diffs
  iterationId: z.number().optional(), // For specific iteration
});

export type GetPullRequestDiffParams = z.infer<typeof getPullRequestDiffSchema>;
