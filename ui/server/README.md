# VIZTRTR UI Server

Express.js backend server with Claude Agent SDK integration for running VIZTRTR via API.

## Features

- **RESTful API** for projects and runs management
- **Server-Sent Events (SSE)** for real-time run progress
- **Claude Agent SDK** integration for intelligent orchestration
- **SQLite database** for persistent storage
- **TypeScript** for type safety

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### 3. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```

### Projects

```http
GET    /api/projects           # List all projects
GET    /api/projects/:id       # Get project
POST   /api/projects           # Create project
PATCH  /api/projects/:id       # Update project
DELETE /api/projects/:id       # Delete project
```

**Create Project Request:**
```json
{
  "name": "My Project",
  "projectPath": "/path/to/frontend",
  "frontendUrl": "http://localhost:3000",
  "targetScore": 8.5,
  "maxIterations": 5
}
```

### Runs

```http
GET  /api/runs                 # List all runs
GET  /api/runs?projectId=xxx   # List runs for project
GET  /api/runs/:id             # Get run status
GET  /api/runs/:id/result      # Get run result
POST /api/runs                 # Start new run
POST /api/runs/:id/cancel      # Cancel run
GET  /api/runs/:id/stream      # SSE stream (real-time updates)
```

**Start Run Request:**
```json
{
  "projectId": "proj_xxx"
}
```

### Real-time Updates (SSE)

Connect to `/api/runs/:id/stream` to receive real-time updates:

```javascript
const eventSource = new EventSource('http://localhost:3001/api/runs/run_xxx/stream');

eventSource.addEventListener('progress', (e) => {
  const update = JSON.parse(e.data);
  console.log('Progress:', update);
});

eventSource.addEventListener('completed', (e) => {
  const result = JSON.parse(e.data);
  console.log('Completed:', result);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  const error = JSON.parse(e.data);
  console.error('Error:', error);
  eventSource.close();
});
```

## Example Usage

### Using curl

```bash
# Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Performia",
    "projectPath": "/Users/me/Projects/Performia/frontend",
    "frontendUrl": "http://localhost:5001",
    "targetScore": 8.5,
    "maxIterations": 3
  }'

# Start a run
curl -X POST http://localhost:3001/api/runs \
  -H "Content-Type: application/json" \
  -d '{"projectId": "proj_xxx"}'

# Get run status
curl http://localhost:3001/api/runs/run_xxx

# Stream real-time updates
curl -N http://localhost:3001/api/runs/run_xxx/stream
```

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express app setup
│   ├── agents/
│   │   └── OrchestratorServerAgent.ts  # Claude Agent SDK integration
│   ├── services/
│   │   ├── database.ts       # SQLite database
│   │   └── runManager.ts     # Run lifecycle management
│   └── routes/
│       ├── projects.ts       # Projects endpoints
│       └── runs.ts           # Runs endpoints + SSE
└── viztritr.db              # SQLite database file
```

## Development

- **Watch mode:** `npm run dev` (auto-reload on changes)
- **Type check:** `npm run typecheck`
- **Build:** `npm run build`

## Database Schema

### projects
- id (TEXT PRIMARY KEY)
- name (TEXT)
- projectPath (TEXT)
- frontendUrl (TEXT)
- targetScore (REAL)
- maxIterations (INTEGER)
- createdAt (TEXT)
- updatedAt (TEXT)

### runs
- id (TEXT PRIMARY KEY)
- projectId (TEXT FOREIGN KEY)
- status (TEXT: queued|running|completed|failed|cancelled)
- currentIteration (INTEGER)
- maxIterations (INTEGER)
- startedAt (TEXT)
- completedAt (TEXT)
- error (TEXT)
- resultJson (TEXT)

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude models
- `PORT` - Server port (default: 3001)

## License

MIT
