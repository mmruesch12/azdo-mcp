import { DEFAULT_PROJECT, ORG_URL } from "../config/env.js";
import { getWikiClient } from "../auth/client.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { logError } from "../utils/error.js";
import {
  createWikiPageSchema,
  editWikiPageSchema,
  type CreateWikiPageParams,
  type EditWikiPageParams,
} from "../schemas/wiki.js";

/**
 * Create a new wiki page
 */
export async function createWikiPage(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = createWikiPageSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wiki: rawParams.wiki,
    path: rawParams.path,
    content: rawParams.content,
  });

  console.error("[API] Creating wiki page:", params.path);

  try {
    // First try to get all wikis in the project
    const wikiListUrl = `${ORG_URL}/${params.project}/_wiki/wikis/${params.wiki}?api-version=7.1-preview.1`;
    console.error("[API] Getting wikis from:", wikiListUrl);
    const wikis = await makeAzureDevOpsRequest(wikiListUrl);
    console.error("[API] Found wikis:", wikis);

    // Try to find existing wiki
    let wiki = wikis.value.find((w: any) => w.name === params.wiki);

    if (!wiki) {
      // Create new project wiki
      console.error("[API] Creating new project wiki");
      const createWikiUrl = `${ORG_URL}/${params.project}/_wiki/wikis?api-version=7.1-preview.1`;
      wiki = await makeAzureDevOpsRequest(createWikiUrl, "POST", {
        name: `${params.wiki}.wiki`,
        projectId: params.project,
        type: "projectWiki",
      });
      console.error("[API] Created wiki:", wiki);
    }

    // Create the page using REST API
    const pageUrl = `${ORG_URL}/${params.project}/_wiki/wikis/${
      wiki.id
    }/pages?path=${encodeURIComponent(params.path)}&api-version=7.1-preview.1`;
    const page = await makeAzureDevOpsRequest(pageUrl, "PUT", {
      content: params.content,
    });
    console.error("[API] Created page:", page);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(page, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error creating wiki page", error);
    throw error;
  }
}

/**
 * Edit an existing wiki page
 */
export async function editWikiPage(rawParams: any) {
  // Parse arguments with defaults from environment variables
  const params = editWikiPageSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wiki: rawParams.wiki,
    path: rawParams.path,
    content: rawParams.content,
    etag: rawParams.etag,
  });

  console.error("[API] Editing wiki page:", params.path);

  try {
    // Get current page to get ETag if not provided
    const wikiId = params.wiki; // Assuming wiki parameter is the wiki ID
    const getPageUrl = `${ORG_URL}/${
      params.project
    }/_wiki/wikis/${wikiId}/pages?path=${encodeURIComponent(
      params.path
    )}&api-version=7.1-preview.1`;

    const currentPage = await makeAzureDevOpsRequest(getPageUrl);
    console.error("[API] Current page:", currentPage);

    // Use provided etag or get from current page
    const etag = params.etag || currentPage.eTag;
    console.error("[API] Using ETag:", etag);

    // Then update the page
    const updatePageUrl = `${ORG_URL}/${
      params.project
    }/_wiki/wikis/${wikiId}/pages?path=${encodeURIComponent(
      params.path
    )}&api-version=7.1-preview.1`;

    const page = await makeAzureDevOpsRequest(
      updatePageUrl,
      "PUT",
      { content: params.content },
      { "If-Match": etag }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(page, null, 2),
        },
      ],
    };
  } catch (error) {
    logError("Error editing wiki page", error);
    throw error;
  }
}

/**
 * Tool definitions for wiki
 */
export const wikiTools = [
  {
    name: "create_wiki_page",
    description: "Create a new wiki page",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        wiki: {
          type: "string",
          description: "Name of the wiki",
        },
        path: {
          type: "string",
          description: "Path of the wiki page",
        },
        content: {
          type: "string",
          description: "Content of the wiki page",
        },
      },
      required: ["project", "wiki", "path", "content"],
    },
  },
  {
    name: "edit_wiki_page",
    description: "Edit an existing wiki page",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Name of the Azure DevOps project",
        },
        wiki: {
          type: "string",
          description: "Name of the wiki",
        },
        path: {
          type: "string",
          description: "Path of the wiki page",
        },
        content: {
          type: "string",
          description: "New content of the wiki page",
        },
        etag: {
          type: "string",
          description: "ETag for concurrency control",
        },
      },
      required: ["project", "wiki", "path", "content"],
    },
  },
];
