/**
 * Human-in-the-Loop Agent (Layer 4)
 *
 * Provides approval gates and human oversight for autonomous iterations
 */

import { Recommendation, ApprovalResponse, HumanLoopConfig } from '../core/types';
import * as readline from 'readline';

export class HumanLoopAgent {
  private config: HumanLoopConfig;

  constructor(config?: HumanLoopConfig) {
    this.config = config || {
      enabled: false,
      approvalRequired: 'never',
      costThreshold: 100, // cents
      riskThreshold: 'high',
    };
  }

  /**
   * Request human approval before implementing recommendations
   */
  async requestApproval(
    recommendations: Recommendation[],
    context: {
      iteration: number;
      risk: 'low' | 'medium' | 'high';
      estimatedCost: number;
    }
  ): Promise<ApprovalResponse> {
    // Check if approval is required
    if (!this.shouldRequestApproval(context)) {
      return { approved: true };
    }

    // Display recommendations for review
    this.displayRecommendations(recommendations, context);

    // Get user input
    const response = await this.promptUser();

    return response;
  }

  /**
   * Determine if approval is required based on config and context
   */
  private shouldRequestApproval(context: {
    iteration: number;
    risk: 'low' | 'medium' | 'high';
    estimatedCost: number;
  }): boolean {
    if (!this.config.enabled) {
      return false;
    }

    switch (this.config.approvalRequired) {
      case 'always':
        return true;
      case 'first-iteration':
        return context.iteration === 0;
      case 'high-risk':
        return context.risk === 'high' || context.estimatedCost > this.config.costThreshold;
      case 'never':
        return false;
      default:
        return false;
    }
  }

  /**
   * Display recommendations to user
   */
  private displayRecommendations(
    recommendations: Recommendation[],
    context: {
      iteration: number;
      risk: 'low' | 'medium' | 'high';
      estimatedCost: number;
    }
  ): void {
    console.log('\n' + '='.repeat(70));
    console.log('👤 HUMAN APPROVAL REQUIRED');
    console.log('='.repeat(70));

    console.log(`\n📊 Context:`);
    console.log(`   Iteration: ${context.iteration}`);
    console.log(`   Risk Level: ${context.risk.toUpperCase()}`);
    console.log(`   Estimated Cost: $${(context.estimatedCost / 100).toFixed(2)}`);

    console.log(`\n📝 Recommendations (${recommendations.length}):\n`);

    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      console.log(`   ${i + 1}. [${rec.dimension}] ${rec.title}`);
      console.log(
        `      Impact: ${rec.impact}/10 | Effort: ${rec.effort}/10 | ROI: ${(rec.impact / rec.effort).toFixed(1)}:1`
      );
      console.log(`      ${rec.description}`);
      if (rec.code) {
        const preview = rec.code.substring(0, 80);
        console.log(`      Code: ${preview}${rec.code.length > 80 ? '...' : ''}`);
      }
      console.log();
    }

    console.log('='.repeat(70));
  }

  /**
   * Prompt user for approval decision
   */
  private async promptUser(): Promise<ApprovalResponse> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question('\n👉 Approve these recommendations? (y/n/s=skip iteration): ', answer => {
        rl.close();

        const choice = answer.toLowerCase().trim();

        if (choice === 'y' || choice === 'yes') {
          console.log('✅ Approved - proceeding with implementation\n');
          resolve({ approved: true });
        } else if (choice === 's' || choice === 'skip') {
          console.log('⏭️  Skipped - moving to next iteration\n');
          resolve({
            approved: false,
            reason: 'User skipped iteration',
          });
        } else {
          console.log('❌ Rejected - ending iteration cycle\n');
          resolve({
            approved: false,
            reason: 'User rejected recommendations',
          });
        }
      });
    });
  }

  /**
   * Assess risk level based on recommendations
   */
  assessRisk(recommendations: Recommendation[]): 'low' | 'medium' | 'high' {
    // Calculate average impact and effort
    const avgImpact =
      recommendations.reduce((sum, r) => sum + r.impact, 0) / recommendations.length;
    const avgEffort =
      recommendations.reduce((sum, r) => sum + r.effort, 0) / recommendations.length;

    // High risk: high impact + high effort
    if (avgImpact >= 7 && avgEffort >= 6) {
      return 'high';
    }

    // Medium risk: moderate impact or effort
    if (avgImpact >= 5 || avgEffort >= 4) {
      return 'medium';
    }

    // Low risk: low impact and low effort
    return 'low';
  }

  /**
   * Estimate API cost for recommendations
   */
  estimateCost(recommendations: Recommendation[]): number {
    // Very rough estimate based on number of recommendations
    // Real implementation would need actual token counting
    const baselineCost = 5; // cents per recommendation
    const complexityMultiplier =
      recommendations.reduce((sum, r) => sum + r.effort, 0) / recommendations.length / 10;

    return Math.ceil(recommendations.length * baselineCost * (1 + complexityMultiplier));
  }
}
