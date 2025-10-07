# VIZTRTR UI Usage Guide

## Quick Start

### Option 1: UI-Controlled Backend (Recommended)

This method allows you to start/stop/restart the backend from the web UI.

### Step 1: Start the Manager

```bash
cd ui/server
npm run manager
```

The manager runs on port 3002 and controls the backend server.

### Step 2: Start the Frontend

```bash
cd ui/frontend
npm run dev
```

The frontend runs on port 5173.

### Step 3: Control Backend via UI

1. Open <http://localhost:5173> in your browser
2. Click the "System Status" indicator in the bottom-right corner
3. When the backend is offline, click "Start Backend"
4. The backend will start automatically on port 3001

You can now use "Restart Backend" to restart it or navigate away - the manager keeps it running.

### Option 2: Manual Backend (Traditional)

If you prefer direct control via terminal:

### Terminal 1: Backend

```bash
cd ui/server
npm run dev
```

### Terminal 2: Frontend

```bash
cd ui/frontend
npm run dev
```

No manager needed in this mode.

## System Architecture

```text
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Frontend   │ ◄─────► │   Manager    │ ◄─────► │   Backend    │
│  (port 5173)│         │  (port 3002) │         │  (port 3001) │
└─────────────┘         └──────────────┘         └──────────────┘
     │                                                    │
     └────────────────────────────────────────────────────┘
              (Direct API calls for data)
```

- **Frontend**: React UI for creating projects and monitoring runs
- **Manager**: Controls the backend process (start/stop/restart)
- **Backend**: Main API server with database and AI integration

## Features

### Project Management

- Create new UI/UX improvement projects
- Configure project settings (target score, max iterations)
- Browse project history

### Real-Time Monitoring

- Live agent status updates
- Streaming AI responses
- Progress tracking with 8-dimension scoring

### Backend Control

- Start/stop/restart backend from UI
- View backend status and uptime
- Automatic health checks

## Troubleshooting

### "Manager server not responding"

The manager (port 3002) isn't running. Start it:

```bash
cd ui/server && npm run manager
```

### "Backend API offline"

Click "Start Backend" in the System Status panel. If that fails:

1. Check manager is running (port 3002)
2. Check manager logs for errors
3. Manually start backend: `cd ui/server && npm run dev`

### Backend crashes immediately

Check for:

- Missing `ANTHROPIC_API_KEY` in `.env` file
- Port 3001 already in use
- Database permissions issues

View logs via the manager:

```bash
curl http://localhost:3002/api/server/logs
```

### Stale PID file

If manager shows "running" but backend is dead:

```bash
rm ui/server/.server.pid
```

Then restart via UI.

## Development Workflow

### Making Changes to Backend

The backend runs with `tsx watch`, so code changes trigger automatic restarts. No manual intervention needed.

### Making Changes to Frontend

Vite provides hot module replacement (HMR). Changes appear instantly in the browser.

### Testing the Manager

The manager provides a REST API for testing:

```bash
# Check manager health
curl http://localhost:3002/health

# Get backend status
curl http://localhost:3002/api/server/status

# Start backend
curl -X POST http://localhost:3002/api/server/start

# Restart backend
curl -X POST http://localhost:3002/api/server/restart

# Stop backend
curl -X POST http://localhost:3002/api/server/stop

# Get logs
curl http://localhost:3002/api/server/logs
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
PORT=3001                    # Backend port (default: 3001)
NODE_ENV=development        # Environment mode
```

## Security Notes

⚠️ **Warning**: The manager has full control over the backend process.

For production:

- Add authentication to manager endpoints
- Use firewall rules to restrict port 3002
- Consider using PM2 or systemd instead
- Never expose port 3002 to public internet

## Additional Resources

- [Manager Documentation](./server/MANAGER_README.md)
- [Backend API Documentation](./server/README.md)
- [Frontend Documentation](./frontend/README.md)
