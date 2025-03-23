# Azure DevOps MCP Server Guide

**Note:** Unless explicitly specified, the `project` and `repository` parameters will use default values from environment configuration.

## Work Items

### list_work_items
- Required: `project`
- Optional: `types[]`, `states[]`, `assignedTo`

### get_work_item
- Required: `project`, `id`

### create_work_item
- Required: `project`, `type`, `title`
- Optional: `description`, `assignedTo`

## Pull Requests

### list_pull_requests
- Required: `project`, `repository`
- Optional: `status` (enum: "active"|"completed"|"abandoned")

### get_pull_request
- Required: `project`, `repository`, `pullRequestId`

### create_pull_request
- Required: `project`, `repository`, `title`, `description`, `sourceBranch`, `targetBranch`
- Optional: `reviewers[]`

### create_pull_request_comment
- Required: `project`, `repository`, `pullRequestId`, `content`
- Optional:
  - `threadId` (for replies)
  - `filePath` (for file comments)
  - `lineNumber` (for line comments)
  - `status` (enum: "active"|"fixed"|"pending"|"wontfix"|"closed")

### get_pull_request_diff
- Required: `project`, `repository`, `pullRequestId`
- Optional: `filePath`, `iterationId`

## Wiki

### create_wiki_page
- Required: `project`, `wiki`, `path`, `content`

### edit_wiki_page
- Required: `project`, `wiki`, `path`, `content`, `etag`

## Usage Pattern

```typescript
<use_mcp_tool>
<server_name>azure-devops</server_name>
<tool_name>tool_name_here</tool_name>
<arguments>
{
  // required and optional parameters as defined above
}
</arguments>
</use_mcp_tool>
