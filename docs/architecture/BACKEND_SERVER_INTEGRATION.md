# Backend Server Integration for VIZTRTR

**Date**: October 2, 2025
**Status**: 🟡 Design Phase

## Problem Statement

Currently, VIZTRTR only tests the **frontend** by:
1. Taking screenshots
2. Analyzing visual design
3. Making CSS/UI changes

But many projects (like Performia) have **backend servers** that:
- Provide real-time data via WebSockets
- Serve API endpoints
- Handle state management
- Process business logic

**Without the backend running**, VIZTRTR can only see:
- Static UI with placeholder data
- Non-functional interactive elements
- Missing real-time updates
- Broken API calls

## Solution: Backend Server Management

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VIZTRTR Orchestrator                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼─────────┐
│  Frontend      │  │  Backend Server  │  │  Test Database   │
│  Dev Server    │  │  Manager         │  │  (Optional)      │
│                │  │                  │  │                  │
│  Port: 5001    │  │  Starts/Stops    │  │  In-Memory DB    │
│  (Performia)   │  │  Backend         │  │  for Testing     │
└────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        │                     ▼                     │
        │           ┌──────────────────┐           │
        └──────────►│  Puppeteer       │◄──────────┘
                    │  Browser Test    │
                    └──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Screenshot     │
                    │  + Interaction  │
                    │  + Real Data    │
                    └─────────────────┘
```

---

## Configuration Schema

### viztrtr-config.json

```json
{
  "projectId": "proj_xyz",
  "projectName": "Performia Living Chart",

  "frontend": {
    "url": "http://localhost:5001",
    "devCommand": "npm run dev",
    "buildCommand": "npm run build",
    "workingDirectory": "/path/to/Performia/frontend",
    "healthCheckPath": "/",
    "readyTimeout": 30000
  },

  "backend": {
    "enabled": true,
    "url": "http://localhost:3002",
    "devCommand": "npm run dev:server",
    "workingDirectory": "/path/to/Performia/backend",
    "healthCheckPath": "/health",
    "readyTimeout": 15000,
    "env": {
      "NODE_ENV": "test",
      "DATABASE_URL": "file:./test.db",
      "LOG_LEVEL": "info"
    }
  },

  "database": {
    "type": "sqlite" | "postgres" | "mysql" | "none",
    "setupCommand": "npm run db:seed:test",
    "teardownCommand": "npm run db:reset",
    "testData": "/path/to/test-data.sql"
  },

  "models": {
    "vision": {
      "provider": "anthropic",
      "model": "claude-opus-4-20250514"
    },
    "implementation": {
      "provider": "anthropic",
      "model": "claude-sonnet-4.5-20250402",
      "thinkingBudget": 2000
    },
    "evaluation": {
      "provider": "google",
      "model": "gemini-2.0-flash-exp"
    }
  },

  "testing": {
    "routes": [
      {
        "path": "/",
        "label": "Living Chart View",
        "priority": "high",
        "setupActions": [],
        "testInteractions": [
          { "type": "click", "selector": "#zoom-in", "wait": 500 },
          { "type": "click", "selector": "#toggle-legend", "wait": 500 }
        ]
      },
      {
        "path": "/control",
        "label": "Control Panel",
        "priority": "high",
        "setupActions": [
          { "type": "click", "selector": "#open-controls" }
        ],
        "testInteractions": [
          { "type": "type", "selector": "#search-input", "value": "test", "wait": 1000 }
        ]
      }
    ]
  },

  "viztrtr": {
    "targetScore": 8.5,
    "maxIterations": 5,
    "hybridScoring": {
      "enabled": true,
      "aiWeight": 0.6,
      "metricsWeight": 0.4
    },
    "cache": {
      "enabled": true,
      "ttl": 3600
    }
  }
}
```

---

## Backend Server Manager Implementation

### File: `src/services/BackendServerManager.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import fetch from 'node-fetch';

