# Active Context

## Current Focus

Building an Azure DevOps MCP server with the following immediate priorities:

1. Core Setup
   * Initialize TypeScript MCP server
   * Configure build process
   * Set up dependency management

2. Authentication Layer
   * PAT token validation
   * Azure DevOps client setup
   * Error handling for auth issues

3. Feature Implementation Order
   

```mermaid
   gantt
       title Implementation Timeline
       dateFormat  YYYY-MM-DD
       section Auth
       Setup PAT handling    :a1, 2025-03-21, 1d
       Client initialization :a2, after a1, 1d
       section Work Items
       List items API       :w1, after a2, 1d
       Get item details     :w2, after w1, 1d
       Create items         :w3, after w2, 1d
       section Pull Requests
       List PRs API        :p1, after w3, 1d
       Get PR details      :p2, after p1, 1d
       Create PRs          :p3, after p2, 1d
       section Wiki
       Create pages API    :k1, after p3, 1d
       Edit content        :k2, after k1, 1d
   ```

## Active Decisions

1. Authentication Strategy
   * Use PAT tokens for simplicity and security
   * Store in environment variables
   * Validate scopes on startup

2. API Integration
   * Primary: Azure DevOps Node.js SDK
   * Fallback: Direct REST API calls if needed
   * Rate limiting implementation required

3. Tool Design
   * Consistent interface patterns
   * Strong type validation
   * Comprehensive error handling

## Next Steps

1. Initial Setup
   * Create project with MCP SDK
   * Install dependencies
   * Configure TypeScript

2. Authentication
   * Implement PAT validation
   * Set up Azure DevOps client
   * Test connection

3. Core Features
   * Work Items module
   * Pull Requests module
   * Wiki module

## Current Blockers

1. Authentication Requirements
   * Need Azure DevOps organization URL
   * Need PAT token with appropriate scopes
   * Need project/repository details

2. Technical Setup
   * Requires Node.js environment
   * TypeScript configuration
   * Build process setup
