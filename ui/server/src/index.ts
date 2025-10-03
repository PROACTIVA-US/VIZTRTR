/**
 * VIZTRTR UI Server
 *
 * Express server with Claude Agent SDK integration
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { VIZTRTRDatabase } from './services/database.js';
import { RunManager } from './services/runManager.js';
import { createProjectsRouter } from './routes/projects.js';
import { createRunsRouter } from './routes/runs.js';
import { createEvaluateRouter } from './routes/evaluate.js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize database
const db = new VIZTRTRDatabase(path.join(__dirname, '../viztritr.db'));

// Initialize run manager
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

const runManager = new RunManager(db, anthropicApiKey);

// Serve static files (screenshots) - check both locations
const outputDirServer = path.join(__dirname, '../viztrtr-output');
const outputDirRoot = path.join(__dirname, '../../../viztrtr-output');
app.use('/outputs', express.static(outputDirServer));
app.use('/outputs-root', express.static(outputDirRoot));

// Routes
app.use('/api/projects', createProjectsRouter(db));
app.use('/api/runs', createRunsRouter(db, runManager));
app.use('/api', createEvaluateRouter(anthropicApiKey));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'VIZTRTR UI Server',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      runs: '/api/runs',
      evaluate: '/api/evaluate-prompt'
    }
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    VIZTRTR UI SERVER                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                              ║
║  Port: ${PORT}                                                ║
║  API: http://localhost:${PORT}/api                           ║
║  Health: http://localhost:${PORT}/health                     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

export { app, db, runManager };