export interface BackendConfig {
  enabled: boolean;
  url: string;
  devCommand: string;
  workingDirectory: string;
  healthCheckPath: string;
  readyTimeout: number;
  env?: Record<string, string>;
}

export class BackendServerManager {
  private process: ChildProcess | null = null;
  private isRunning = false;

  constructor(private config: BackendConfig) {}

  /**
   * Start the backend server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Backend server disabled, skipping...');
      return;
    }

    console.log(`Starting backend server: ${this.config.devCommand}`);
    console.log(`Working directory: ${this.config.workingDirectory}`);

    // Parse command (e.g., "npm run dev:server" -> ["npm", "run", "dev:server"])
    const [cmd, ...args] = this.config.devCommand.split(' ');

    // Spawn process
    this.process = spawn(cmd, args, {
      cwd: path.resolve(this.config.workingDirectory),
      env: {
        ...process.env,
        ...this.config.env
      },
      stdio: 'pipe'
    });

    // Log output
    this.process.stdout?.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      console.log(`Backend server exited with code ${code}`);
      this.isRunning = false;
    });

    // Wait for server to be ready
    await this.waitUntilReady();
    this.isRunning = true;
    console.log('✅ Backend server ready');
  }

  /**
   * Wait for backend to be healthy
   */
  private async waitUntilReady(): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `${this.config.url}${this.config.healthCheckPath}`;

