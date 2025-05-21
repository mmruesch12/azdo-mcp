import { DEFAULT_PROJECT, ORG_URL } from "../config/env.js";
import { makeAzureDevOpsRequest } from "../utils/api.js";
import { logError } from "../utils/error.js";
import {
  createWikiPageSchema,
  editWikiPageSchema,
  getWikisSchema,
  getWikiPageSchema,
  createWikiSchema,
  listWikiPagesSchema,
  getWikiPageByIdSchema,
  type CreateWikiPageParams,
  type EditWikiPageParams,
  type GetWikisParams,
  type GetWikiPageParams,
  type CreateWikiParams,
  type ListWikiPagesParams,
  type GetWikiPageByIdParams,
} from "../schemas/wiki.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const API_VERSION = "7.0"; // Consistent API version

/**
 * Create a new wiki page
 */
export async function createWikiPage(rawParams: any) {
  const params = createWikiPageSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wiki: rawParams.wiki,
    path: rawParams.path,
    content: rawParams.content,
  });
  if (!params.project) throw new Error("Project is required for context.");
  const encodedPath = encodeURIComponent(
    params.path.startsWith("/") ? params.path : `/${params.path}`,
  );
  const url = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${params.wiki}/pages?path=${encodedPath}&api-version=${API_VERSION}`;

  console.error(
    `[API] Creating/updating wiki page (PUT):\nURL: ${url}\nPath: ${params.path}\nWiki: ${params.wiki}\nProject: ${params.project}`,
  );

  try {
    const page = await makeAzureDevOpsRequest(url, "PUT", {
      content: params.content,
    });
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  } catch (error: any) {
    logError("Error creating/updating wiki page", error);
    if (error.message && error.message.includes("409")) {
      // Conflict, likely ETag issue or page exists
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Page '${params.path}' might already exist or there was a conflict. For existing pages, ensure you use edit_wiki_page or check ETag. Original error: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Edit an existing wiki page
 */
export async function editWikiPage(rawParams: any) {
  const params = editWikiPageSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wiki: rawParams.wiki,
    path: rawParams.path,
    content: rawParams.content,
    etag: rawParams.etag,
  });
  if (!params.project) throw new Error("Project is required for context.");
  const encodedPath = encodeURIComponent(
    params.path.startsWith("/") ? params.path : `/${params.path}`,
  );
  const url = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${params.wiki}/pages?path=${encodedPath}&api-version=${API_VERSION}`;

  console.error(
    `[API] Editing wiki page (PUT):\nURL: ${url}\nPath: ${params.path}\nWiki: ${params.wiki}\nProject: ${params.project}`,
  );

  let currentEtag = params.etag;
  if (!currentEtag) {
    console.error(
      "[API] ETag not provided, attempting to fetch current page ETag.",
    );
    try {
      const pageData = await makeAzureDevOpsRequest(url, "GET"); // GET to fetch current page details
      currentEtag = pageData.eTag;
      if (!currentEtag) {
        throw new Error(
          "Failed to automatically fetch ETag. Page might not exist or ETag was not returned in response.",
        );
      }
      console.error("[API] Fetched ETag:", currentEtag);
    } catch (fetchError: any) {
      logError("Failed to fetch current page for ETag", fetchError);
      if (fetchError.message && fetchError.message.includes("404")) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Page '${params.path}' not found in wiki '${params.wiki}'. Cannot edit a non-existent page.`,
        );
      }
      throw new Error(
        `Failed to fetch current ETag for page '${params.path}'. Error: ${fetchError.message}. If the page exists, provide its ETag manually or verify its path.`,
      );
    }
  }

  try {
    const headers = { "If-Match": currentEtag };
    const page = await makeAzureDevOpsRequest(
      url,
      "PUT",
      { content: params.content },
      headers,
    );
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  } catch (error: any) {
    logError("Error editing wiki page", error);
    if (error.message && error.message.includes("412")) {
      // Precondition Failed (ETag mismatch)
      throw new McpError(
        ErrorCode.InvalidRequest,
        `ETag mismatch for page '${params.path}'. The page has been updated since the ETag was fetched. Please get the latest ETag and try again. Original error: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Get all wikis in a project
 */
export async function getWikis(rawParams: any) {
  const params = getWikisSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
  });
  if (!params.project) throw new Error("Project is required for context.");
  const url = `${ORG_URL}/${params.project}/_apis/wiki/wikis?api-version=${API_VERSION}`;
  console.error(
    `[API] Getting all wikis for project ${params.project}:\nURL: ${url}`,
  );

  try {
    const wikis = await makeAzureDevOpsRequest(url, "GET");
    return {
      content: [{ type: "text", text: JSON.stringify(wikis, null, 2) }],
    };
  } catch (error) {
    logError("Error getting wikis", error);
    throw error;
  }
}

