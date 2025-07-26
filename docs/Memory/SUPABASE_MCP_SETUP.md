# Supabase MCP Integration Setup

This document explains how to set up and use the Supabase MCP (Model Context Protocol) server with Claude Code for the Virgil project.

## Overview

The Supabase MCP server allows Claude to interact directly with your Supabase database through natural language commands. This is separate from the Supabase JS SDK used in the application code.

### Key Distinctions

- **Supabase JS SDK** (`@supabase/supabase-js`): Used in the application for authentication and data operations
- **Supabase MCP Server**: Allows Claude to query and manage your database directly through natural language

## Setup Instructions

### 1. Generate a Personal Access Token

1. Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
2. Click "Generate new token"
3. Give it a descriptive name like "Claude MCP - Virgil Development"
4. Copy the token (you won't be able to see it again)

### 2. Configure MCP

1. Copy `.mcp.json.example` to `.mcp.json`
2. Replace the placeholder values:
   - `SUPABASE_ACCESS_TOKEN`: Your personal access token
   - `project`: Your project reference (for Virgil: `fojjziabkohorytzikyb`)

### 3. Restart Claude Code

After configuring the MCP server, restart Claude Code to activate the integration.

## Available Capabilities

With Supabase MCP enabled, you can ask Claude to:

### Database Operations (Read)
- "Show me all tables in the database"
- "What's the schema for the users table?"
- "List all columns in the conversations table"
- "Generate TypeScript types for my database tables"

### Database Operations (Write)
- "Create a new table called user_settings with columns for preferences"
- "Add a new column 'last_active' to the users table"
- "Create an index on the conversations table for faster queries"
- "Set up a trigger to update timestamps automatically"

### Query Execution (Read)
- "Run a query to count total conversations"
- "Show me the last 10 entries in the memories table"
- "Find all users created in the last week"

### Data Modification
- "Insert a test user into the users table"
- "Update the user profile for user ID xyz"
- "Delete old conversations older than 60 days"
- "Bulk update all user preferences to enable notifications"

### Development Support
- "Show recent error logs from Supabase"
- "Explain the relationships between tables"
- "Check database performance metrics"
- "Show me the current database size"

### Advanced Operations
- "Create a database function to calculate user statistics"
- "Set up Row Level Security policies for the users table"
- "Create a storage bucket for user avatars"
- "Deploy an edge function for webhook processing"
- "Create a development branch to test schema changes"

### Documentation Access
- "Show me Supabase documentation for Row Level Security"
- "How do I set up database functions?"
- "What are the best practices for indexes?"

## Current Configuration (Development Mode)

The MCP server is configured with **full access** for development:

```json
{
  "featureGroups": [             // All features enabled
    "account",                   // Account management
    "database",                  // Database operations and schema
    "debug",                     // Debugging and logs
    "development",              // Development utilities
    "docs",                      // Documentation access
    "functions",                 // Edge functions management
    "storage",                   // Storage bucket operations
    "branching"                  // Database branching
  ]
  // readOnly: false (full write access enabled)
}
```

## Best Practices

### DO:
- Use for development insights and debugging
- Query data to understand application state
- Generate TypeScript types from database schema
- Analyze database performance
- Review error logs for troubleshooting

### DON'T:
- Use in production environments without extreme caution
- Share your personal access token
- Run destructive queries without backups
- Make schema changes without testing on a branch first
- Delete data without confirming it's backed up

## Example Queries

### Basic Schema Exploration
```
"Show me all tables in the Virgil database"
"What columns are in the user_profiles table?"
"Show me the indexes on the conversations table"
```

### Data Analysis
```
"Count the total number of stored conversations"
"Show me memory usage statistics for the database"
"List users who logged in today"
```

### Development Support
```
"Generate TypeScript interfaces for all database tables"
"Show me any recent database errors"
"What's the current database connection count?"
```

### Schema Management
```
"Create a new table for storing user preferences"
"Add a created_at timestamp to all tables that don't have one"
"Create a foreign key relationship between users and profiles"
"Set up database migrations for version control"
```

### Data Management
```
"Insert sample data for testing"
"Update all null values in the status column to 'active'"
"Clean up orphaned records in the conversations table"
"Create a backup of the current schema"
```

## Troubleshooting

### MCP Server Not Working
1. Ensure `.mcp.json` exists and has correct configuration
2. Verify your personal access token is valid
3. Restart Claude Code after configuration changes
4. Check that the project reference matches your Supabase project

### Permission Errors
- Ensure your personal access token has the necessary permissions
- Verify the project reference is correct
- With full access enabled, double-check you want to perform write operations

### Connection Issues
- Verify your internet connection
- Check Supabase service status
- Ensure the access token hasn't expired

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Management API](https://supabase.com/docs/reference/api/introduction)
- [MCP Protocol Specification](https://www.anthropic.com/news/model-context-protocol)