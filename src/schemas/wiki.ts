import { z } from "zod";

/**
 * Schema for creating a wiki page
 */
export const createWikiPageSchema = z.object({
  project: z.string().optional(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
});

export type CreateWikiPageParams = z.infer<typeof createWikiPageSchema>;

/**
 * Schema for editing a wiki page
 */
export const editWikiPageSchema = z.object({
  project: z.string().optional(),
  wiki: z.string(),
  path: z.string(),
  content: z.string(),
  etag: z.string().optional(),
});

export type EditWikiPageParams = z.infer<typeof editWikiPageSchema>;

/**
 * Schema for getting all wikis in a project
 */
export const getWikisSchema = z.object({
  project: z.string().optional(),
});

export type GetWikisParams = z.infer<typeof getWikisSchema>;

/**
 * Schema for getting a specific wiki page
 */
export const getWikiPageSchema = z.object({
  project: z.string().optional(),
  wikiIdentifier: z.string(),
  path: z.string(),
  recursionLevel: z.number().optional(),
  includeContent: z.boolean().optional().default(true),
});

export type GetWikiPageParams = z.infer<typeof getWikiPageSchema>;

/**
 * Schema for creating a new wiki
 */
export const createWikiSchema = z.object({
  project: z.string().optional(),
  name: z.string(),
  type: z.enum(["projectWiki", "codeWiki"]).optional().default("projectWiki"),
  mappedPath: z.string().optional(),
  repositoryId: z.string().optional(),
  version: z.string().optional(),
});

export type CreateWikiParams = z.infer<typeof createWikiSchema>;

/**
 * Schema for listing wiki pages (typically root or under a path with recursion)
 */
export const listWikiPagesSchema = z.object({
  project: z.string().optional(),
  wikiIdentifier: z.string(),
  path: z.string().optional(),
  recursionLevel: z.number().optional(),
  includeContent: z.boolean().optional().default(false),
});

export type ListWikiPagesParams = z.infer<typeof listWikiPagesSchema>;

/**
 * Schema for getting a wiki page by its ID
 */
export const getWikiPageByIdSchema = z.object({
  project: z.string().optional(),
  wikiIdentifier: z.string(),
  pageId: z.number(),
  includeContent: z.boolean().optional().default(true),
});

export type GetWikiPageByIdParams = z.infer<typeof getWikiPageByIdSchema>;
