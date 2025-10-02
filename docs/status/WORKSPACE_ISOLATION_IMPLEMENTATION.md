# Workspace Isolation & PRD System - Implementation Summary

## ✅ Completed

### 1. Database Schema Updates
**File**: `ui/server/src/services/database.ts`

Added tables and fields:
- **projects table**: Added `workspacePath`, `hasProductSpec` fields
- **runs table**: Added `workspacePath` field
- **iterations table**: New table for approval tracking
  - Tracks: `status` (pending/approved/rejected/archived)
  - Stores: screenshots, evaluation, files modified, rejection reasons

### 2. Type Definitions
**File**: `ui/server/src/types/productSpec.ts`

Created `VIZTRTRProductSpec` interface:
- Component-based breakdown
- User stories per component
- Design priorities and focus areas
- Acceptance criteria
- Global constraints (accessibility, performance, browser, design)

### 3. Product Spec Generator
**File**: `ui/server/src/services/productSpecGenerator.ts`

Functions:
- `generateProductSpec()` - Uses Claude Sonnet 4 to convert PRD → structured spec
- `saveProductSpec()` - Saves to workspace
- `loadProductSpec()` - Loads from workspace
- `updateProductSpec()` - Updates with versioning

### 4. PRD Analyzer Enhanced
**File**: `ui/server/src/services/prdAnalyzer.ts`

- Analyzes unstructured PRD text
- Extracts: vision, users, priorities, focus areas
- Merges with component detection

## 🚧 In Progress

### 5. Projects Route Updates
**File**: `ui/server/src/routes/projects.ts`

Need to add:
- Store PRD text when creating project
- Generate product spec if PRD provided
- Return `hasProductSpec` flag

### 6. Workspace Directory Structure
Need to create on project creation:
```
viztrtr-workspaces/{projectId}/
├── product-spec.json       # Structured spec
├── workspace/              # Iteration workspace
│   ├── iteration_1/
│   │   ├── modified/       # Changed files (NEVER touch source)
│   │   ├── before.png
│   │   ├── after.png
│   │   └── evaluation.json
│   └── iteration_2/
├── approved/               # Approved iterations
│   └── iteration_1/
└── archive/                # Compressed old iterations
    └── iteration_1.tar.gz
```

### 7. Orchestrator Integration
**File**: `src/core/orchestrator.ts`

Need to modify:
- Pass `workspacePath` instead of `projectPath` to implementation plugin
- Implementation writes to: `{workspacePath}/workspace/iteration_{N}/modified/`
- Source files remain READ-ONLY

## 📋 TODO

### API Endpoints Needed
1. `GET /api/projects/:id/spec` - Get product spec
2. `PUT /api/projects/:id/spec` - Update product spec
3. `GET /api/projects/:id/iterations` - List iterations with status
4. `POST /api/projects/:id/iterations/:iter/approve` - Approve iteration
5. `POST /api/projects/:id/iterations/:iter/reject` - Reject with reason
6. `POST /api/projects/:id/iterations/:iter/apply` - Copy to source

### UI Components Needed
1. `ProductSpecEditor` - Component tree editor
2. `IterationBrowser` - List iterations with approve/reject
3. `DiffViewer` - Side-by-side file comparison
4. `ApprovalPanel` - Approve/reject interface

### Core Logic Needed
1. **Workspace Manager Service**
   - `createWorkspace(projectId)`
   - `getIterationPath(projectId, iterationNum)`
   - `archiveIteration(projectId, iterationNum)`

2. **Approval Service**
   - `approveIteration(iterationId)` - Move to approved/
   - `rejectIteration(iterationId, reason)` - Archive immediately
   - `applyToSource(iterationId)` - Copy files to projectPath

3. **Cleanup Service**
   - Auto-archive after N days
   - Delete rejected after M days
   - Compress old iterations
   - Enforce storage quota

## Key Principles

1. **Source Protection**: `projectPath` is READ-ONLY until explicit approval
2. **Iteration Isolation**: Each iteration in separate directory
3. **Approval Required**: No automatic file copying
4. **Smart Cleanup**: Keep recent + approved, archive old
5. **PRD Evolution**: Product spec versioned, editable, syncs with discoveries

## Next Steps

1. ✅ Finish projects route integration
2. ✅ Create workspace manager service
3. ✅ Update orchestrator to use workspace
4. Build approval workflow API
5. Create iteration review UI
6. Test end-to-end on Performia
