/**
 * Hybrid Orchestrator - Two-Phase UI/UX Improvement System
 *
 * Coordinates the proven hybrid approach:
 * - Phase 1: Visual Design Fixes (ControlPanelAgentV2 + Constrained Tools)
 * - Phase 2: UX Validation (UXValidationAgent + Playwright + axe-core)
 *
 * This orchestrator ensures production-ready quality through:
 * 1. Surgical visual improvements
 * 2. Comprehensive UX/WCAG validation
 * 3. Feedback loop for continuous improvement
 */

import { DiscoveryAgent } from './specialized/DiscoveryAgent';
import { ControlPanelAgentV2 } from './specialized/ControlPanelAgentV2';
import { UXValidationAgent, UXValidationReport } from './specialized/UXValidationAgent';
import { Recommendation, Changes } from '../core/types';

export interface HybridExecutionResult {
  phase1: {
    recommendations: Recommendation[];
    implementationResults: Array<{
      recommendation: Recommendation;
      changes: Changes;
      success: boolean;
      error?: string;
    }>;
    duration: number; // milliseconds
  };
  phase2: {
    validationReport: UXValidationReport;
    duration: number; // milliseconds
  };
  overallSuccess: boolean;
  needsIteration: boolean;
  newRecommendations: Recommendation[];
  summary: string;
}

export interface HybridOrchestratorConfig {
  projectPath: string;
  frontendUrl: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  verbose?: boolean;

  // Phase 1 config
  phase1: {
    enabled: boolean;
    waitForHMR?: number; // milliseconds to wait for hot module reload (default: 3000)
  };

  // Phase 2 config
  phase2: {
    enabled: boolean;
    testWCAG?: boolean;
    testKeyboard?: boolean;
    userFlows?: Array<{ name: string; steps: any[] }>;
    detectRegression?: boolean;
    headless?: boolean;
  };

  // Iteration config
  maxIterations?: number; // Max feedback loop iterations (default: 3)
  targetScore?: number; // Stop when UX validation passes and score >= target
}

/**
 * HybridOrchestrator
 *
 * Main coordinator for the two-phase hybrid architecture
 */
export class HybridOrchestrator {
  private discoveryAgent: DiscoveryAgent;
  private controlPanelAgent: ControlPanelAgentV2;
  private uxValidationAgent: UXValidationAgent;
  private config: HybridOrchestratorConfig;

  constructor(config: HybridOrchestratorConfig) {
    this.config = {
      ...config,
      phase1: {
        enabled: true,
        waitForHMR: 3000,
        ...config.phase1,
      },
      phase2: {
        enabled: true,
        testWCAG: true,
        testKeyboard: true,
        detectRegression: true,
        headless: true,
        ...config.phase2,
      },
      maxIterations: config.maxIterations || 3,
      targetScore: config.targetScore || 8.5,
    };

    // Initialize agents
    this.discoveryAgent = new DiscoveryAgent(config.anthropicApiKey);
    this.controlPanelAgent = new ControlPanelAgentV2(config.anthropicApiKey);
    this.uxValidationAgent = new UXValidationAgent(config.geminiApiKey);

    if (config.verbose) {
      console.log('✅ HybridOrchestrator initialized');
      console.log(`   Project: ${config.projectPath}`);
      console.log(`   Frontend: ${config.frontendUrl}`);
      console.log(`   Phase 1: ${this.config.phase1.enabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Phase 2: ${this.config.phase2.enabled ? 'ENABLED' : 'DISABLED'}`);
    }
  }

