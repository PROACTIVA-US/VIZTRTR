/**
 * Run Manager - Manages VIZTRTR run lifecycle and SSE connections
 */

import { EventEmitter } from 'events';
import { VIZTRTRDatabase } from './database';
import { OrchestratorServerAgent } from '../agents/OrchestratorServerAgent';
import { VIZTRTRConfig } from '../../../../dist/core/types';
import type { Run, IterationUpdate, RunResult, SSEMessage } from '../types';

import type { ApprovalManager } from '../routes/approval';

export class RunManager extends EventEmitter {
  private db: VIZTRTRDatabase;
  private agent: OrchestratorServerAgent;
  private activeRuns: Map<string, Promise<RunResult>> = new Map();
  private approvalManager: ApprovalManager | null = null;

  constructor(db: VIZTRTRDatabase, anthropicApiKey: string, approvalManager?: ApprovalManager) {
    super();
    this.db = db;
    this.agent = new OrchestratorServerAgent(anthropicApiKey);
    this.approvalManager = approvalManager || null;
  }

  /**
   * Start a new VIZTRTR run
   */
  async startRun(projectId: string): Promise<Run> {
    const project = this.db.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Create run record
    const run = this.db.createRun(projectId, project.maxIterations);

    // Update status to running
    this.db.updateRun(run.id, { status: 'running' });

    // Build VIZTRTR config
    const config: VIZTRTRConfig = {
      projectPath: project.projectPath,
      frontendUrl: project.frontendUrl,
      targetScore: project.targetScore,
      maxIterations: project.maxIterations,
      visionModel: 'claude-opus',
      implementationModel: 'claude-sonnet',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      screenshotConfig: {
        width: 1440,
        height: 900,
        fullPage: false
      },
      outputDir: `./viztritr-output/${run.id}`,
      verbose: true,
      // Add approval callback if approvalManager is configured
      approvalCallback: this.approvalManager
        ? async (runId, iteration, recommendations, risk, estimatedCost) => {
            // Emit SSE event for approval required
            this.emit('approval_required', runId, {
              iteration,
              recommendations,
              risk,
              estimatedCost,
            });

            // Wait for approval from ApprovalManager
            const response = await this.approvalManager!.requestApproval(
              runId,
              iteration,
              recommendations,
              risk,
              estimatedCost
            );

            return response;
          }
        : undefined,
    };

    // Start run in background
    const runPromise = this.executeRun(run.id, config);
    this.activeRuns.set(run.id, runPromise);

    // Clean up when done
    runPromise.finally(() => {
      this.activeRuns.delete(run.id);
    });

    return run;
  }

  /**
   * Execute a VIZTRTR run
   */
  private async executeRun(runId: string, config: VIZTRTRConfig): Promise<RunResult> {
    try {
      // Progress callback emits SSE events
      const onProgress = (update: IterationUpdate) => {
        this.emit('progress', runId, update);

        // Update run iteration count
        if (update.type === 'capture' && update.status === 'started') {
          this.db.updateRun(runId, { currentIteration: update.iteration });
        }
      };

      // Run VIZTRTR
      const result = await this.agent.startRun(runId, config, onProgress);

      // Save result
      this.db.saveRunResult(runId, result);

      // Update run status
      this.db.updateRun(runId, {
        status: 'completed',
        currentIteration: result.totalIterations,
        completedAt: new Date().toISOString()
      });

      // Emit completion event
      this.emit('completed', runId, result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update run status
      this.db.updateRun(runId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMessage
      });

      // Emit error event
      this.emit('error', runId, errorMessage);

      throw error;
    }
  }

  /**
   * Get run status
   */
  getRunStatus(runId: string): Run | null {
    return this.db.getRun(runId);
  }

  /**
   * Get run result
   */
  getRunResult(runId: string): RunResult | null {
    return this.db.getRunResult(runId);
  }

  /**
   * Cancel a running run
   */
  async cancelRun(runId: string): Promise<void> {
    const run = this.db.getRun(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status !== 'running') {
      throw new Error(`Run is not running: ${run.status}`);
    }

    // Note: Actual cancellation of VIZTRTR orchestrator would need to be implemented
    // For now, just mark as cancelled
    this.db.updateRun(runId, {
      status: 'cancelled',
      completedAt: new Date().toISOString()
    });

    this.emit('cancelled', runId);
  }

  /**
   * Subscribe to run updates
   */
  subscribeToRun(runId: string, callback: (message: SSEMessage) => void): () => void {
    const progressHandler = (rid: string, update: IterationUpdate) => {
      if (rid === runId) {
        callback({ event: 'progress', data: update });
      }
    };

    const completedHandler = (rid: string, result: RunResult) => {
      if (rid === runId) {
        callback({ event: 'completed', data: result });
      }
    };

    const errorHandler = (rid: string, error: string) => {
      if (rid === runId) {
        callback({ event: 'error', data: { error } });
      }
    };

    const cancelledHandler = (rid: string) => {
      if (rid === runId) {
        callback({ event: 'cancelled', data: { runId: rid } });
      }
    };

    const approvalRequiredHandler = (rid: string, data: any) => {
      if (rid === runId) {
        callback({ event: 'approval_required', data });
      }
    };

    this.on('progress', progressHandler);
    this.on('completed', completedHandler);
    this.on('error', errorHandler);
    this.on('cancelled', cancelledHandler);
    this.on('approval_required', approvalRequiredHandler);

    // Return cleanup function
    return () => {
      this.off('progress', progressHandler);
      this.off('completed', completedHandler);
      this.off('error', errorHandler);
      this.off('cancelled', cancelledHandler);
      this.off('approval_required', approvalRequiredHandler);
    };
  }
}
