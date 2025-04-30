import { z } from "zod";

/**
 * Schema for listing work items
 */
export const listWorkItemsSchema = z.object({
  project: z.string(),
  types: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

export type ListWorkItemsParams = z.infer<typeof listWorkItemsSchema>;

/**
 * Schema for getting a work item
 */
export const getWorkItemSchema = z.object({
  project: z.string(),
  id: z.number(),
});

export type GetWorkItemParams = z.infer<typeof getWorkItemSchema>;

/**
 * Schema for creating a work item
 */
export const createWorkItemSchema = z.object({
  project: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  technologyInvestmentType: z.string().optional(), // Made optional
  securityVulnerability: z.string().optional(), // Made optional
});

export type CreateWorkItemParams = z.infer<typeof createWorkItemSchema>;
