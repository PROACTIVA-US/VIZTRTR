/**
 * Server-side Orchestrator Agent
 *
 * This agent coordinates VIZTRTR runs with real-time progress updates
 */

import Anthropic from '@anthropic-ai/sdk';
import { VIZTRTROrchestrator } from '../../../../dist/core/orchestrator';
import { VIZTRTRConfig } from '../../../../dist/core/types';
import type { IterationUpdate, RunResult } from '../types';

export class OrchestratorServerAgent {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Start a VIZTRTR run with real-time progress callbacks
   */
  async startRun(
    runId: string,
    config: VIZTRTRConfig,
    onProgress: (update: IterationUpdate) => void
  ): Promise<RunResult> {
    try {
      // Create orchestrator with custom callbacks for progress
      const orchestrator = new VIZTRTROrchestrator(config);

      // Wrap orchestrator run with progress tracking
      const startTime = Date.now();

      onProgress({
        runId,
        iteration: 0,
        type: 'capture',
        status: 'started',
        timestamp: new Date().toISOString()
      });

      // Run VIZTRTR
      const report = await orchestrator.run();

      const duration = Date.now() - startTime;

      // Transform VIZTRTR report to RunResult
      const result: RunResult = {
        runId,
        startingScore: report.startingScore,
        finalScore: report.finalScore,
        improvement: report.improvement,
        targetReached: report.targetReached,
        totalIterations: report.totalIterations,
        duration,
        iterations: report.iterations.map((iter: any, idx: number) => ({
          iteration: idx,
          beforeScore: idx === 0 ? report.startingScore : report.iterations[idx - 1]?.evaluation?.compositeScore || 0,
          afterScore: iter.evaluation?.compositeScore || 0,
          improvement: iter.evaluation?.compositeScore
            ? (iter.evaluation.compositeScore - (idx === 0 ? report.startingScore : report.iterations[idx - 1]?.evaluation?.compositeScore || 0))
            : 0,
          beforeScreenshot: iter.beforeScreenshot?.path || '',
          afterScreenshot: iter.afterScreenshot?.path || '',
          recommendations: iter.designSpec?.recommendations?.map((r: any) => r.title) || [],
          appliedRecommendation: iter.designSpec?.recommendations?.[0]?.title,
          evaluation: {
            scores: iter.evaluation?.scores || {
              visual_hierarchy: 0,
              typography: 0,
              color_contrast: 0,
              spacing_layout: 0,
              component_design: 0,
              animation_interaction: 0,
              accessibility: 0,
              overall_aesthetic: 0
            },
            compositeScore: iter.evaluation?.compositeScore || 0
          }
        })),
        reportPath: report.reportPath
      };

      onProgress({
        runId,
        iteration: report.totalIterations,
        type: 'reflect',
        status: 'completed',
        data: result,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      onProgress({
        runId,
        iteration: 0,
        type: 'capture',
        status: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Use Claude to analyze run results
   */
  async analyzeRunResults(result: RunResult): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze these VIZTRTR run results and provide insights:

Starting Score: ${result.startingScore}
Final Score: ${result.finalScore}
Improvement: ${result.improvement}
Target Reached: ${result.targetReached}
Total Iterations: ${result.totalIterations}

Key Improvements:
${result.iterations.map(iter =>
  `- Iteration ${iter.iteration}: ${iter.beforeScore.toFixed(1)} → ${iter.afterScore.toFixed(1)} (${iter.appliedRecommendation || 'N/A'})`
).join('\n')}

Provide:
1. Summary of what worked best
2. Dimension that improved most
3. Recommendations for next run`
      }]
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : 'No analysis available';
  }
}
