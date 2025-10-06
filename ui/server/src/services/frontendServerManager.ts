/**
 * Frontend Server Manager
 * Checks if frontend servers are running and can auto-start them
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

export class FrontendServerManager {
  private runningServers: Map<string, ChildProcess> = new Map();

  /**
   * Check if a server is running on the given URL
   */
  async checkServerStatus(url: string): Promise<ServerStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const portMatch = url.match(/:(\d+)/);
        return {
          running: true,
          url,
          port: portMatch ? parseInt(portMatch[1], 10) : undefined,
        };
      }

      return { running: false };
    } catch (error) {
      return { running: false };
    }
  }

  /**
   * Start a frontend dev server
   */
  async startServer(projectPath: string): Promise<StartServerResult> {
    try {
      // Check if package.json exists
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

      console.log(`[FrontendServerManager] Starting dev server at ${projectPath}`);
      console.log(`[FrontendServerManager] Running: npm run dev`);

      // Spawn the dev server process
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        shell: true,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Capture output for debugging
      let output = '';
      serverProcess.stdout?.on('data', data => {
        output += data.toString();
        console.log(`[FrontendServerManager] stdout: ${data}`);
      });

      serverProcess.stderr?.on('data', data => {
        output += data.toString();
        console.log(`[FrontendServerManager] stderr: ${data}`);
      });

      // Store the process
      this.runningServers.set(projectPath, serverProcess);

      // Wait for server to start (check for common startup messages)
      const started = await this.waitForServerStart(projectPath, output, serverProcess);

      if (!started.success) {
        this.stopServer(projectPath);
        return started;
      }

      return {
        success: true,
        url: started.url,
        port: started.port,
        pid: serverProcess.pid,
        output,
      };
    } catch (error) {
      console.error('[FrontendServerManager] Error starting server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Wait for server to start and detect URL
   */
  private async waitForServerStart(
    projectPath: string,
    initialOutput: string,
    process: ChildProcess
  ): Promise<StartServerResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Server startup timeout (30 seconds)',
        });
      }, 30000);

      let output = initialOutput;

      const checkOutput = (data: Buffer) => {
        output += data.toString();

        // Look for common dev server startup messages
        // Vite: "Local:   http://localhost:5173/"
        // Next: "ready - started server on 0.0.0.0:3000"
        // CRA: "webpack compiled successfully"

        const viteMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
        const nextMatch = output.match(/started server on.*:(\d+)/);
        const portMatch = output.match(/localhost:(\d+)/);

        if (viteMatch) {
          clearTimeout(timeout);
          const url = viteMatch[1];
          const portNum = parseInt(url.match(/:(\d+)/)![1], 10);
          resolve({
            success: true,
            url,
            port: portNum,
            output,
          });
        } else if (nextMatch) {
          clearTimeout(timeout);
          const port = parseInt(nextMatch[1], 10);
          const url = `http://localhost:${port}`;
          resolve({
            success: true,
            url,
            port,
            output,
          });
        } else if (portMatch && output.includes('ready')) {
          clearTimeout(timeout);
          const port = parseInt(portMatch[1], 10);
          const url = `http://localhost:${port}`;
          resolve({
            success: true,
            url,
            port,
            output,
          });
        }
      };

      process.stdout?.on('data', checkOutput);
      process.stderr?.on('data', checkOutput);

      process.on('error', error => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message,
        });
      });

      process.on('exit', code => {
        clearTimeout(timeout);
        if (code !== 0) {
          resolve({
            success: false,
            error: `Server process exited with code ${code}`,
            output,
          });
        }
      });
    });
  }

  /**
   * Stop a running dev server
   */
  stopServer(projectPath: string): boolean {
    const process = this.runningServers.get(projectPath);
    if (process) {
      console.log(`[FrontendServerManager] Stopping server at ${projectPath}`);
      process.kill('SIGTERM');
      this.runningServers.delete(projectPath);
      return true;
    }
    return false;
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
    for (const [projectPath, process] of this.runningServers.entries()) {
      console.log(`[FrontendServerManager] Stopping server at ${projectPath}`);
      process.kill('SIGTERM');
    }
    this.runningServers.clear();
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
