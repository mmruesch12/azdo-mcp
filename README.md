# Azure DevOps MCP Server

An MCP (Model Context Protocol) server that provides integration with Azure DevOps, allowing AI assistants to interact with Azure DevOps work items, pull requests, and wikis.

<a href="https://glama.ai/mcp/servers/@mmruesch12/azdo-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@mmruesch12/azdo-mcp/badge" alt="azure-devops Server MCP server" />
</a>

## Features

- Work Items Management (create, list, get)
- Pull Request Operations (create, list, get, comment, diff)
- Wiki Page Management (create, edit)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (create a .env file):
```env
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_PROJECT=default-project
AZURE_DEVOPS_REPOSITORY=default-repo
```

3. Build the server:
```bash
npm run build
```

## Installation

Add the server configuration to your MCP settings:

### For VSCode

#### On macOS/Linux
Add to `~/.vscode/cline_mcp_settings.json` or the Cursor/Roo equivalent:
```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": ["/path/to/azure-devops-mcp/build/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "your-org-url",
        "AZURE_DEVOPS_PAT": "your-pat",
        "AZURE_DEVOPS_PROJECT": "your-project",
        "AZURE_DEVOPS_REPOSITORY": "your-repo"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### On Windows
Add to `%USERPROFILE%\.vscode\cline_mcp_settings.json` or the Cursor/Roo equivalent:
```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": ["C:/path/to/azure-devops-mcp/build/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "your-org-url",
        "AZURE_DEVOPS_PAT": "your-pat",
        "AZURE_DEVOPS_PROJECT": "your-project",
        "AZURE_DEVOPS_REPOSITORY": "your-repo"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Available Tools

### Work Items

#### list_work_items
Lists work items in a project.
```typescript
{
  "project": string,        // Required
  "types"?: string[],      // Optional: Filter by work item types
  "states"?: string[],     // Optional: Filter by states
  "assignedTo"?: string    // Optional: Filter by assigned user
}
```

#### get_work_item
Get details of a specific work item.
```typescript
{
  "project": string,       // Required
  "id": number            // Required: Work item ID
}
```

#### create_work_item
Create a new work item.
```typescript
{
  "project": string,       // Required
  "type": string,         // Required: e.g., "Task", "Bug"
  "title": string,        // Required
  "description"?: string, // Optional
  "assignedTo"?: string  // Optional
}
```

### Pull Requests

#### list_pull_requests
List pull requests in a repository.
```typescript
{
  "status"?: "active" | "completed" | "abandoned"  // Optional
}
```

#### get_pull_request
Get details of a specific pull request.
```typescript
{
  "pullRequestId": number  // Required
}
```

#### create_pull_request
Create a new pull request.
```typescript
{
  "title": string,         // Required
  "description": string,   // Required
  "sourceBranch": string, // Required
  "targetBranch": string, // Required
  "reviewers"?: string[]  // Optional: Array of reviewer email addresses
}
```

#### create_pull_request_comment
Add a comment to a pull request.
```typescript
{
  "pullRequestId": number,                                      // Required
  "content": string,                                           // Required
  "threadId"?: number,                                         // Optional: For replies
  "filePath"?: string,                                         // Optional: For file comments
  "lineNumber"?: number,                                       // Optional: For line comments
  "status"?: "active"|"fixed"|"pending"|"wontfix"|"closed"    // Optional: Thread status
}
```

#### get_pull_request_diff
Get the diff for a pull request.
```typescript
{
  "pullRequestId": number,  // Required
  "filePath"?: string,     // Optional: Specific file to get diff for
  "iterationId"?: number   // Optional: Specific iteration to get diff for
}
```

### Wiki

#### create_wiki_page
Create a new wiki page.
```typescript
{
  "project": string,    // Required
  "wiki": string,      // Required
  "path": string,      // Required
  "content": string    // Required
}
```

#### edit_wiki_page
Edit an existing wiki page.
```typescript
{
  "project": string,    // Required
  "wiki": string,      // Required
  "path": string,      // Required
  "content": string,   // Required
  "etag": string       // Required: For concurrency control
}
```

## Development

Run in development mode with environment variables:
```bash
npm run dev
```

## Note

Unless explicitly specified in the tool arguments, the `project` and `repository` parameters will use default values from your environment configuration.