/**
 * Get a specific wiki page by path
 */
export async function getWikiPage(rawParams: any) {
  const params = getWikiPageSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wikiIdentifier: rawParams.wikiIdentifier,
    path: rawParams.path,
    recursionLevel: rawParams.recursionLevel, // Schema default is not used by parse, handle undefined below
    includeContent:
      rawParams.includeContent === undefined ? true : rawParams.includeContent, // Schema default handled here
  });

  if (!params.project) throw new Error("Project is required for context.");
  if (!params.wikiIdentifier) throw new Error("Wiki identifier is required.");
  if (!params.path) throw new Error("Page path is required.");

  const encodedPath = encodeURIComponent(
    params.path.startsWith("/") ? params.path : `/${params.path}`,
  );
  let url = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${params.wikiIdentifier}/pages?path=${encodedPath}&api-version=${API_VERSION}`;
  url += `&includeContent=${params.includeContent}`;
  if (params.recursionLevel !== undefined) {
    // Azure DevOps API uses strings 'None' or 'Full' for recursion, or integer values.
    // We will assume 0 for None and 1 for Full based on typical SDK enum mapping.
    // Direct REST might also accept the numbers. The WikiRecursionLevel enum is not in v12 client.
    url += `&recursionLevel=${params.recursionLevel === 1 ? "Full" : "None"}`;
  }

  console.error(`[API] Getting wiki page:\nURL: ${url}`);

  try {
    const page = await makeAzureDevOpsRequest(url, "GET");
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  } catch (error: any) {
    logError("Error getting wiki page", error);
    if (error.message && error.message.includes("404")) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Wiki page at path '${params.path}' not found in wiki '${params.wikiIdentifier}'. Original error: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Create a new wiki
 */
export async function createWiki(rawParams: any) {
  const params = createWikiSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    name: rawParams.name,
    type: rawParams.type, // 'codeWiki' or 'projectWiki'
    repositoryId: rawParams.repositoryId, // Required for codeWiki
    mappedPath: rawParams.mappedPath, // Required for codeWiki (e.g., "/")
    version: rawParams.version, // Required for codeWiki (e.g., "main")
  });

  if (!params.project) throw new Error("Project is required for context.");
  if (!params.name) throw new Error("Wiki name is required.");

  const url = `${ORG_URL}/${params.project}/_apis/wiki/wikis?api-version=${API_VERSION}`;
  console.error(
    `[API] Creating wiki '${params.name}' in project ${params.project}:\nURL: ${url}`,
  );

  const body: any = {
    name: params.name,
    type: params.type,
  };

  if (params.type === "codeWiki") {
    if (!params.repositoryId)
      throw new Error("Repository ID is required for codeWiki type.");
    if (!params.mappedPath)
      throw new Error("Mapped path is required for codeWiki type.");
    if (!params.version)
      throw new Error(
        "Repository branch version is required for codeWiki type.",
      );
    body.repositoryId = params.repositoryId;
    body.mappedPath = params.mappedPath;
    body.version = { name: params.version }; // API expects version as an object { name: "branchName" }
  }

  try {
    const wiki = await makeAzureDevOpsRequest(url, "POST", body);
    return { content: [{ type: "text", text: JSON.stringify(wiki, null, 2) }] };
  } catch (error) {
    logError("Error creating wiki", error);
    throw error;
  }
}

/**
 * List pages in a wiki
 */
export async function listWikiPages(rawParams: any) {
  const params = listWikiPagesSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wikiIdentifier: rawParams.wikiIdentifier,
    path: rawParams.path,
    recursionLevel: rawParams.recursionLevel,
    includeContent: rawParams.includeContent,
  });

  if (!params.project) throw new Error("Project is required for context.");
  if (!params.wikiIdentifier) throw new Error("Wiki identifier is required.");

  let url = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${params.wikiIdentifier}/pages?api-version=${API_VERSION}`;
  if (params.path) {
    const encodedPath = encodeURIComponent(
      params.path.startsWith("/") ? params.path : `/${params.path}`,
    );
    url += `&path=${encodedPath}`;
  }
  if (params.recursionLevel !== undefined) {
    url += `&recursionLevel=${params.recursionLevel === 1 ? "Full" : "None"}`;
  }
  if (params.includeContent !== undefined) {
    url += `&includeContent=${params.includeContent}`;
  }

  console.error(
    `[API] Listing wiki pages for wiki '${params.wikiIdentifier}':\nURL: ${url}`,
  );

  try {
    const pages = await makeAzureDevOpsRequest(url, "GET");
    return {
      content: [{ type: "text", text: JSON.stringify(pages, null, 2) }],
    };
  } catch (error) {
    logError("Error listing wiki pages", error);
    throw error;
  }
}

