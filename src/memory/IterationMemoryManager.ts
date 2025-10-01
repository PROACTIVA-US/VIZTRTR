/**
 * Iteration Memory Manager
 *
 * Tracks what has been attempted, what worked, what failed, and why.
 * Prevents agents from repeating the same mistakes.
 */

import {
  IterationMemory,
  AttemptedRecommendation,
  FileChange,
  Recommendation,
  ScoreHistoryEntry,
} from '../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class IterationMemoryManager {
  private memory: IterationMemory;
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.memory = {
      attemptedRecommendations: [],
      successfulChanges: [],
      failedChanges: [],
      scoreHistory: [],
      plateauCount: 0,
      contextAwareness: {
        componentsModified: [],
        modificationCount: {},
      },
    };
  }

  /**
   * Record a recommendation attempt
   */
  recordAttempt(
    recommendation: Recommendation,
    iteration: number,
    status: AttemptedRecommendation['status'],
    filesModified?: string[],
    reason?: string
  ): void {
    const attempt: AttemptedRecommendation = {
      ...recommendation,
      iteration,
      status,
      filesModified,
      reason,
    };

    this.memory.attemptedRecommendations.push(attempt);

    if (status === 'failed' || status === 'broke_build') {
      this.memory.failedChanges.push({
        recommendation,
        reason: reason || 'Unknown failure',
        iteration,
      });
    }

    // Track component modification frequency
    if (filesModified) {
      filesModified.forEach((file) => {
        if (!this.memory.contextAwareness.componentsModified.includes(file)) {
          this.memory.contextAwareness.componentsModified.push(file);
        }

        const count = this.memory.contextAwareness.modificationCount[file] || 0;
        this.memory.contextAwareness.modificationCount[file] = count + 1;
      });
    }
  }

  /**
   * Record successful file changes
   */
  recordSuccessfulChanges(changes: FileChange[]): void {
    this.memory.successfulChanges.push(...changes);
  }

  /**
   * Record score progression
   */
  recordScore(entry: ScoreHistoryEntry): void {
    this.memory.scoreHistory.push(entry);

    // Detect plateau
    if (this.memory.scoreHistory.length >= 2) {
      const last = this.memory.scoreHistory[this.memory.scoreHistory.length - 1];
      const prev = this.memory.scoreHistory[this.memory.scoreHistory.length - 2];

      if (Math.abs(last.afterScore - prev.afterScore) < 0.1) {
        this.memory.plateauCount++;
      } else {
        this.memory.plateauCount = 0;
      }
    }
  }

  /**
   * Update context awareness
   */
  updateContext(context: IterationMemory['contextAwareness']['lastModifiedContext']): void {
    this.memory.contextAwareness.lastModifiedContext = context;
  }

  /**
   * Check if a recommendation has been attempted before
   */
  wasAttempted(recommendation: Recommendation): AttemptedRecommendation | undefined {
    return this.memory.attemptedRecommendations.find(
      (attempt) =>
        attempt.title.toLowerCase() === recommendation.title.toLowerCase() ||
        attempt.description.toLowerCase().includes(recommendation.title.toLowerCase())
    );
  }

  /**
   * Get recommendations that failed
   */
  getFailedRecommendations(): AttemptedRecommendation[] {
    return this.memory.attemptedRecommendations.filter(
      (attempt) => attempt.status === 'failed' || attempt.status === 'broke_build'
    );
  }

  /**
   * Get frequently modified components (potential problem areas)
   */
  getFrequentlyModifiedComponents(): Array<{ file: string; count: number }> {
    return Object.entries(this.memory.contextAwareness.modificationCount)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Is the system plateauing?
   */
  isPlateau(): boolean {
    return this.memory.plateauCount >= 2;
  }

  /**
   * Get score trend analysis
   */
  getScoreTrend(): 'improving' | 'declining' | 'plateau' | 'unknown' {
    if (this.memory.scoreHistory.length < 2) {
      return 'unknown';
    }

    const recent = this.memory.scoreHistory.slice(-3);
    const avgDelta = recent.reduce((sum, entry) => sum + entry.delta, 0) / recent.length;

    if (avgDelta > 0.2) return 'improving';
    if (avgDelta < -0.2) return 'declining';
    return 'plateau';
  }

  /**
   * Check if a component should be avoided due to repeated failures
   */
  shouldAvoidComponent(componentPath: string, threshold: number = 5): boolean {
    const modificationCount = this.memory.contextAwareness.modificationCount[componentPath] || 0;
    const failedAttempts = this.memory.attemptedRecommendations.filter(
      (rec) =>
        (rec.status === 'failed' || rec.status === 'broke_build') &&
        rec.filesModified?.some((file) => file.includes(componentPath))
    ).length;

    // If component has been modified many times with mostly failures, avoid it
    return modificationCount >= threshold && failedAttempts >= threshold - 1;
  }

  /**
   * Get list of components to avoid
   */
  getAvoidedComponents(): string[] {
    const avoided: string[] = [];
    for (const [component, count] of Object.entries(this.memory.contextAwareness.modificationCount)) {
      if (this.shouldAvoidComponent(component)) {
        avoided.push(component);
      }
    }
    return avoided;
  }

  /**
   * Generate context summary for vision agent
   */
  getContextSummary(): string {
    const failed = this.getFailedRecommendations();
    const trend = this.getScoreTrend();
    const frequentMods = this.getFrequentlyModifiedComponents().slice(0, 5);

    let summary = `ITERATION MEMORY CONTEXT:\n\n`;

    // Score trend
    summary += `Score Trend: ${trend.toUpperCase()}\n`;
    if (this.memory.scoreHistory.length > 0) {
      const latest = this.memory.scoreHistory[this.memory.scoreHistory.length - 1];
      summary += `Latest: Iteration ${latest.iteration} - ${latest.beforeScore.toFixed(1)} → ${latest.afterScore.toFixed(1)} (${latest.delta >= 0 ? '+' : ''}${latest.delta.toFixed(1)})\n`;
    }
    summary += `\n`;

    // Attempted recommendations
    summary += `ATTEMPTED RECOMMENDATIONS (${this.memory.attemptedRecommendations.length} total):\n`;
    this.memory.attemptedRecommendations.slice(-5).forEach((attempt) => {
      summary += `- [Iter ${attempt.iteration}] ${attempt.title}: ${attempt.status}`;
      if (attempt.reason) summary += ` (${attempt.reason})`;
      summary += `\n`;
    });
    summary += `\n`;

    // Failed attempts
    if (failed.length > 0) {
      summary += `FAILED ATTEMPTS - DO NOT RETRY THESE:\n`;
      failed.forEach((fail) => {
        summary += `- ${fail.title} (${fail.reason || 'Unknown reason'})\n`;
      });
      summary += `\n`;
    }

    // Frequently modified files
    if (frequentMods.length > 0) {
      summary += `FREQUENTLY MODIFIED COMPONENTS:\n`;
      frequentMods.forEach((mod) => {
        summary += `- ${mod.file}: ${mod.count} times\n`;
      });
      summary += `\n`;
    }

    // Plateau warning
    if (this.isPlateau()) {
      summary += `⚠️  PLATEAU DETECTED: Score has not improved for ${this.memory.plateauCount} iterations.\n`;
      summary += `Consider trying a different approach or UI context.\n`;
    }

    // Avoided components (meta-pattern detection)
    const avoidedComponents = this.getAvoidedComponents();
    if (avoidedComponents.length > 0) {
      summary += `\n🚫 COMPONENTS TO AVOID (Repeated Failures):\n`;
      avoidedComponents.forEach((comp) => {
        const count = this.memory.contextAwareness.modificationCount[comp];
        summary += `- ${comp}: Modified ${count} times with consistent failures\n`;
      });
      summary += `\n**CRITICAL**: Focus on OTHER UI contexts. These components are persistently problematic.\n`;
      summary += `Suggested alternative contexts: Settings Panel, Header, Library View\n`;
    }

    return summary;
  }

  /**
   * Save memory to disk
   */
  async save(): Promise<void> {
    const memoryPath = path.join(this.outputDir, 'iteration_memory.json');
    await fs.writeFile(memoryPath, JSON.stringify(this.memory, null, 2));
  }

  /**
   * Load memory from disk
   */
  async load(): Promise<void> {
    const memoryPath = path.join(this.outputDir, 'iteration_memory.json');
    try {
      const data = await fs.readFile(memoryPath, 'utf-8');
      this.memory = JSON.parse(data);
    } catch (error) {
      // No existing memory, start fresh
      console.log('   No existing memory found, starting fresh');
    }
  }

  /**
   * Get current memory state
   */
  getMemory(): IterationMemory {
    return this.memory;
  }

  /**
   * Reset memory (for testing or new projects)
   */
  reset(): void {
    this.memory = {
      attemptedRecommendations: [],
      successfulChanges: [],
      failedChanges: [],
      scoreHistory: [],
      plateauCount: 0,
      contextAwareness: {
        componentsModified: [],
        modificationCount: {},
      },
    };
  }
}
