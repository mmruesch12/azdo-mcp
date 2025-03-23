import { z } from "zod";

/**
 * Schema for creating a wiki page
 */
export const createWikiPageSchema = z.object({
  project: z.string(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
});

export type CreateWikiPageParams = z.infer<typeof createWikiPageSchema>;

/**
 * Schema for editing a wiki page
 */
export const editWikiPageSchema = z.object({
  project: z.string(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
  etag: z.string(),
});

export type EditWikiPageParams = z.infer<typeof editWikiPageSchema>;
