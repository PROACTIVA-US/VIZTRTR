/**
 * VIZTRTR UI Server
 *
 * Express server with Claude Agent SDK integration
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { VIZTRTRDatabase } from './services/database';
import { RunManager } from './services/runManager';
import { createProjectsRouter } from './routes/projects';
import { createRunsRouter } from './routes/runs';
import { createEvaluateRouter } from './routes/evaluate';
import { createApprovalRouter, ApprovalManager } from './routes/approval';
import analyzeRouter from './routes/analyze';
import filesystemRouter from './routes/filesystem';

// Load environment variables - try multiple locations for robustness
const envPaths = [
  path.join(process.cwd(), '.env'), // Current working directory (most reliable with tsx)
  path.join(__dirname, '.env'), // Same as source dir
  path.join(__dirname, '../.env'), // ui/server/.env
  path.join(__dirname, '../../.env'), // ui/.env
  path.join(__dirname, '../../../.env'), // VIZTRTR/.env (project root)
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && result.parsed?.ANTHROPIC_API_KEY) {
    console.log(`✓ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

// Verify API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY not set - AI analysis will be unavailable');
  console.warn('   Tried loading from:', envPaths);
  console.warn('   Current working directory:', process.cwd());
  console.warn('   __dirname:', __dirname);
}

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

// Initialize approval manager
const approvalManager = new ApprovalManager();

// Initialize run manager with approval manager
const runManager = new RunManager(db, anthropicApiKey, approvalManager);

// Serve static files (screenshots) - check both locations
const outputDirServer = path.join(__dirname, '../viztrtr-output');
const outputDirRoot = path.join(__dirname, '../../../viztrtr-output');
app.use('/outputs', express.static(outputDirServer));
app.use('/outputs-root', express.static(outputDirRoot));

// Routes
app.use('/api/projects', createProjectsRouter(db));
app.use('/api/runs', createRunsRouter(db, runManager));
app.use('/api/runs', createApprovalRouter(db, approvalManager)); // Approval endpoints
app.use('/api', createEvaluateRouter(anthropicApiKey));
app.use('/api', analyzeRouter);
app.use('/api/filesystem', filesystemRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Detailed health check with component status
app.get('/api/health-detailed', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
    components: {
      database: 'ok', // Could add actual DB health check
      anthropic: anthropicApiKey ? 'configured' : 'missing',
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      },
    },
  };
  res.json(healthStatus);
});

// Restart server endpoint
app.post('/api/restart-server', (req, res) => {
  console.log('[Restart] Restarting server...');
  res.json({ message: 'Server restarting...' });

  // Give response time to send, then exit
  setTimeout(() => {
    process.exit(0); // tsx watch will automatically restart
  }, 500);
});

// Check server status (proxy to avoid CORS issues)
app.post('/api/check-server', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Try to fetch the URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
    }).catch(() => null);

    clearTimeout(timeoutId);

    res.json({ running: response !== null && response.ok });
  } catch (error) {
    res.json({ running: false });
  }
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
      evaluate: '/api/evaluate-prompt',
    },
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
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

export { app, db, runManager, approvalManager };