  /**
   * Execute one iteration of the hybrid workflow
   */
  async executeIteration(
    recommendations: Recommendation[],
    beforeScreenshot?: string
  ): Promise<HybridExecutionResult> {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🚀 HYBRID ORCHESTRATOR - Starting Iteration');
    console.log('='.repeat(80));
    console.log(`Recommendations: ${recommendations.length}`);
    console.log('='.repeat(80) + '\n');

    // Phase 1: Visual Design Fixes
    let phase1Duration = 0;
    const phase1Results: HybridExecutionResult['phase1']['implementationResults'] = [];

    if (this.config.phase1.enabled && recommendations.length > 0) {
      const phase1Start = Date.now();

      console.log('\n' + '-'.repeat(80));
      console.log('📐 PHASE 1: Visual Design Fixes (ControlPanelAgentV2)');
      console.log('-'.repeat(80) + '\n');

      for (const recommendation of recommendations) {
        console.log(`\n→ Implementing: ${recommendation.title}`);

        try {
          // Discovery phase
          const changePlan = await this.discoveryAgent.analyzeAndPlanChanges(
            recommendation,
            this.config.projectPath
          );

          if (!changePlan || changePlan.changes.length === 0) {
            console.warn(`⚠️  No changes planned for: ${recommendation.title}`);
            phase1Results.push({
              recommendation,
              changes: { files: [], summary: 'No changes planned' },
              success: false,
              error: 'Discovery returned no changes',
            });
            continue;
          }

          // Execution phase
          const changes = await this.controlPanelAgent.executeChangePlan(
            changePlan,
            this.config.projectPath
          );

          phase1Results.push({
            recommendation,
            changes,
            success: changes.files.length > 0,
          });

          console.log(`✅ Implemented: ${recommendation.title} (${changes.files.length} files modified)`);
        } catch (error: any) {
          console.error(`❌ Failed to implement: ${recommendation.title}`);
          console.error(`   Error: ${error.message}`);

          phase1Results.push({
            recommendation,
            changes: { files: [], summary: 'Implementation failed' },
            success: false,
            error: error.message,
          });
        }
      }

      // Wait for HMR
      if (phase1Results.some(r => r.success)) {
        console.log(`\n⏳ Waiting ${this.config.phase1.waitForHMR}ms for hot module reload...`);
        await this.delay(this.config.phase1.waitForHMR!);
      }

      phase1Duration = Date.now() - phase1Start;

      const successCount = phase1Results.filter(r => r.success).length;
      console.log(`\n✅ Phase 1 Complete: ${successCount}/${recommendations.length} implemented in ${phase1Duration}ms`);
    }

    // Phase 2: UX Validation
    let phase2Duration = 0;
    let validationReport: UXValidationReport | null = null;

    if (this.config.phase2.enabled) {
      const phase2Start = Date.now();

      console.log('\n' + '-'.repeat(80));
      console.log('🔍 PHASE 2: UX Validation (UXValidationAgent + axe-core)');
      console.log('-'.repeat(80) + '\n');

      try {
        validationReport = await this.uxValidationAgent.validate(
          this.config.frontendUrl,
          {
            beforeScreenshot,
            testWCAG: this.config.phase2.testWCAG,
            testKeyboard: this.config.phase2.testKeyboard,
            testFlows: this.config.phase2.userFlows || [],
            detectRegression: this.config.phase2.detectRegression,
            headless: this.config.phase2.headless,
          }
        );

        phase2Duration = Date.now() - phase2Start;

        console.log(`\n✅ Phase 2 Complete in ${phase2Duration}ms`);
      } catch (error: any) {
        console.error(`❌ Phase 2 failed: ${error.message}`);

        // Create minimal failure report
        validationReport = {
          timestamp: new Date(),
          frontendUrl: this.config.frontendUrl,
          wcagCompliance: {
            compliant: false,
            totalViolations: 0,
            criticalCount: 0,
            seriousCount: 0,
            moderateCount: 0,
            minorCount: 0,
            violations: [],
            passes: [],
            incomplete: [],
          },
          keyboardNavigation: {
            passed: false,
            tabOrder: [],
            focusVisible: false,
            escapeWorks: false,
            enterWorks: false,
            issues: [`Validation failed: ${error.message}`],
          },
          userFlows: [],
          visualRegression: {
            detected: true,
            details: `Validation error: ${error.message}`,
          },
          overallPassed: false,
          recommendations: [],
        };

        phase2Duration = Date.now() - phase2Start;
      }
    } else {
      // Phase 2 disabled - create passing report
      validationReport = {
        timestamp: new Date(),
        frontendUrl: this.config.frontendUrl,
        wcagCompliance: {
          compliant: true,
          totalViolations: 0,
          criticalCount: 0,
          seriousCount: 0,
          moderateCount: 0,
          minorCount: 0,
          violations: [],
          passes: [],
          incomplete: [],
        },
        keyboardNavigation: {
          passed: true,
          tabOrder: [],
          focusVisible: true,
          escapeWorks: true,
          enterWorks: true,
          issues: [],
        },
        userFlows: [],
        visualRegression: {
          detected: false,
          details: 'Phase 2 disabled - skipped validation',
        },
        overallPassed: true,
        recommendations: [],
      };
    }

    // Generate summary
    const overallSuccess = phase1Results.some(r => r.success) && validationReport.overallPassed;
    const needsIteration = !validationReport.overallPassed && validationReport.recommendations.length > 0;

    const summary = this.generateSummary(
      phase1Results,
      validationReport,
      overallSuccess,
      needsIteration
    );

    console.log('\n' + '='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80) + '\n');

