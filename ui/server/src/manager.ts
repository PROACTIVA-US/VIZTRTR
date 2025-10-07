/**
 * VIZTRTR Server Manager
 * Independent process that manages the main backend server
 * Runs on port 3002 and provides start/stop/restart endpoints
 */

import express from 'express';
import cors from 'cors';
import { serverProcessManager } from './services/serverProcessManager';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check for manager itself
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'viztrtr-manager',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Get server status
app.get('/api/server/status', (req, res) => {
  try {
    const info = serverProcessManager.getInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

// Get server logs
app.get('/api/server/logs', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines as string, 10) : undefined;
    const logs = serverProcessManager.getLogs(lines);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get logs',
    });
  }
});

// Start server
app.post('/api/server/start', async (req, res) => {
  try {
    console.log('[Manager] Received start request');
    const result = await serverProcessManager.start();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start server',
    });
  }
});

// Stop server
app.post('/api/server/stop', async (req, res) => {
  try {
    console.log('[Manager] Received stop request');
    const result = await serverProcessManager.stop();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to stop server',
    });
  }
});

// Restart server
app.post('/api/server/restart', async (req, res) => {
  try {
    console.log('[Manager] Received restart request');
    const result = await serverProcessManager.restart();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to restart server',
    });
  }
});

// Start manager server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 VIZTRTR SERVER MANAGER                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                              ║
║  Port: ${PORT}                                                ║
║  API: http://localhost:${PORT}/api                           ║
║  Health: http://localhost:${PORT}/health                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  - GET  /api/server/status    - Get server status            ║
║  - GET  /api/server/logs      - Get server logs              ║
║  - POST /api/server/start     - Start backend server         ║
║  - POST /api/server/stop      - Stop backend server          ║
║  - POST /api/server/restart   - Restart backend server       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[Manager] Shutting down...');

  // Close HTTP server
  server.close(() => {
    console.log('[Manager] HTTP server closed');
  });

  // Cleanup process manager
  await serverProcessManager.cleanup();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error('[Manager] Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Manager] Unhandled rejection at:', promise, 'reason:', reason);
});
