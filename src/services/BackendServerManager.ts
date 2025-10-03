import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

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
  private verbose: boolean;

  constructor(
    private config: BackendConfig,
    options: { verbose?: boolean } = {}
  ) {
    this.verbose = options.verbose ?? false;
  }

  /**
   * Start the backend server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.log('Backend server disabled, skipping...');
      return;
    }

    this.log(`Starting backend server: ${this.config.devCommand}`);
    this.log(`Working directory: ${this.config.workingDirectory}`);

    // Validate working directory exists
    const fs = await import('fs');
    if (!fs.existsSync(this.config.workingDirectory)) {
      throw new Error(
        `Backend working directory does not exist: ${this.config.workingDirectory}`
      );
    }

    // Parse command (e.g., "npm run dev:server" -> ["npm", "run", "dev:server"])
    const [cmd, ...args] = this.config.devCommand.split(' ');

    // Spawn process
    this.process = spawn(cmd, args, {
      cwd: path.resolve(this.config.workingDirectory),
      env: {
        ...process.env,
        ...this.config.env,
      },
      stdio: 'pipe',
    });

    // Log output
    if (this.verbose) {
      this.process.stdout?.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`);
      });
    }

    this.process.on('error', (error) => {
      console.error(`[Backend Process Error] ${error.message}`);
      this.isRunning = false;
    });

    this.process.on('exit', (code) => {
      this.log(`Backend server exited with code ${code}`);
      this.isRunning = false;
    });

    // Wait for server to be ready
    await this.waitUntilReady();
    this.isRunning = true;
    this.log('✅ Backend server ready');
  }

  /**
   * Wait for backend to be healthy
   */
  private async waitUntilReady(): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `${this.config.url}${this.config.healthCheckPath}`;
    let lastError: Error | null = null;

    this.log(`Waiting for backend at ${healthUrl}...`);

    while (Date.now() - startTime < this.config.readyTimeout) {
      try {
        const res = await fetch(healthUrl, {
          timeout: 2000,
        } as any);

        if (res.ok) {
          this.log(`Backend health check passed (${res.status})`);
          return; // Server is ready
        }

        lastError = new Error(`Health check returned status ${res.status}`);
      } catch (error) {
        lastError = error as Error;
        // Not ready yet, continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const elapsed = Date.now() - startTime;
    throw new Error(
      `Backend server did not become ready within ${this.config.readyTimeout}ms (waited ${elapsed}ms). Last error: ${lastError?.message || 'Unknown'}`
    );
  }

  /**
   * Stop the backend server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      this.log('No backend process to stop');
      return;
    }

    this.log('Stopping backend server...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.isRunning = false;
        this.process = null;
        this.log('✅ Backend server stopped');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.log('Force killing backend server (timeout)');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Check if backend is running and healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isRunning || !this.process) {
      return false;
    }

    try {
      const healthUrl = `${this.config.url}${this.config.healthCheckPath}`;
      const res = await fetch(healthUrl, { timeout: 2000 } as any);
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backend URL
   */
  getUrl(): string {
    return this.config.url;
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[BackendServerManager] ${message}`);
    }
  }
}
