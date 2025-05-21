import { z } from "zod";

/**
 * Schema for getting boards
 */
export const getBoardsSchema = z.object({
  project: z.string().optional(),
  team: z.string().optional(),
});

export type GetBoardsParams = z.infer<typeof getBoardsSchema>; 