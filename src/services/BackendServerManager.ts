import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface BackendConfig {
  enabled: boolean;
  url: string;
  devCommand: string;
  workingDirectory: string;
  healthCheckPath: string;
  readyTimeout: number;
  gracefulShutdownTimeout?: number; // milliseconds, default 5000
  env?: Record<string, string>;
}

// Security: Whitelist of allowed commands
const ALLOWED_COMMANDS = ['npm', 'yarn', 'pnpm', 'node', 'deno', 'bun', 'pnpx', 'npx'];

// Security: Shell metacharacters that indicate command injection attempts
const SHELL_METACHARACTERS = /[;&|`$()<>\\]/;

// Security: Allowed path prefixes
const ALLOWED_PATH_PREFIXES = ['/Users/', '/home/', '/var/'];

// Security: Whitelist of allowed environment variables
const ALLOWED_ENV_VARS = [
  'NODE_ENV',
  'DATABASE_URL',
  'LOG_LEVEL',
  'PORT',
  'HOST',
  'API_KEY',
  'DEBUG',
];

export class BackendServerManager {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private verbose: boolean;
  private killTimeout: NodeJS.Timeout | null = null;

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
    // Clean up existing process first
    if (this.process) {
      this.log('Existing process found, stopping it first...');
      await this.stop();
    }

    if (!this.config.enabled) {
      this.log('Backend server disabled, skipping...');
      return;
    }

    this.log(`Starting backend server: ${this.config.devCommand}`);
    this.log(`Working directory: ${this.config.workingDirectory}`);

    // Validate working directory exists
    const fs = await import('fs');
    const resolvedPath = path.resolve(this.config.workingDirectory);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Backend working directory does not exist: ${this.config.workingDirectory}`
      );
    }

    // Security: Validate path is within allowed prefixes
    const isAllowedPath = ALLOWED_PATH_PREFIXES.some(prefix =>
      resolvedPath.startsWith(prefix)
    );
    if (!isAllowedPath) {
      throw new Error(
        `Suspicious working directory: ${resolvedPath}. Must start with one of: ${ALLOWED_PATH_PREFIXES.join(', ')}`
      );
    }

    // Security: Check for shell metacharacters in entire command
    if (SHELL_METACHARACTERS.test(this.config.devCommand)) {
      throw new Error(
        `Command contains dangerous shell metacharacters: ${this.config.devCommand}`
      );
    }

    // Parse and validate command
    const [cmd, ...args] = this.config.devCommand.split(' ');

    // Security: Validate command is in whitelist
    if (!ALLOWED_COMMANDS.includes(cmd)) {
      throw new Error(
        `Unsafe command: ${cmd}. Only ${ALLOWED_COMMANDS.join(', ')} are allowed.`
      );
    }

    // Security: Filter environment variables
    const safeEnv = this.filterEnvVars(this.config.env ?? {});

    // Spawn process
    this.process = spawn(cmd, args, {
      cwd: resolvedPath,
      env: {
        ...process.env,
        ...safeEnv,
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

    // Use 'once' to prevent memory leaks
    this.process.once('error', (error) => {
      console.error(`[Backend Process Error] ${error.message}`);
      this.isRunning = false;
    });

    this.process.once('exit', (code) => {
      this.log(`Backend server exited with code ${code}`);
      this.isRunning = false;
      this.process = null;
      // Clear kill timeout if it exists
      if (this.killTimeout) {
        clearTimeout(this.killTimeout);
        this.killTimeout = null;
      }
    });

    // Wait for server to be ready
    await this.waitUntilReady();
    this.isRunning = true;
    this.log('✅ Backend server ready');
  }

  /**
   * Filter environment variables to whitelist
   */
  private filterEnvVars(env: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      if (ALLOWED_ENV_VARS.includes(key)) {
        filtered[key] = value;
      } else if (this.verbose) {
        console.warn(`[BackendServerManager] Filtered disallowed env var: ${key}`);
      }
    }

    return filtered;
  }

  /**
   * Wait for backend to be healthy with exponential backoff
   */
  private async waitUntilReady(): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `${this.config.url}${this.config.healthCheckPath}`;
    let lastError: Error | null = null;
    let attempt = 0;

    this.log(`Waiting for backend at ${healthUrl}...`);

    while (Date.now() - startTime < this.config.readyTimeout) {
      try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          this.log(`Backend health check passed (${res.status})`);
          return; // Server is ready
        }

        lastError = new Error(`Health check returned status ${res.status}`);
      } catch (error) {
        lastError = error as Error;
        // Not ready yet, continue polling
      }

      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s (max)
      const delay = Math.min(500 * Math.pow(2, attempt), 8000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
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

      this.process.once('exit', () => {
        this.isRunning = false;
        this.process = null;
        // Clear kill timeout if it exists
        if (this.killTimeout) {
          clearTimeout(this.killTimeout);
          this.killTimeout = null;
        }
        this.log('✅ Backend server stopped');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');

      // Force kill after configured timeout
      const timeout = this.config.gracefulShutdownTimeout ?? 5000;
      this.killTimeout = setTimeout(() => {
        if (this.process) {
          this.log('Force killing backend server (timeout)');
          this.process.kill('SIGKILL');
        }
        this.killTimeout = null;
      }, timeout);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

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
