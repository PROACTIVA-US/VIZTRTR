/**
 * Approval API Routes
 *
 * Handles human-in-the-loop approval workflow for iterations.
 * Provides REST endpoints for approval/rejection and manages approval state.
 */

import express from 'express';
import { VIZTRTRDatabase } from '../services/database';

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'skip' | 'modify';
  feedback?: string;
  reason?: string;
  modifiedRecommendations?: any[];
}

export interface PendingApproval {
  runId: string;
  iterationId: number;
  recommendations: any[];
  risk: 'low' | 'medium' | 'high';
  estimatedCost: number;
  timestamp: Date;
  resolve: (approved: boolean, data?: any) => void;
}

/**
 * Approval Manager - Manages pending approval requests
 */
export class ApprovalManager {
  private pendingApprovals = new Map<string, PendingApproval>();

  /**
   * Create a pending approval and wait for user response
   */
  async requestApproval(
    runId: string,
    iterationId: number,
    recommendations: any[],
    risk: 'low' | 'medium' | 'high',
    estimatedCost: number
  ): Promise<{ approved: boolean; feedback?: string; reason?: string }> {
    const key = `${runId}-${iterationId}`;

    return new Promise((resolve) => {
      this.pendingApprovals.set(key, {
        runId,
        iterationId,
        recommendations,
        risk,
        estimatedCost,
        timestamp: new Date(),
        resolve: (approved, data) => {
          resolve({
            approved,
            ...data,
          });
        },
      });
    });
  }

  /**
   * Respond to a pending approval request
   */
  respondToApproval(runId: string, iterationId: number, request: ApprovalRequest): boolean {
    const key = `${runId}-${iterationId}`;
    const pending = this.pendingApprovals.get(key);

    if (!pending) {
      return false; // No pending approval found
    }

    const approved = request.action === 'approve';
    const data: any = {};

    if (request.feedback) {
      data.feedback = request.feedback;
    }

    if (request.reason) {
      data.reason = request.reason;
    }

    if (request.modifiedRecommendations) {
      data.modifiedRecommendations = request.modifiedRecommendations;
    }

    // Resolve the promise
    pending.resolve(approved, data);

    // Remove from pending
    this.pendingApprovals.delete(key);

    return true;
  }

  /**
   * Get pending approval by run and iteration
   */
  getPendingApproval(runId: string, iterationId: number): PendingApproval | undefined {
    const key = `${runId}-${iterationId}`;
    return this.pendingApprovals.get(key);
  }

  /**
   * Get all pending approvals for a run
   */
  getPendingApprovalsForRun(runId: string): PendingApproval[] {
    return Array.from(this.pendingApprovals.values()).filter(
      (approval) => approval.runId === runId
    );
  }

  /**
   * Cancel all pending approvals for a run
   */
  cancelApprovalsForRun(runId: string): void {
    for (const [key, pending] of this.pendingApprovals.entries()) {
      if (pending.runId === runId) {
        pending.resolve(false, { reason: 'Run cancelled' });
        this.pendingApprovals.delete(key);
      }
    }
  }
}

/**
 * Create approval router
 */
export function createApprovalRouter(db: VIZTRTRDatabase, approvalManager: ApprovalManager) {
  const router = express.Router();

  /**
   * POST /api/runs/:runId/iterations/:iterationId/review
   * Submit approval decision for an iteration
   */
  router.post('/:runId/iterations/:iterationId/review', async (req, res) => {
    try {
      const { runId, iterationId } = req.params;
      const request: ApprovalRequest = req.body;

      // Validate request
      if (!['approve', 'reject', 'skip', 'modify'].includes(request.action)) {
        return res.status(400).json({
          error: 'Invalid action. Must be one of: approve, reject, skip, modify',
        });
      }

      // Check if there's a pending approval
      const pending = approvalManager.getPendingApproval(runId, parseInt(iterationId));
      if (!pending) {
        return res.status(404).json({
          error: 'No pending approval found for this iteration',
        });
      }

      // Respond to the approval
      const success = approvalManager.respondToApproval(
        runId,
        parseInt(iterationId),
        request
      );

      if (!success) {
        return res.status(500).json({
          error: 'Failed to process approval response',
        });
      }

      // Store approval decision in database
      await db.run(
        `INSERT INTO iteration_approvals (run_id, iteration_id, action, feedback, reason, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [runId, iterationId, request.action, request.feedback || null, request.reason || null]
      );

      res.json({
        success: true,
        action: request.action,
        runId,
        iterationId: parseInt(iterationId),
      });
    } catch (error) {
      console.error('Error processing approval:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  /**
   * GET /api/runs/:runId/iterations/:iterationId/approval-status
   * Check if approval is pending for an iteration
   */
  router.get('/:runId/iterations/:iterationId/approval-status', (req, res) => {
    try {
      const { runId, iterationId } = req.params;

      const pending = approvalManager.getPendingApproval(runId, parseInt(iterationId));

      if (!pending) {
        return res.json({
          pending: false,
        });
      }

      res.json({
        pending: true,
        runId: pending.runId,
        iterationId: pending.iterationId,
        recommendations: pending.recommendations,
        risk: pending.risk,
        estimatedCost: pending.estimatedCost,
        timestamp: pending.timestamp,
      });
    } catch (error) {
      console.error('Error checking approval status:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  /**
   * GET /api/runs/:runId/approval-history
   * Get approval history for a run
   */
  router.get('/:runId/approval-history', async (req, res) => {
    try {
      const { runId } = req.params;

      const history = await db.all(
        `SELECT * FROM iteration_approvals
         WHERE run_id = ?
         ORDER BY iteration_id ASC`,
        [runId]
      );

      res.json({ history });
    } catch (error) {
      console.error('Error fetching approval history:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  return router;
}

/**
 * Database schema for approval tracking
 *
 * Run this migration:
 *
 * CREATE TABLE IF NOT EXISTS iteration_approvals (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   run_id TEXT NOT NULL,
 *   iteration_id INTEGER NOT NULL,
 *   action TEXT NOT NULL,  -- 'approve', 'reject', 'skip', 'modify'
 *   feedback TEXT,
 *   reason TEXT,
 *   created_at TEXT NOT NULL,
 *   UNIQUE(run_id, iteration_id)
 * );
 */
