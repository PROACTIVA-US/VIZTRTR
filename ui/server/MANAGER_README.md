# VIZTRTR Server Manager

The Server Manager is an independent process that controls the main VIZTRTR backend server,
allowing you to start, stop, and restart it from the UI.

## Architecture

- **Manager Server** (Port 3002): Independent process that manages the backend
- **Backend Server** (Port 3001): Main VIZTRTR API server (managed by the manager)
- **Frontend** (Port 5173): React UI that communicates with both servers

## Quick Start

### Start the Manager

```bash
cd ui/server
npm run manager
```

The manager will start on port 3002. It does NOT automatically start the backend - you control that from the UI.

### Start the Frontend

```bash
cd ui/frontend
npm run dev
```

The frontend will run on port 5173.

### Control the Backend

Open `http://localhost:5173` in your browser. The System Status indicator in the bottom-right will show:

- **System Offline** (red) - Backend is not running
- **System Online** (green) - Backend is running

Click the status indicator to open the control panel. When offline, click "Start Backend"
to start the server. When online, you can restart it if needed.

## How It Works

1. The **Manager Server** runs independently on port 3002
2. It provides REST endpoints to control the backend server process
3. When you click "Start Backend" in the UI:
   - Frontend calls `POST http://localhost:3002/api/server/start`
   - Manager spawns the backend process using `npx tsx watch src/index.ts`
   - Manager monitors the process and reports status
   - Backend becomes available on port 3001
4. The UI polls the backend's `/health` endpoint to confirm it's running

## Manager API Endpoints

All endpoints run on `http://localhost:3002`:

### GET /health

Health check for the manager itself.

**Response:**

```json
{
  "status": "ok",
  "service": "viztrtr-manager",
  "timestamp": "2025-10-06T...",
  "uptime": 123.456
}
```

### GET /api/server/status

Get current backend server status.

**Response:**

```json
{
  "pid": 12345,
  "status": "running",
  "uptime": 60,
  "startedAt": "2025-10-06T..."
}
```

Status values: `running`, `stopped`, `starting`, `stopping`, `error`

### GET /api/server/logs?lines=50

Get recent backend server logs.

**Response:**

```json
{
  "logs": ["Server started on port 3001", "Database connected", "..."]
}
```

### POST /api/server/start

Start the backend server.

**Response:**

```json
{
  "success": true,
  "message": "Server started successfully"
}
```

### POST /api/server/stop

Stop the backend server gracefully.

**Response:**

```json
{
  "success": true,
  "message": "Server stopped successfully"
}
```

### POST /api/server/restart

Restart the backend server (stop + start).

**Response:**

```json
{
  "success": true,
  "message": "Server started successfully"
}
```

## Process Management Details

### Server Lifecycle

1. **Starting**: Manager spawns backend process with `tsx watch`
2. **Running**: Backend responds to requests on port 3001
3. **Stopping**: Manager sends SIGTERM, waits 3s, then SIGKILL if needed
4. **Stopped**: Backend process is terminated

### Auto-Restart on Changes

The backend runs with `tsx watch`, so code changes trigger automatic restarts (managed by tsx, not the manager).

### PID Tracking

The manager stores the backend PID in `.server.pid` to track the process across manager restarts.

### Graceful Shutdown

When the manager receives SIGTERM/SIGINT:

1. Stops managing the backend (sends SIGTERM)
2. Closes HTTP server
3. Exits cleanly

## Development Workflow

### Option 1: UI-Controlled (Recommended)

```bash
# Terminal 1: Manager
cd ui/server && npm run manager

# Terminal 2: Frontend
cd ui/frontend && npm run dev

# Control backend via UI at http://localhost:5173
```

### Option 2: Manual Backend (Traditional)

```bash
# Terminal 1: Backend (manual)
cd ui/server && npm run dev

# Terminal 2: Frontend
cd ui/frontend && npm run dev

# Manager not needed in this mode
```

## Troubleshooting

### "Manager server not responding"

The manager (port 3002) is not running. Start it with:

```bash
cd ui/server && npm run manager
```

### Backend won't start

1. Check manager logs for errors
2. Ensure port 3001 is not already in use
3. Verify `ANTHROPIC_API_KEY` is set in `.env`
4. Check `GET http://localhost:3002/api/server/logs` for details

### Stale PID file

If the manager shows "running" but backend is dead:

```bash
rm ui/server/.server.pid
# Then restart via UI
```

### Backend crashes immediately

Check the logs via `GET http://localhost:3002/api/server/logs` or start manually:

```bash
cd ui/server && npm run dev
```

## Production Considerations

For production deployment, consider:

1. **Process Manager**: Use PM2 or systemd instead of tsx watch
2. **Security**: Restrict manager API access (authentication, firewall)
3. **Monitoring**: Add health checks and alerting
4. **Logging**: Implement proper log rotation and storage
5. **Multi-Instance**: For horizontal scaling, use a load balancer

## Files

- `src/manager.ts` - Manager server entry point
- `src/services/serverProcessManager.ts` - Process management logic
- `.server.pid` - Backend process ID (auto-generated)
- `package.json` - Added `manager` script

## Security Notes

⚠️ **Warning**: The manager has full control over server processes. In production:

- Run manager behind authentication
- Use firewall rules to restrict access to port 3002
- Consider using environment-based process managers instead
- Never expose port 3002 to the public internet