/**
 * Get a specific wiki page by its ID (integer)
 */
export async function getWikiPageById(rawParams: any) {
  const params = getWikiPageByIdSchema.parse({
    project: rawParams.project || DEFAULT_PROJECT,
    wikiIdentifier: rawParams.wikiIdentifier,
    pageId: rawParams.pageId,
    includeContent:
      rawParams.includeContent === undefined ? true : rawParams.includeContent,
  });

  if (!params.project) throw new Error("Project is required for context.");
  if (!params.wikiIdentifier) throw new Error("Wiki identifier is required.");
  if (params.pageId === undefined) throw new Error("Page ID is required.");

  let url = `${ORG_URL}/${params.project}/_apis/wiki/wikis/${params.wikiIdentifier}/pages/${params.pageId}?api-version=${API_VERSION}`;
  url += `&includeContent=${params.includeContent}`;

  console.error(
    `[API] Getting wiki page by ID '${params.pageId}' from wiki '${params.wikiIdentifier}':\nURL: ${url}`,
  );

  try {
    const page = await makeAzureDevOpsRequest(url, "GET");
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  } catch (error: any) {
    logError("Error getting wiki page by ID", error);
    if (error.message && error.message.includes("404")) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Wiki page with ID '${params.pageId}' not found in wiki '${params.wikiIdentifier}'. Original error: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Tool definitions for wiki
 */
export const wikiTools = [
  {
    name: "create_wiki_page",
    description:
      "Creates or updates a wiki page. For existing pages, it's safer to use edit_wiki_page with an ETag.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        wiki: { type: "string", description: "Identifier of the wiki (name or ID)" },
        path: { type: "string", description: "Path of the wiki page" },
        content: { type: "string", description: "Content of the wiki page" },
      },
      required: ["wiki", "path", "content"],
    },
  },
  {
    name: "edit_wiki_page",
    description:
      "Edit an existing wiki page. ETag is recommended; if not provided, an attempt will be made to fetch it.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        wiki: { type: "string", description: "Identifier of the wiki (name or ID)" },
        path: { type: "string", description: "Path of the wiki page" },
        content: { type: "string", description: "New content for the wiki page" },
        etag: { type: "string", description: "ETag for concurrency control (optional)" },
      },
      required: ["wiki", "path", "content"],
    },
  },
  {
    name: "get_wikis",
    description: "List all wikis in a project.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
      },
      required: [],
    },
  },
  {
    name: "get_wiki_page",
    description:
      "Get a specific wiki page by its path. Can optionally include sub-pages through recursion.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        wikiIdentifier: { type: "string", description: "Identifier of the wiki (name or ID)" },
        path: { type: "string", description: "Path of the wiki page" },
        recursionLevel: { type: "number", description: "Recursion level for sub-pages (0 for None, 1 for Full) (optional)" },
        includeContent: { type: "boolean", description: "Whether to include page content (defaults to true) (optional)" },
      },
      required: ["wikiIdentifier", "path"],
    },
  },
  {
    name: "create_wiki",
    description:
      "Create a new wiki. Can be a project wiki or a code wiki linked to a Git repository.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        name: { type: "string", description: "Name for the new wiki" },
        type: { type: "string", enum: ["projectWiki", "codeWiki"], description: "Type of wiki (projectWiki or codeWiki, defaults to projectWiki) (optional)" },
        mappedPath: { type: "string", description: "Base path for code wiki (e.g., \"/\") (required for codeWiki)" },
        repositoryId: { type: "string", description: "ID of the Git repository for codeWiki (required for codeWiki)" },
        version: { type: "string", description: "Branch name for code wiki (e.g., \"main\") (required for codeWiki)" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_wiki_pages",
    description:
      "List pages in a specific wiki. Can filter by path and include sub-pages.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        wikiIdentifier: { type: "string", description: "Identifier of the wiki (name or ID)" },
        path: { type: "string", description: "Path to list pages from (optional)" },
        recursionLevel: { type: "number", description: "Recursion level for sub-pages (0 for None, 1 for Full) (optional)" },
        includeContent: { type: "boolean", description: "Whether to include page content (defaults to false) (optional)" },
      },
      required: ["wikiIdentifier"],
    },
  },
  {
    name: "get_wiki_page_by_id",
    description:
      "Get a specific wiki page by its integer ID. Can optionally include sub-pages.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Name of the Azure DevOps project (optional, uses default if not provided)" },
        wikiIdentifier: { type: "string", description: "Identifier of the wiki (name or ID)" },
        pageId: { type: "number", description: "Integer ID of the wiki page" },
        includeContent: { type: "boolean", description: "Whether to include page content (defaults to true) (optional)" },
      },
      required: ["wikiIdentifier", "pageId"],
    },
  },
];
