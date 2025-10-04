/**
 * Runs API routes with SSE support
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RunManager } from '../services/runManager';
import { VIZTRTRDatabase } from '../services/database';
import type { StartRunRequest, SSEMessage } from '../types';

const StartRunSchema = z.object({
  projectId: z.string().min(1)
});

export function createRunsRouter(db: VIZTRTRDatabase, runManager: RunManager): Router {
  const router = Router();

  // List all runs (optionally filtered by project)
  router.get('/', (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const runs = db.listRuns(projectId);
      res.json(runs);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list runs'
      });
    }
  });

  // Get single run
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const run = runManager.getRunStatus(req.params.id);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      res.json(run);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get run'
      });
    }
  });

  // Get run result
  router.get('/:id/result', (req: Request, res: Response) => {
    try {
      const result = runManager.getRunResult(req.params.id);
      if (!result) {
        const run = runManager.getRunStatus(req.params.id);
        if (!run) {
          return res.status(404).json({ error: 'Run not found' });
        }
        if (run.status === 'running' || run.status === 'queued') {
          return res.status(202).json({ message: 'Run not yet completed' });
        }
        return res.status(404).json({ error: 'Run result not available' });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get run result'
      });
    }
  });

  // Start a new run
  router.post('/', async (req: Request, res: Response) => {
    try {
      const data = StartRunSchema.parse(req.body);
      const run = await runManager.startRun(data.projectId);
      res.status(201).json(run);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start run'
      });
    }
  });

  // Cancel a run
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      await runManager.cancelRun(req.params.id);
      res.json({ message: 'Run cancelled' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to cancel run'
      });
    }
  });

  // Server-Sent Events for real-time updates
  router.get('/:id/stream', (req: Request, res: Response) => {
    const runId = req.params.id;

    // Verify run exists
    const run = runManager.getRunStatus(runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ event: 'connected', data: { runId } })}\n\n`);

    // Subscribe to run updates
    const unsubscribe = runManager.subscribeToRun(runId, (message: SSEMessage) => {
      res.write(`event: ${message.event}\n`);
      res.write(`data: ${JSON.stringify(message.data)}\n\n`);

      // Close connection on completion or error
      if (message.event === 'completed' || message.event === 'error' || message.event === 'cancelled') {
        setTimeout(() => {
          res.end();
        }, 1000); // Give client time to receive final message
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
    });

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    // Clean up heartbeat on response end
    res.on('finish', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}
