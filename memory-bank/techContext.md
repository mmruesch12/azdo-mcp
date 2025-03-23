# Technical Context

## Core Technologies

* TypeScript/Node.js
* Azure DevOps REST API v7.0
* MCP SDK
* Azure DevOps Node.js SDK (@azure/devops-node-api)

## Authentication

Azure DevOps requires Personal Access Tokens (PAT) for API authentication:
* Token must be generated from Azure DevOps account
* Requires specific scopes:
  + Work Items (read, write)
  + Pull Requests (read, write)
  + Wiki (read, write)

## Development Setup

1. Node.js environment
2. TypeScript configuration
3. MCP SDK integration
4. Azure DevOps SDK integration

## Dependencies

* @modelcontextprotocol/sdk
* @azure/devops-node-api
* axios (for direct API calls if needed)
* zod (for runtime type validation)
