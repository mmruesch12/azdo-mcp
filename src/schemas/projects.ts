import { z } from "zod";

// Schema for listing projects tool input
export const ListProjectsSchema = z.object({
  // Optional name filter
  name: z.string().optional().describe("Optional filter for project names"),
});

// Response schema for project details
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  url: z.string(),
  state: z.string(),
  visibility: z.string(),
  lastUpdateTime: z.string(),
});

// Schema for the list projects response
export const ListProjectsResponseSchema = z.object({
  count: z.number(),
  value: z.array(ProjectSchema),
});

// Export types
export type ListProjects = z.infer<typeof ListProjectsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
