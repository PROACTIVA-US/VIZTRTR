# VIZTRTR UI Server API Documentation

## Base URL

```
http://localhost:3001
```

## Environment Variables

### Required

- `ANTHROPIC_API_KEY` - Anthropic API key for AI analysis (required for analysis features)

### Optional

- `PORT` - Server port (default: 3001)
- `VITE_API_URL` - Frontend API URL (default: <http://localhost:3001>)

## Endpoints

### Health Check

**GET** `/health`

Returns server health status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-10-03T12:34:56.789Z",
  "version": "0.1.0"
}
```

---

### Projects

#### List Projects

**GET** `/api/projects`

Returns all projects ordered by most recently updated.

**Response:**

```json
[
  {
    "id": "proj_1234567890_abc123",
    "name": "My Project",
    "projectPath": "/Users/username/Projects/my-project",
    "workspacePath": "/path/to/viztrtr-workspaces/proj_1234567890_abc123",
    "frontendUrl": "http://localhost:3000",
    "targetScore": 8.5,
    "maxIterations": 5,
    "createdAt": "2025-10-03T12:00:00.000Z",
    "updatedAt": "2025-10-03T12:30:00.000Z",
    "hasProductSpec": true,
    "synthesizedPRD": "This project is a...",
    "projectType": "Music Performance Platform",
    "analysisConfidence": 0.95,
    "status": "analyzed"
  }
]
```

#### Get Project

**GET** `/api/projects/:id`

Returns a single project by ID.

**Response:** Same as project object above

**Errors:**

- `404` - Project not found

#### Create Project

**POST** `/api/projects`

Creates a new project.

**Request Body:**

```json
{
  "name": "My Project",
  "projectPath": "/Users/username/Projects/my-project",
  "frontendUrl": "http://localhost:3000",
  "targetScore": 8.5,  // optional, default: 8.5
  "maxIterations": 5   // optional, default: 5
}
```

**Response:** Project object with status `"created"`

**Errors:**

- `400` - Invalid request body

#### Update Project

**PATCH** `/api/projects/:id`

Updates project fields.

**Request Body:**

```json
{
  "name": "Updated Name",
  "targetScore": 9.0,
  "status": "ready"
}
```

**Response:** `204 No Content`

**Errors:**

- `404` - Project not found

#### Delete Project

**DELETE** `/api/projects/:id`

Deletes a project and all associated runs.

**Response:** `204 No Content`

**Errors:**

- `404` - Project not found

---

### AI Analysis

#### Analyze Project

**POST** `/api/projects/analyze`

Runs AI-powered analysis on a project to understand its structure, components, and purpose.

**Rate Limit:** 5 requests per minute per project

**Request Body:**

```json
{
  "projectId": "proj_1234567890_abc123",
  "projectPath": "/Users/username/Projects/my-project",
  "userProvidedPRD": "Optional PRD text (max 10,000 chars)"
}
```

**Response:**

```json
{
  "projectType": "Music Performance Platform",
  "components": [
    {
      "name": "TeleprompterView",
      "purpose": "Displays scrolling lyrics and chords for live performance",
      "uiContext": "teleprompter"
    },
    {
      "name": "LibraryManager",
      "purpose": "Manages song library and setlists",
      "uiContext": "library"
    }
  ],
  "suggestedAgents": ["TeleprompterAgent", "ControlPanelAgent", "LibraryAgent"],
  "synthesizedPRD": "This project is a comprehensive music performance platform designed for live musicians...",
  "confidence": 0.95,
  "analysisMethod": "full"
}
```

**Errors:**

- `400` - Invalid input (missing fields, invalid types, PRD too long)
- `404` - Project not found
- `429` - Rate limit exceeded (max 5 requests/minute)
- `503` - ANTHROPIC_API_KEY not configured

**Security:**

- Path validation prevents directory traversal
- Blocks access to system directories (`/etc`, `/System`, `/usr/bin`, etc.)
- Component scanning limited to 5 levels deep
- PRD text limited to 10,000 characters

---

### Runs

#### List Runs

**GET** `/api/runs?projectId=:projectId`

Returns all runs, optionally filtered by project.

**Query Parameters:**

- `projectId` (optional) - Filter runs by project ID

**Response:**

```json
[
  {
    "id": "run_1234567890_abc123",
    "projectId": "proj_1234567890_abc123",
    "status": "completed",
    "currentIteration": 3,
    "maxIterations": 5,
    "startedAt": "2025-10-03T12:00:00.000Z",
    "completedAt": "2025-10-03T12:15:00.000Z"
  }
]
```

#### Get Run

**GET** `/api/runs/:id`

Returns a single run by ID.

**Response:** Run object

**Errors:**

- `404` - Run not found

#### Start Run

**POST** `/api/runs`

Starts a new improvement run for a project.

**Request Body:**

```json
{
  "projectId": "proj_1234567890_abc123"
}
```

**Response:** Run object with status `"queued"`

**Errors:**

- `400` - Invalid project ID
- `404` - Project not found

#### Cancel Run

**POST** `/api/runs/:id/cancel`

Cancels a running iteration.

**Response:** `204 No Content`

**Errors:**

- `404` - Run not found

#### Stream Run Updates

**GET** `/api/runs/:id/stream`

Server-Sent Events (SSE) stream for real-time run updates.

**Response:** SSE stream with events:

- `iteration` - Iteration update
- `complete` - Run completed
- `error` - Run failed

**Example Event:**

```
event: iteration
data: {"runId":"run_123","iteration":1,"type":"analyze","status":"completed","timestamp":"2025-10-03T12:00:00.000Z"}
```

---

### Prompt Evaluation

#### Evaluate Prompt

**POST** `/api/evaluate-prompt`

Evaluates a user prompt to suggest agents and estimate complexity.

**Request Body:**

```json
{
  "prompt": "Build a music performance app with teleprompter",
  "type": "prompt"  // or "prd"
}
```

**Response:**

```json
{
  "suggestedAgents": [
    {
      "id": "teleprompter-1",
      "type": "teleprompter",
      "name": "Teleprompter Specialist",
      "description": "Optimizes performance view UI",
      "tasks": [
        {
          "description": "Design scrolling lyric display",
          "priority": "high"
        }
      ]
    }
  ],
  "projectType": "Music Performance Platform",
  "complexity": "moderate",
  "estimatedDuration": "2-3 hours",
  "keyFeatures": ["Teleprompter view", "Song library", "Setlist management"],
  "technicalRequirements": ["React", "TypeScript", "State management"]
}
```

**Errors:**

- `400` - Invalid request body

---

## Status Codes

- `200` - Success
- `204` - Success (no content)
- `400` - Bad request (invalid input)
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable (missing API key)

## Rate Limits

- **AI Analysis**: 5 requests per minute per project
- All other endpoints: No rate limits (currently)

## Error Response Format

All errors return JSON:

```json
{
  "error": "Error message description"
}
```
