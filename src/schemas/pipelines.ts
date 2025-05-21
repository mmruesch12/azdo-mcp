import { z } from "zod";

/**
 * Schema for listing pipelines
 */
export const listPipelinesSchema = z.object({
  project: z.string().optional(),
  folder: z.string().optional(),
  name: z.string().optional(),
});

export type ListPipelinesParams = z.infer<typeof listPipelinesSchema>;

/**
 * Schema for triggering a pipeline
 */
export const triggerPipelineSchema = z.object({
  project: z.string().optional(),
  pipelineId: z.number(),
  branch: z.string().optional(),
  variables: z.record(z.string()).optional(), // Record<string, string>
});

export type TriggerPipelineParams = z.infer<typeof triggerPipelineSchema>; 