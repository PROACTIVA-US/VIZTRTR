/**
 * Server Process Manager
 * Manages the VIZTRTR backend server process (start/stop/restart)
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

interface ProcessInfo {
  pid?: number;
  status: ServerStatus;
  uptime?: number;
  startedAt?: Date;
  error?: string;
}

export class ServerProcessManager {
  private process: ChildProcess | null = null;
  private status: ServerStatus = 'stopped';
  private startedAt: Date | null = null;
  private logBuffer: string[] = [];
  private readonly maxLogLines = 100;
  private readonly serverDir: string;
  private readonly pidFile: string;

  constructor() {
    // Server directory - go up from src/services/ to ui/server/
    // When running with tsx, __dirname is /path/to/ui/server/src/services
    this.serverDir = path.join(__dirname, '..', '..');
    this.pidFile = path.join(this.serverDir, '.server.pid');

    // Check if server is already running from PID file
    this.checkExistingProcess();
  }

  /**
   * Check if a server process is already running based on PID file
   */
  private checkExistingProcess(): void {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim(), 10);

        // Check if process is actually running
        try {
          process.kill(pid, 0); // Signal 0 checks if process exists without killing it
          console.log(`[ProcessManager] Found existing server process (PID: ${pid})`);
          this.status = 'running';
          // Note: We can't get the actual process object of an external process,
          // so we just track the PID
        } catch (err) {
          // Process doesn't exist, clean up stale PID file
          fs.unlinkSync(this.pidFile);
          console.log(`[ProcessManager] Cleaned up stale PID file`);
        }
      }
    } catch (error) {
      console.error('[ProcessManager] Error checking existing process:', error);
    }
  }

  /**
   * Start the server process
   */
  async start(): Promise<{ success: boolean; message: string }> {
    if (this.status === 'running') {
      return { success: false, message: 'Server is already running' };
    }

    if (this.status === 'starting') {
      return { success: false, message: 'Server is already starting' };
    }

    this.status = 'starting';
    this.logBuffer = [];

    try {
      console.log('[ProcessManager] Starting server...');

      // Spawn the server process using tsx watch for auto-restart on changes
      this.process = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
        cwd: this.serverDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      });

      this.startedAt = new Date();

      // Save PID to file
      if (this.process.pid) {
        fs.writeFileSync(this.pidFile, this.process.pid.toString());
      }

      // Capture stdout
      this.process.stdout?.on('data', data => {
        const line = data.toString();
        this.addLog(line);
        console.log(`[Server] ${line}`);
      });

      // Capture stderr
      this.process.stderr?.on('data', data => {
        const line = data.toString();
        this.addLog(`ERROR: ${line}`);
        console.error(`[Server Error] ${line}`);
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`[ProcessManager] Server process exited (code: ${code}, signal: ${signal})`);
        this.status = code === 0 ? 'stopped' : 'error';
        this.process = null;
        this.startedAt = null;

        // Clean up PID file
        try {
          if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
          }
        } catch (err) {
          console.error('[ProcessManager] Error cleaning up PID file:', err);
        }
      });

      // Handle process errors
      this.process.on('error', error => {
        console.error('[ProcessManager] Server process error:', error);
        this.status = 'error';
        this.addLog(`PROCESS ERROR: ${error.message}`);
      });

      // Wait for server to actually be ready (check health endpoint)
      const startTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < startTimeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if process is still alive
        if (!this.process || this.process.killed) {
          this.status = 'error';
          return { success: false, message: 'Server process died during startup' };
        }

        // Try to connect to health endpoint
        try {
          const response = await fetch('http://localhost:3001/health', {
            signal: AbortSignal.timeout(2000),
          });

          if (response.ok) {
            this.status = 'running';
            console.log('[ProcessManager] Server is ready');
            return { success: true, message: 'Server started successfully' };
          }
        } catch (err) {
          // Server not ready yet, continue waiting
        }
      }

      // Timeout
      this.status = 'error';
      this.stop();
      return { success: false, message: 'Server startup timeout' };
    } catch (error) {
      this.status = 'error';
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProcessManager] Failed to start server:', message);
      return { success: false, message: `Failed to start server: ${message}` };
    }
  }

  /**
   * Stop the server process
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    if (this.status === 'stopped') {
      return { success: false, message: 'Server is not running' };
    }

    if (this.status === 'stopping') {
      return { success: false, message: 'Server is already stopping' };
    }

    this.status = 'stopping';

    try {
      console.log('[ProcessManager] Stopping server...');

      if (this.process && !this.process.killed) {
        // Try graceful shutdown first
        this.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Force kill if still running
        if (this.process && !this.process.killed) {
          console.log('[ProcessManager] Force killing server process');
          this.process.kill('SIGKILL');
        }
      } else if (fs.existsSync(this.pidFile)) {
        // Try to kill process by PID if we don't have the process object
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim(), 10);
        try {
          process.kill(pid, 'SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check if still running
          try {
            process.kill(pid, 0);
            process.kill(pid, 'SIGKILL'); // Force kill
          } catch {
            // Process already dead
          }
        } catch (error) {
          console.error('[ProcessManager] Error killing process by PID:', error);
        }

        // Clean up PID file
        fs.unlinkSync(this.pidFile);
      }

      this.process = null;
      this.startedAt = null;
      this.status = 'stopped';

      console.log('[ProcessManager] Server stopped');
      return { success: true, message: 'Server stopped successfully' };
    } catch (error) {
      this.status = 'error';
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ProcessManager] Failed to stop server:', message);
      return { success: false, message: `Failed to stop server: ${message}` };
    }
  }

  /**
   * Restart the server process
   */
  async restart(): Promise<{ success: boolean; message: string }> {
    console.log('[ProcessManager] Restarting server...');

    // Stop first
    if (this.status !== 'stopped') {
      const stopResult = await this.stop();
      if (!stopResult.success) {
        return { success: false, message: `Failed to stop: ${stopResult.message}` };
      }
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start
    return this.start();
  }

  /**
   * Get current process information
   */
  getInfo(): ProcessInfo {
    return {
      pid: this.process?.pid,
      status: this.status,
      uptime: this.startedAt
        ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
        : undefined,
      startedAt: this.startedAt || undefined,
    };
  }

  /**
   * Get recent logs
   */
  getLogs(lines?: number): string[] {
    const count = lines || this.maxLogLines;
    return this.logBuffer.slice(-count);
  }

  /**
   * Add a log line to the buffer
   */
  private addLog(line: string): void {
    this.logBuffer.push(line);

    // Keep buffer size limited
    if (this.logBuffer.length > this.maxLogLines) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogLines);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    if (this.status === 'running') {
      await this.stop();
    }
  }
}

// Singleton instance
export const serverProcessManager = new ServerProcessManager();
