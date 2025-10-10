/**
 * Frontend Server Manager
 * Manages frontend dev servers with proper process lifecycle and concurrency control
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

interface ServerStatus {
  running: boolean;
  url?: string;
  port?: number;
  pid?: number;
}

interface StartServerResult {
  success: boolean;
  url?: string;
  port?: number;
  pid?: number;
  error?: string;
  output?: string;
}

interface ServerConfig {
  timeout?: number; // Startup timeout in milliseconds (default: 30000)
  maxOutputLines?: number; // Max output lines to store (default: 100)
}

interface ManagedProcess {
  process: ChildProcess;
  starting: boolean;
  output: string[];
}

// Status cache to reduce redundant network requests
interface CachedStatus {
  status: ServerStatus;
  timestamp: number;
}

const STATUS_CACHE_TTL = 2000; // 2 seconds

export class FrontendServerManager {
  private runningServers: Map<string, ManagedProcess> = new Map();
  private statusCache: Map<string, CachedStatus> = new Map();
  private readonly defaultConfig: Required<ServerConfig> = {
    timeout: 30000,
    maxOutputLines: 100,
  };

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * Check if a server is running on the given URL with caching
   */
  async checkServerStatus(url: string, useCache = true): Promise<ServerStatus> {
    // Check cache first
    if (useCache) {
      const cached = this.statusCache.get(url);
      if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
        return cached.status;
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const status: ServerStatus = response.ok
        ? {
            running: true,
            url,
            port: this.extractPort(url),
          }
        : { running: false };

      // Cache the result
      this.statusCache.set(url, { status, timestamp: Date.now() });
      return status;
    } catch (error) {
      const status: ServerStatus = { running: false };
      this.statusCache.set(url, { status, timestamp: Date.now() });
      return status;
    }
  }

  /**
   * Extract port from URL
   */
  private extractPort(url: string): number | undefined {
    const portMatch = url.match(/:(\d+)/);
    return portMatch ? parseInt(portMatch[1], 10) : undefined;
  }

  /**
   * Start a frontend dev server with concurrency protection
   */
  async startServer(projectPath: string, config: ServerConfig = {}): Promise<StartServerResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    try {
      // Check for concurrent start attempts
      const existing = this.runningServers.get(projectPath);
      if (existing) {
        if (existing.starting) {
          return {
            success: false,
            error: 'Server is already starting. Please wait.',
          };
        }
        return {
          success: false,
          error: 'Server is already running. Stop it first.',
        };
      }

      // Validate project structure
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return {
          success: false,
          error: 'package.json not found in project directory',
        };
      }

      // Read package.json to get dev script
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const devScript = packageJson.scripts?.dev;

      if (!devScript) {
        return {
          success: false,
          error: 'No "dev" script found in package.json',
        };
      }

      // Detect expected port from config or script
      const expectedPort = this.detectExpectedPort(projectPath, devScript);
      if (expectedPort) {
        // Prevent VIZTRTR's reserved ports (3000, 3001, 5173)
        const RESERVED_PORTS = [3000, 3001, 5173];
        if (RESERVED_PORTS.includes(expectedPort)) {
          return {
            success: false,
            error: `Port ${expectedPort} is reserved for VIZTRTR UI. Please configure your project to use a different port (e.g., 5001, 5174, 4000).`,
          };
        }

        const portAvailable = await this.isPortAvailable(expectedPort);
        if (!portAvailable) {
          return {
            success: false,
            error: `Port ${expectedPort} is already in use. Please free the port and try again.`,
          };
        }
      }

      console.log(`[FrontendServerManager] Starting dev server at ${projectPath}`);
      console.log(`[FrontendServerManager] Running: npm run dev`);

      // Spawn the dev server process with proper cleanup handling
      // Using detached: true to create a new process group
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        shell: true,
        detached: true, // Create new process group for better cleanup
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Store process with starting flag
      const managed: ManagedProcess = {
        process: serverProcess,
        starting: true,
        output: [],
      };
      this.runningServers.set(projectPath, managed);

      // Capture output with line limits
      serverProcess.stdout?.on('data', data => {
        const lines = data.toString().split('\n');
        managed.output.push(...lines);
        // Trim to max lines
        if (managed.output.length > mergedConfig.maxOutputLines) {
          managed.output = managed.output.slice(-mergedConfig.maxOutputLines);
        }
        console.log(`[FrontendServerManager] stdout: ${data}`);
      });

      serverProcess.stderr?.on('data', data => {
        const lines = data.toString().split('\n');
        managed.output.push(...lines);
        if (managed.output.length > mergedConfig.maxOutputLines) {
          managed.output = managed.output.slice(-mergedConfig.maxOutputLines);
        }
        console.log(`[FrontendServerManager] stderr: ${data}`);
      });

      // Handle unexpected process exit
      serverProcess.on('exit', code => {
        if (code !== 0 && code !== null) {
          console.error(
            `[FrontendServerManager] Server process exited unexpectedly with code ${code}`
          );
          this.runningServers.delete(projectPath);
        }
      });

      // Wait for server to start with configurable timeout
      const started = await this.waitForServerStart(managed, mergedConfig.timeout);

      // Mark as not starting anymore
      managed.starting = false;

      if (!started.success) {
        this.stopServer(projectPath);
        return started;
      }

      // Verify server is actually reachable
      if (started.url) {
        const verified = await this.checkServerStatus(started.url, false);
        if (!verified.running) {
          console.warn(
            `[FrontendServerManager] Server started but not yet reachable at ${started.url}. Waiting...`
          );
          // Give it a few more seconds
          await new Promise(resolve => setTimeout(resolve, 3000));
          const retryVerified = await this.checkServerStatus(started.url, false);
          if (!retryVerified.running) {
            this.stopServer(projectPath);
            return {
              success: false,
              error: `Server started but is not reachable at ${started.url}`,
              output: managed.output.join('\n'),
            };
          }
        }
      }

      return {
        success: true,
        url: started.url,
        port: started.port,
        pid: serverProcess.pid,
        output: managed.output.slice(-20).join('\n'), // Return last 20 lines
      };
    } catch (error) {
      console.error('[FrontendServerManager] Error starting server:', error);
      this.runningServers.delete(projectPath);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detect expected port from vite.config, package.json, or script
   */
  private detectExpectedPort(projectPath: string, devScript: string): number | null {
    // Check vite.config
    const viteConfigPaths = [
      path.join(projectPath, 'vite.config.ts'),
      path.join(projectPath, 'vite.config.js'),
    ];

    for (const configPath of viteConfigPaths) {
      if (fs.existsSync(configPath)) {
        const config = fs.readFileSync(configPath, 'utf-8');
        const portMatch = config.match(/port:\s*(\d+)/);
        if (portMatch) {
          return parseInt(portMatch[1], 10);
        }
      }
    }

    // Check dev script for port flag
    const scriptPortMatch = devScript.match(/--port[= ](\d+)/);
    if (scriptPortMatch) {
      return parseInt(scriptPortMatch[1], 10);
    }

    return null;
  }

  /**
   * Wait for server to start and detect URL with improved patterns
   */
  private async waitForServerStart(
    managed: ManagedProcess,
    timeout: number
  ): Promise<StartServerResult> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Server startup timeout (${timeout / 1000} seconds)`,
        });
      }, timeout);

      const patterns = [
        // Vite patterns
        { regex: /Local:\s+(https?:\/\/localhost:\d+)/, group: 1 },
        { regex: /Local:\s+(https?:\/\/127\.0\.0\.1:\d+)/, group: 1 },
        // Next.js patterns
        { regex: /started server on.*?(https?:\/\/[^:]+):(\d+)/, urlFromParts: true },
        { regex: /ready.*?on (https?:\/\/[^\s]+)/, group: 1 },
        // Generic patterns
        { regex: /(https?:\/\/localhost:\d+)/, group: 1 },
        // Port-only patterns (construct URL)
        { regex: /localhost:(\d+)/, portOnly: true },
        { regex: /127\.0\.0\.1:(\d+)/, portOnly: true },
      ];

      const checkOutput = () => {
        const fullOutput = managed.output.join('\n');

        for (const pattern of patterns) {
          const match = fullOutput.match(pattern.regex);
          if (match) {
            clearTimeout(timeoutId);

            let url: string;
            let port: number;

            if (pattern.portOnly) {
              port = parseInt(match[1], 10);
              url = `http://localhost:${port}`;
            } else if (pattern.urlFromParts) {
              const host = match[1];
              port = parseInt(match[2], 10);
              url = `${host}:${port}`;
            } else {
              url = match[pattern.group!];
              const portMatch = url.match(/:(\d+)/);
              port = portMatch ? parseInt(portMatch[1], 10) : 80;
            }

            // Additional validation: check for "ready" or "compiled" indicators
            const isReady =
              fullOutput.includes('ready') ||
              fullOutput.includes('compiled') ||
              fullOutput.includes('Local:') ||
              fullOutput.includes('started server');

            if (isReady) {
              resolve({
                success: true,
                url,
                port,
                output: managed.output.join('\n'),
              });
              return;
            }
          }
        }
      };

      // Check output every 500ms
      const intervalId = setInterval(checkOutput, 500);

      managed.process.on('error', error => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve({
          success: false,
          error: error.message,
        });
      });

      managed.process.on('exit', code => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        if (code !== 0 && code !== null) {
          resolve({
            success: false,
            error: `Server process exited with code ${code}`,
            output: managed.output.join('\n'),
          });
        }
      });
    });
  }

  /**
   * Stop a running dev server with proper process group cleanup
   */
  stopServer(projectPath: string): boolean {
    const managed = this.runningServers.get(projectPath);
    if (managed) {
      console.log(`[FrontendServerManager] Stopping server at ${projectPath}`);

      try {
        // Kill the entire process group (negative PID)
        // This ensures child processes (like Vite's actual server) are also killed
        if (managed.process.pid) {
          process.kill(-managed.process.pid, 'SIGTERM');
        }

        // Fallback: kill the process directly
        managed.process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (managed.process.pid) {
            try {
              process.kill(-managed.process.pid, 'SIGKILL');
              managed.process.kill('SIGKILL');
            } catch (e) {
              // Process already dead
            }
          }
        }, 5000);
      } catch (error) {
        console.error(`[FrontendServerManager] Error killing process:`, error);
      }

      this.runningServers.delete(projectPath);
      this.statusCache.delete(projectPath);
      return true;
    }
    return false;
  }

  /**
   * Check if a server is currently starting
   */
  isServerStarting(projectPath: string): boolean {
    const managed = this.runningServers.get(projectPath);
    return managed?.starting ?? false;
  }

  /**
   * Get server output for a project
   */
  getServerOutput(projectPath: string, lastN = 50): string[] {
    const managed = this.runningServers.get(projectPath);
    if (!managed) return [];
    return managed.output.slice(-lastN);
  }

  /**
   * Get all running servers
   */
  getRunningServers(): string[] {
    return Array.from(this.runningServers.keys());
  }

  /**
   * Stop all running servers (cleanup)
   */
  stopAllServers(): void {
    console.log('[FrontendServerManager] Stopping all servers');
    for (const projectPath of this.runningServers.keys()) {
      this.stopServer(projectPath);
    }
  }
}

// Singleton instance
export const frontendServerManager = new FrontendServerManager();

// Cleanup on process exit
process.on('exit', () => {
  frontendServerManager.stopAllServers();
});

process.on('SIGINT', () => {
  frontendServerManager.stopAllServers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  frontendServerManager.stopAllServers();
  process.exit(0);
});
