import { z } from "zod";

/**
 * Schema for listing projects
 */
export const listProjectsSchema = z.object({});

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

/**
 * Schema for getting a project
 */
export const getProjectSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
  })
  .refine((data) => data.id || data.name, {
    message: "Either id or name must be provided",
  });

export type GetProjectParams = z.infer<typeof getProjectSchema>;
