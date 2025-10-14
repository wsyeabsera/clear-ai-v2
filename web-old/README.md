# Archived Frontend (web-old/)

This directory contains the previous frontend implementation that has been replaced by the new Cursor-inspired multi-agent frontend.

## New Frontend Location

The new frontend is located at: `/Users/yab/Projects/clear-ai-frontend/`

## What Changed

- **Old**: Basic single-pane interface with Material-UI
- **New**: Cursor-inspired 4-panel layout with real-time agent visualization
- **Technology**: Migrated from React + Material-UI to Next.js 14 + TailwindCSS + shadcn/ui

## Key Features of New Frontend

1. **Multi-Panel Layout**: Sessions (left) + Active Query (center) + Tool Inspector (right) + Plan Editor (bottom)
2. **Real-Time Agent Progress**: Visual cards showing Planner, Executor, Analyzer, Summarizer progress
3. **Tool Execution Inspector**: Step-by-step tool execution with parameters and results
4. **Plan Preview & Editing**: Visual plan editor with parameter modification
5. **Multi-Session Management**: Tab-based session management with persistence
6. **Performance Dashboard**: Real-time metrics and analytics
7. **WebSocket Integration**: Real-time subscriptions for all agent progress

## Migration Notes

- GraphQL queries and subscriptions have been updated to use the new schema
- State management migrated from React state to Zustand stores
- UI components migrated from Material-UI to shadcn/ui
- Added comprehensive TypeScript types for all GraphQL operations

## Archive Date

January 2025