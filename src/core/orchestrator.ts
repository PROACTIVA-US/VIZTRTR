/**
 * VIZTRTR Core Orchestrator
 *
 * Coordinates iteration cycles: capture → analyze → implement → evaluate → repeat
 */

import {
  VIZTRTRConfig,
  IterationReport,
  IterationResult,
  Screenshot,
  DesignSpec,
  Changes,
  EvaluationResult,
} from './types';
import { ClaudeOpusVisionPlugin } from '../plugins/vision-claude';
import { HybridScoringAgent } from '../agents/HybridScoringAgent';
import { PuppeteerCapturePlugin } from '../plugins/capture-puppeteer';
import { IterationMemoryManager } from '../memory/IterationMemoryManager';
import { VerificationAgent } from '../agents/VerificationAgent';
import { ReflectionAgent } from '../agents/ReflectionAgent';
import { OrchestratorAgent } from '../agents/OrchestratorAgent';
import { RecommendationFilterAgent } from '../agents/RecommendationFilterAgent';
import { HumanLoopAgent } from '../agents/HumanLoopAgent';
import { BackendServerManager, BackendConfig } from '../services/BackendServerManager';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VIZTRTROrchestrator {
  private config: VIZTRTRConfig;
  private visionPlugin: ClaudeOpusVisionPlugin;
  private orchestratorAgent: OrchestratorAgent;
  private capturePlugin: PuppeteerCapturePlugin;
  private memory: IterationMemoryManager;
  private verificationAgent: VerificationAgent;
  private reflectionAgent: ReflectionAgent;
  private filterAgent: RecommendationFilterAgent;
  private humanLoopAgent: HumanLoopAgent;
  private hybridScoringAgent: HybridScoringAgent | null = null;
  private backendManager: BackendServerManager | null = null;
  private iterations: IterationResult[] = [];
  private startTime: Date | null = null;

  constructor(config: VIZTRTRConfig) {
    this.config = config;

    // Initialize plugins
    this.visionPlugin = new ClaudeOpusVisionPlugin(config.anthropicApiKey!);
    this.orchestratorAgent = new OrchestratorAgent(config.anthropicApiKey!);
    this.capturePlugin = new PuppeteerCapturePlugin();

    // Initialize memory and agents
    this.memory = new IterationMemoryManager(config.outputDir);
    this.verificationAgent = new VerificationAgent(config.projectPath);
    this.reflectionAgent = new ReflectionAgent(config.anthropicApiKey!);
    this.filterAgent = new RecommendationFilterAgent();
    this.humanLoopAgent = new HumanLoopAgent(config.humanLoop);

    // Initialize hybrid scoring if enabled
    if (config.useChromeDevTools) {
      const visionWeight = config.scoringWeights?.vision ?? 0.6;
      const metricsWeight = config.scoringWeights?.metrics ?? 0.4;
      this.hybridScoringAgent = new HybridScoringAgent(
        config.anthropicApiKey!,
        visionWeight,
        metricsWeight
      );
    }

    // Ensure output directory exists
    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  async run(): Promise<IterationReport> {
    this.startTime = new Date();
    console.log('🚀 Starting VIZTRTR iteration cycle...');
    console.log(`   Target Score: ${this.config.targetScore}/10`);
    console.log(`   Max Iterations: ${this.config.maxIterations}`);
    console.log(`   Output: ${this.config.outputDir}\n`);

    // Load project config (including backend configuration)
    const projectConfig = await this.loadProjectConfig();

    // Start backend server if configured
    if (projectConfig?.backend?.enabled) {
      console.log('🔧 Backend server enabled, starting...');
      this.backendManager = new BackendServerManager(projectConfig.backend, { verbose: this.config.verbose });

      try {
        await this.backendManager.start();
      } catch (error) {
        console.error('❌ Failed to start backend server:', error);
        throw new Error(`Backend server failed to start: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Load existing memory
    console.log('📚 Loading iteration memory...');
    await this.memory.load();

    try {
      let currentScore = 0;
      let iteration = 0;

      while (iteration < this.config.maxIterations) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📍 ITERATION ${iteration + 1}/${this.config.maxIterations}`);
        console.log(`${'='.repeat(70)}\n`);

        // Run iteration
        const result = await this.runIteration(iteration);
        this.iterations.push(result);

        currentScore = result.evaluation.compositeScore;

        console.log(`\n📊 Iteration ${iteration + 1} Complete:`);
        console.log(`   Score: ${currentScore.toFixed(1)}/10`);
        console.log(`   Delta: ${result.scoreDelta > 0 ? '+' : ''}${result.scoreDelta.toFixed(1)}`);
        console.log(`   Target: ${this.config.targetScore}/10`);

        // Check stopping criteria
        if (result.targetReached) {
          console.log(`\n🎉 Target score reached!`);
          break;
        }

        // Check for diminishing returns
        if (iteration > 0 && Math.abs(result.scoreDelta) < 0.1) {
          console.log(`\n⚠️  Score plateau detected, continuing...`);
        }

        iteration++;
      }

      // Generate final report
      const report = await this.generateReport();

      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ VIZTRTR COMPLETE`);
      console.log(`${'='.repeat(70)}`);
      console.log(
        `   Starting Score: ${this.iterations[0]?.designSpec.currentScore.toFixed(1) || 0}/10`
      );
      console.log(`   Final Score: ${currentScore.toFixed(1)}/10`);
      console.log(
        `   Improvement: +${(currentScore - (this.iterations[0]?.designSpec.currentScore || 0)).toFixed(1)}`
      );
      console.log(`   Iterations: ${this.iterations.length}`);
      console.log(`   Report: ${report.reportPath}\n`);

      return report;
    } finally {
      // Stop backend server if running
      if (this.backendManager) {
        await this.backendManager.stop();
      }
      await this.cleanup();
    }
  }

  /**
   * Load project configuration from workspace
   */
  private async loadProjectConfig(): Promise<any> {
    // Try to find viztrtr-config.json in project directory or parent
    const possiblePaths = [
      path.join(this.config.projectPath, 'viztrtr-config.json'),
      path.join(this.config.projectPath, '..', 'viztrtr-config.json'),
      path.join(this.config.outputDir, 'viztrtr-config.json'),
    ];

    for (const configPath of possiblePaths) {
      try {
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        if (exists) {
          const content = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(content);
          console.log(`📋 Loaded project config from: ${configPath}`);
          return config;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // No config found, return empty config
    console.log('📋 No project config found, continuing without backend server');
    return { backend: { enabled: false } };
  }

  private async runIteration(iterationNum: number): Promise<IterationResult> {
    const iterationDir = path.join(this.config.outputDir, `iteration_${iterationNum}`);
    await fs.mkdir(iterationDir, { recursive: true });

    // Step 1: Capture before screenshot
    console.log('📸 Step 1: Capturing before screenshot...');
    const beforeScreenshot = await this.capturePlugin.captureScreenshot(
      this.config.frontendUrl,
      this.config.screenshotConfig
    );

    // Save to iteration dir
    const beforePath = path.join(iterationDir, 'before.png');
    if (beforeScreenshot.path) {
      await fs.copyFile(beforeScreenshot.path, beforePath);
      beforeScreenshot.path = beforePath;
    }

    // Step 2: Analyze with vision model + memory context (Layer 1)
    console.log('🔍 Step 2: Analyzing UI with memory context...');
    const memoryContext = this.memory.getContextSummary();
    console.log('\n' + memoryContext);

    const avoidedComponents = this.memory.getAvoidedComponents();
    const designSpec = await this.visionPlugin.analyzeScreenshot(
      beforeScreenshot,
      memoryContext,
      this.config.projectContext,
      avoidedComponents
    );
    designSpec.iteration = iterationNum;

    // Save design spec
    const specPath = path.join(iterationDir, 'design_spec.json');
    await fs.writeFile(specPath, JSON.stringify(designSpec, null, 2));

    console.log(`   Current Score: ${designSpec.currentScore}/10`);
    console.log(`   Issues Found: ${designSpec.currentIssues.length}`);
    console.log(`   Recommendations: ${designSpec.recommendations.length}`);

    // Step 2.5: Filter recommendations (Layer 2)
    const filtered = this.filterAgent.filterRecommendations(
      designSpec.recommendations,
      this.memory
    );
    this.filterAgent.logResults(filtered);

    if (filtered.approved.length === 0) {
      throw new Error('All recommendations were filtered out. Cannot proceed with iteration.');
    }

    // Update design spec with approved recommendations only
    designSpec.recommendations = filtered.approved;
    designSpec.prioritizedChanges = filtered.approved;

    // Step 2.6: Human approval gate (Layer 4)
    const risk = this.humanLoopAgent.assessRisk(filtered.approved);
    const estimatedCost = this.humanLoopAgent.estimateCost(filtered.approved);

    const approval = await this.humanLoopAgent.requestApproval(filtered.approved, {
      iteration: iterationNum,
      risk,
      estimatedCost,
    });

    if (!approval.approved) {
      throw new Error(`Human approval denied: ${approval.reason || 'No reason provided'}`);
    }

    // Step 3: Implement changes
    console.log('🔧 Step 3: Implementing changes...');
    const changes = await this.implementChanges(designSpec);

    // Save changes
    const changesPath = path.join(iterationDir, 'changes.json');
    await fs.writeFile(changesPath, JSON.stringify(changes, null, 2));

    console.log(`   Files Modified: ${changes.files.length}`);

    // Step 4: Verify implementation
    console.log('🔍 Step 4: Verifying implementation...');
    const verification = await this.verificationAgent.verify(changes);

    // If verification failed critically, record and potentially rollback
    if (!verification.buildSucceeded) {
      console.error('   ❌ Build failed! Recording failure and rolling back...');

      // Record failed attempts
      for (const rec of designSpec.prioritizedChanges) {
        this.memory.recordAttempt(
          rec,
          iterationNum,
          'broke_build',
          changes.files.map(f => f.path),
          'Build failed after implementation'
        );
      }

      // Rollback changes
      await this.rollbackChanges(changes);

      // Save memory
      await this.memory.save();

      // Continue with next iteration (before screenshot will show reverted state)
      throw new Error('Build failed - changes rolled back');
    }

    // Step 5: Wait for rebuild (if dev server is running, it should hot-reload)
    console.log('⏳ Step 5: Waiting for rebuild...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

    // Step 6: Capture after screenshot
    console.log('📸 Step 5: Capturing after screenshot...');
    const afterScreenshot = await this.capturePlugin.captureScreenshot(
      this.config.frontendUrl,
      this.config.screenshotConfig
    );

    const afterPath = path.join(iterationDir, 'after.png');
    if (afterScreenshot.path) {
      await fs.copyFile(afterScreenshot.path, afterPath);
      afterScreenshot.path = afterPath;
    }

    // Step 7: Evaluate (with hybrid scoring if enabled)
    console.log('📊 Step 7: Evaluating result...');
    const evaluation = await this.evaluate(afterScreenshot);

    // Hybrid scoring (if enabled)
    let hybridScore;
    if (this.hybridScoringAgent) {
      console.log('🔬 Running hybrid scoring analysis...');
      const result = await this.hybridScoringAgent.score(afterScreenshot, this.config.frontendUrl);
      hybridScore = {
        compositeScore: result.compositeScore,
        visionScore: result.visionScore,
        metricsScore: result.metricsScore,
        confidence: result.confidence,
        metricsBreakdown: {
          performance: result.metrics?.performance || 0,
          accessibility: result.metrics?.accessibility || 0,
          bestPractices: result.metrics?.bestPractices || 0
        }
      };
      console.log(`   Hybrid Score: ${result.compositeScore.toFixed(1)}/10 (confidence: ${(result.confidence * 100).toFixed(0)}%)`);

      // Use hybrid composite score as the primary evaluation score
      evaluation.compositeScore = result.compositeScore;
    }

    // Save evaluation
    const evalPath = path.join(iterationDir, 'evaluation.json');
    await fs.writeFile(evalPath, JSON.stringify(evaluation, null, 2));

    const previousScore =
      iterationNum > 0
        ? this.iterations[iterationNum - 1].evaluation.compositeScore
        : designSpec.currentScore;

    const scoreDelta = evaluation.compositeScore - previousScore;

    // Step 8: Reflect on results
    console.log('🤔 Step 8: Reflecting on iteration...');
    const reflection = await this.reflectionAgent.reflect(
      iterationNum,
      designSpec,
      changes,
      verification,
      previousScore,
      evaluation.compositeScore,
      this.memory.getMemory()
    );

    // Save reflection
    const reflectionPath = path.join(iterationDir, 'reflection.json');
    await fs.writeFile(reflectionPath, JSON.stringify(reflection, null, 2));

    // Step 9: Update memory
    console.log('💾 Step 9: Updating iteration memory...');

    // Record attempts
    const status = verification.success && scoreDelta > 0 ? 'success' :
                   verification.success && scoreDelta === 0 ? 'no_effect' : 'failed';

    for (const rec of designSpec.prioritizedChanges) {
      this.memory.recordAttempt(
        rec,
        iterationNum,
        status,
        changes.files.map(f => f.path),
        reflection.reasoning
      );
    }

    // Record successful changes if any
    if (status === 'success') {
      this.memory.recordSuccessfulChanges(changes.files);
    }

    // Record score
    this.memory.recordScore({
      iteration: iterationNum,
      beforeScore: previousScore,
      afterScore: evaluation.compositeScore,
      delta: scoreDelta,
    });

    // Update context
    if (designSpec.detectedContext) {
      this.memory.updateContext(designSpec.detectedContext);
    }

    // Handle rollback if reflection suggests it
    if (reflection.shouldRollback) {
      console.log('   ⏪ Reflection suggests rollback - reverting changes...');
      await this.rollbackChanges(changes);
    }

    // Save memory to disk
    await this.memory.save();

    return {
      iteration: iterationNum,
      timestamp: new Date(),
      beforeScreenshot,
      afterScreenshot,
      designSpec,
      changes,
      evaluation,
      scoreDelta,
      targetReached: evaluation.targetReached,
      hybridScore
    };
  }

  private async implementChanges(spec: DesignSpec): Promise<Changes> {
    // Use Orchestrator Agent with specialized agents
    return await this.orchestratorAgent.implementChanges(spec, this.config.projectPath);
  }

  private async evaluate(screenshot: Screenshot): Promise<EvaluationResult> {
    // For MVP, we can use Claude Opus vision again to score the design
    // In production, this would be a separate evaluation agent

    // Re-use vision plugin for evaluation
    const spec = await this.visionPlugin.analyzeScreenshot(screenshot);

    // Convert to evaluation format
    return {
      compositeScore: spec.currentScore,
      targetScore: this.config.targetScore,
      targetReached: spec.currentScore >= this.config.targetScore,
      scores: {
        visual_hierarchy: 0,
        typography: 0,
        color_contrast: 0,
        spacing_layout: 0,
        component_design: 0,
        animation_interaction: 0,
        accessibility: 0,
        overall_aesthetic: 0,
      },
      dimensions: {},
      strengths: [],
      weaknesses: spec.currentIssues.map(i => `${i.dimension}: ${i.description}`),
      summary: `Current score: ${spec.currentScore}/10`,
      priorityImprovements: [],
    };
  }

  private async generateReport(): Promise<IterationReport> {
    const endTime = new Date();
    const duration = endTime.getTime() - (this.startTime?.getTime() || 0);

    const startingScore = this.iterations[0]?.designSpec.currentScore || 0;
    const finalScore = this.iterations[this.iterations.length - 1]?.evaluation.compositeScore || 0;

    const report: IterationReport = {
      status: 'complete',
      startTime: this.startTime!,
      endTime,
      duration,
      startingScore,
      finalScore,
      improvement: finalScore - startingScore,
      targetScore: this.config.targetScore,
      targetReached: finalScore >= this.config.targetScore,
      totalIterations: this.iterations.length,
      bestIteration: this.findBestIteration(),
      iterations: this.iterations,
      reportPath: path.join(this.config.outputDir, 'report.json'),
    };

    // Save report
    await fs.writeFile(report.reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    await this.generateMarkdownReport(report);

    return report;
  }

  private findBestIteration(): number {
    let bestScore = 0;
    let bestIteration = 0;

    this.iterations.forEach((iter, idx) => {
      if (iter.evaluation.compositeScore > bestScore) {
        bestScore = iter.evaluation.compositeScore;
        bestIteration = idx;
      }
    });

    return bestIteration;
  }

  private async generateMarkdownReport(report: IterationReport) {
    const mdPath = path.join(this.config.outputDir, 'REPORT.md');

    // Check if any iteration has hybrid scoring
    const hasHybridScoring = report.iterations.some(iter => iter.hybridScore);

    const md = `# VIZTRTR Report

Generated: ${new Date().toISOString()}

## Summary

- **Starting Score:** ${report.startingScore.toFixed(1)}/10
- **Final Score:** ${report.finalScore.toFixed(1)}/10
- **Improvement:** +${report.improvement.toFixed(1)} points
- **Target Score:** ${report.targetScore}/10
- **Target Reached:** ${report.targetReached ? '✅ YES' : '❌ NO'}
- **Total Iterations:** ${report.totalIterations}
- **Best Iteration:** ${report.bestIteration}
- **Duration:** ${Math.round(report.duration / 1000)}s
${hasHybridScoring ? '- **Hybrid Scoring:** Enabled (Vision 60% + Metrics 40%)' : ''}

## Iteration History

${report.iterations
  .map(
    (iter, idx) => `
### Iteration ${idx}

- **Score:** ${iter.evaluation.compositeScore.toFixed(1)}/10
- **Delta:** ${iter.scoreDelta > 0 ? '+' : ''}${iter.scoreDelta.toFixed(1)}
${iter.hybridScore ? `- **Hybrid Breakdown:**
  - Vision: ${iter.hybridScore.visionScore.toFixed(1)}/10 (60%)
  - Metrics: ${iter.hybridScore.metricsScore.toFixed(1)}/10 (40%)
  - Confidence: ${(iter.hybridScore.confidence * 100).toFixed(0)}%
  - Performance: ${iter.hybridScore.metricsBreakdown?.performance.toFixed(1)}/10
  - Accessibility: ${iter.hybridScore.metricsBreakdown?.accessibility.toFixed(1)}/10
  - Best Practices: ${iter.hybridScore.metricsBreakdown?.bestPractices.toFixed(1)}/10` : ''}
- **Before:** [screenshot](./iteration_${idx}/before.png)
- **After:** [screenshot](./iteration_${idx}/after.png)
- **Spec:** [design_spec.json](./iteration_${idx}/design_spec.json)
- **Changes:** [changes.json](./iteration_${idx}/changes.json)
`
  )
  .join('\n')}

## Recommendations

${report.iterations[report.bestIteration]?.designSpec.recommendations
  .map(r => `- **${r.title}** (${r.dimension}): ${r.description}`)
  .join('\n')}

---

*Generated by VIZTRTR v0.1.0*
`;

    await fs.writeFile(mdPath, md);
  }

  private async rollbackChanges(changes: Changes): Promise<void> {
    console.log('   ⏪ Rolling back changes...');

    for (const file of changes.files) {
      if (file.oldContent && file.type === 'edit') {
        const filePath = path.join(this.config.projectPath, file.path);
        try {
          await fs.writeFile(filePath, file.oldContent);
          console.log(`   ✅ Rolled back: ${file.path}`);
        } catch (error) {
          console.error(`   ❌ Failed to rollback ${file.path}:`, error);
        }
      }
    }
  }

  private async cleanup() {
    await this.capturePlugin.close();
    if (this.hybridScoringAgent) {
      await this.hybridScoringAgent.dispose();
    }
  }
}