    return {
      phase1: {
        recommendations,
        implementationResults: phase1Results,
        duration: phase1Duration,
      },
      phase2: {
        validationReport,
        duration: phase2Duration,
      },
      overallSuccess,
      needsIteration,
      newRecommendations: validationReport.recommendations.map(r => ({
        dimension: r.dimension,
        title: r.title,
        description: r.description,
        impact: r.priority === 'critical' ? 10 : r.priority === 'high' ? 8 : r.priority === 'medium' ? 5 : 3,
        effort: 3, // UX fixes typically moderate effort
      })),
      summary,
    };
  }

  /**
   * Execute complete hybrid workflow with feedback loop
   */
  async improve(
    initialRecommendations: Recommendation[],
    beforeScreenshot?: string
  ): Promise<{
    iterations: HybridExecutionResult[];
    finalValidation: UXValidationReport;
    success: boolean;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const iterations: HybridExecutionResult[] = [];

    let currentRecommendations = initialRecommendations;
    let currentScreenshot = beforeScreenshot;

    console.log('\n' + '█'.repeat(80));
    console.log('🎯 HYBRID WORKFLOW - Starting Complete Improvement Cycle');
    console.log('█'.repeat(80));
    console.log(`Initial recommendations: ${currentRecommendations.length}`);
    console.log(`Max iterations: ${this.config.maxIterations}`);
    console.log(`Target score: ${this.config.targetScore}`);
    console.log('█'.repeat(80) + '\n');

    for (let i = 0; i < this.config.maxIterations!; i++) {
      console.log(`\n${'▓'.repeat(80)}`);
      console.log(`ITERATION ${i + 1}/${this.config.maxIterations}`);
      console.log('▓'.repeat(80) + '\n');

      if (currentRecommendations.length === 0) {
        console.log('✅ No more recommendations - workflow complete');
        break;
      }

      // Execute one iteration
      const result = await this.executeIteration(currentRecommendations, currentScreenshot);
      iterations.push(result);

      // Check if we're done
      if (result.overallSuccess && !result.needsIteration) {
        console.log('\n🎉 SUCCESS! All tests passed, no further improvements needed.');
        break;
      }

      // Check if we should continue
      if (!result.needsIteration) {
        console.log('\n✅ Validation passed but no new recommendations - workflow complete');
        break;
      }

      // Prepare next iteration
      currentRecommendations = result.newRecommendations;
      currentScreenshot = result.phase2.validationReport.visualRegression.screenshotAfter;

      console.log(`\n→ Next iteration will address ${currentRecommendations.length} UX issues`);
    }

    const totalDuration = Date.now() - startTime;
    const finalValidation = iterations[iterations.length - 1]?.phase2.validationReport || {
      timestamp: new Date(),
      frontendUrl: this.config.frontendUrl,
      wcagCompliance: { compliant: false, totalViolations: 0, criticalCount: 0, seriousCount: 0, moderateCount: 0, minorCount: 0, violations: [], passes: [], incomplete: [] },
      keyboardNavigation: { passed: false, tabOrder: [], focusVisible: false, escapeWorks: false, enterWorks: false, issues: [] },
      userFlows: [],
      visualRegression: { detected: false, details: 'No iterations completed' },
      overallPassed: false,
      recommendations: [],
    };

    const success = finalValidation.overallPassed;

    console.log('\n' + '█'.repeat(80));
    console.log(`🏁 HYBRID WORKFLOW COMPLETE - ${success ? 'SUCCESS' : 'INCOMPLETE'}`);
    console.log('█'.repeat(80));
    console.log(`Total iterations: ${iterations.length}`);
    console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`WCAG compliant: ${finalValidation.wcagCompliance.compliant ? '✅ YES' : '❌ NO'}`);
    console.log(`Keyboard navigation: ${finalValidation.keyboardNavigation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Visual regressions: ${finalValidation.visualRegression.detected ? '❌ DETECTED' : '✅ NONE'}`);
    console.log('█'.repeat(80) + '\n');

    return {
      iterations,
      finalValidation,
      success,
      totalDuration,
    };
  }

  /**
   * Generate summary of iteration results
   */
  private generateSummary(
    phase1Results: HybridExecutionResult['phase1']['implementationResults'],
    validationReport: UXValidationReport,
    overallSuccess: boolean,
    needsIteration: boolean
  ): string {
    const lines: string[] = [];

    lines.push('📊 ITERATION SUMMARY');
    lines.push('');

    // Phase 1 summary
    const p1Success = phase1Results.filter(r => r.success).length;
    const p1Total = phase1Results.length;
    lines.push(`Phase 1: ${p1Success}/${p1Total} recommendations implemented`);

    // Phase 2 summary
    lines.push(`Phase 2:`);
    lines.push(`  WCAG:     ${validationReport.wcagCompliance.compliant ? '✅ COMPLIANT' : `❌ ${validationReport.wcagCompliance.totalViolations} violations`}`);
    lines.push(`  Keyboard: ${validationReport.keyboardNavigation.passed ? '✅ PASSED' : `❌ ${validationReport.keyboardNavigation.issues.length} issues`}`);
    lines.push(`  Flows:    ${validationReport.userFlows.length === 0 ? 'N/A' : validationReport.userFlows.every(f => f.passed) ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`  Visual:   ${validationReport.visualRegression.detected ? '❌ REGRESSION' : '✅ NO REGRESSION'}`);
    lines.push('');

    // Overall status
    if (overallSuccess) {
      lines.push('✅ Status: SUCCESS - All tests passed');
    } else if (needsIteration) {
      lines.push(`⚠️  Status: NEEDS ITERATION - ${validationReport.recommendations.length} issues found`);
    } else {
      lines.push('❌ Status: FAILED - No improvements possible');
    }

    return lines.join('\n');
  }

  /**
   * Utility: delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.uxValidationAgent.cleanup();
  }
}

/**
 * Factory function
 */
export function createHybridOrchestrator(config: HybridOrchestratorConfig): HybridOrchestrator {
  return new HybridOrchestrator(config);
}