    while (Date.now() - startTime < this.config.readyTimeout) {
      try {
        const res = await fetch(healthUrl, { timeout: 2000 });
        if (res.ok) {
          return; // Server is ready
        }
      } catch (error) {
        // Not ready yet, continue polling
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(
      `Backend server did not become ready within ${this.config.readyTimeout}ms`
    );
  }

  /**
   * Stop the backend server
   */
  async stop(): Promise<void> {
    if (!this.process) return;

    console.log('Stopping backend server...');

    return new Promise((resolve) => {
      this.process!.on('exit', () => {
        this.isRunning = false;
        this.process = null;
        console.log('✅ Backend server stopped');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process!.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Check if backend is running
   */
  isHealthy(): boolean {
    return this.isRunning && this.process !== null;
  }
}
```

---

## Orchestrator Integration

### Updated `orchestrator.ts`:

```typescript
import { BackendServerManager } from '../services/BackendServerManager.js';

export class VIZTRTROrchestrator {
  private backendManager?: BackendServerManager;

  async run(): Promise<VIZTRTRReport> {
    // Load project config
    const projectConfig = await this.loadProjectConfig();

    // Start backend server if configured
    if (projectConfig.backend?.enabled) {
      this.backendManager = new BackendServerManager(projectConfig.backend);
      await this.backendManager.start();
    }

    try {
      // Run iterations with backend available
      const report = await this.runIterations();
      return report;
    } finally {
      // Always stop backend when done
      if (this.backendManager) {
        await this.backendManager.stop();
      }
    }
  }

  private async loadProjectConfig(): Promise<any> {
    const configPath = path.join(
      this.config.projectPath,
      '../viztrtr-config.json'
    );

    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    // No backend config, continue without it
    return { backend: { enabled: false } };
  }
}
```

---

## Enhanced Testing with Real Backend

### Before (Static Screenshots Only):
```typescript
// Take screenshot of static page
const screenshot = await page.screenshot();
```

### After (Interactive + Real Data):
```typescript
// Backend is running with test data
// Frontend connects to real WebSocket
// User interactions trigger real API calls

for (const route of config.testing.routes) {
  await page.goto(`${frontendUrl}${route.path}`);

  // Execute setup actions
  for (const action of route.setupActions || []) {
    await executeAction(page, action);
  }

  // Wait for backend data to load
  await page.waitForSelector('[data-loaded="true"]', { timeout: 5000 });

  // Take screenshot with real data
  const screenshot = await page.screenshot();

  // Test interactions
  for (const interaction of route.testInteractions || []) {
    await executeAction(page, interaction);
    await page.waitForTimeout(interaction.wait || 500);

    // Capture state after interaction
    const interactionScreenshot = await page.screenshot();
    // Analyze changes
  }
}
```

---

## Benefits

### 1. **Real Data Testing**
- See actual charts, not placeholder SVGs
- Test with realistic database content
- Verify data formatting and display

### 2. **Interactive Testing**
- Click buttons and see real responses
- Test WebSocket connections
- Verify state changes

### 3. **API Integration**
- Ensure frontend calls work
- Test error handling
- Verify loading states

### 4. **Full Stack Validation**
- Check frontend-backend compatibility
- Test CORS configuration
- Verify authentication flows

---

## Example: Performia Configuration

```json
{
  "projectName": "Performia Living Chart",

  "frontend": {
    "url": "http://localhost:5001",
    "devCommand": "npm run dev",
    "workingDirectory": "/Users/danielconnolly/Projects/Performia/frontend"
  },

  "backend": {
    "enabled": true,
    "url": "http://localhost:3002",
    "devCommand": "npm run dev",
    "workingDirectory": "/Users/danielconnolly/Projects/Performia/server",
    "healthCheckPath": "/health",
    "env": {
      "NODE_ENV": "test",
      "DATABASE_URL": "file:./test-performia.db"
    }
  },

  "database": {
    "type": "sqlite",
    "setupCommand": "npm run db:seed:test",
    "testData": "./test-data/performia-sample.sql"
  },

  "testing": {
    "routes": [
      {
        "path": "/",
        "label": "Living Chart - Main View",
        "priority": "high",
        "testInteractions": [
          { "type": "click", "selector": "#zoom-in" },
          { "type": "click", "selector": "#toggle-legend" },
          { "type": "wait", "delay": 2000 }
        ]
      }
    ]
  }
}
```

---

## UI Configuration Panel

Add to `ProjectDetailPage.tsx` Configuration tab:

```tsx
<div className="card">
  <h2 className="text-xl font-bold mb-4">Backend Server Configuration</h2>

  <div className="space-y-4">
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={backendEnabled}
        onChange={(e) => setBackendEnabled(e.target.checked)}
        className="mr-2"
      />
      <span>Enable Backend Server</span>
    </label>

    {backendEnabled && (
      <>
        <div>
          <label className="block text-sm mb-1">Backend URL</label>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://localhost:3002"
            className="w-full bg-slate-800 px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Dev Command</label>
          <input
            type="text"
            value={backendDevCommand}
            onChange={(e) => setBackendDevCommand(e.target.value)}
            placeholder="npm run dev"
            className="w-full bg-slate-800 px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Working Directory</label>
          <input
            type="text"
            value={backendWorkingDir}
            onChange={(e) => setBackendWorkingDir(e.target.value)}
            placeholder="/path/to/backend"
            className="w-full bg-slate-800 px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Health Check Path</label>
          <input
            type="text"
            value={healthCheckPath}
            onChange={(e) => setHealthCheckPath(e.target.value)}
            placeholder="/health"
            className="w-full bg-slate-800 px-3 py-2 rounded"
          />
        </div>
      </>
    )}

    <button className="btn-primary">Save Backend Configuration</button>
  </div>
</div>
```

---

## Implementation Status

- ✅ Backend configuration schema designed
- ✅ API endpoints created (`GET /api/projects/:id/config`, `PUT /api/projects/:id/config`)
- ✅ BackendServerManager class (IMPLEMENTED with security hardening)
- ✅ Orchestrator integration (IMPLEMENTED)
- ✅ UI configuration panel (IMPLEMENTED in ProjectDetailPage)
- ⏳ Test database seeding (needs implementation)

---

## Next Steps

1. **Implement BackendServerManager** - Create the service to start/stop backend servers
2. **Update Orchestrator** - Integrate backend lifecycle into run flow
3. **Add UI Configuration** - Let users configure backend settings per project
4. **Test with Performia** - Validate with real full-stack project
5. **Add Database Seeding** - Populate test data before runs

**Priority**: HIGH - This is critical for testing real full-stack applications

