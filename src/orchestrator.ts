/**
 * VIZTRITR Core Orchestrator
 *
 * Coordinates iteration cycles: capture → analyze → implement → evaluate → repeat
 */

import { VIZTRITRConfig, IterationReport, IterationResult, Screenshot, DesignSpec, Changes, EvaluationResult } from './types';
import { ClaudeOpusVisionPlugin } from './plugins/vision-claude';
import { PuppeteerCapturePlugin } from './plugins/capture-puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VIZTRITROrchestrator {
  private config: VIZTRITRConfig;
  private visionPlugin: ClaudeOpusVisionPlugin;
  private capturePlugin: PuppeteerCapturePlugin;
  private iterations: IterationResult[] = [];
  private startTime: Date | null = null;

  constructor(config: VIZTRITRConfig) {
    this.config = config;

    // Initialize plugins
    this.visionPlugin = new ClaudeOpusVisionPlugin(config.anthropicApiKey!);
    this.capturePlugin = new PuppeteerCapturePlugin();

    // Ensure output directory exists
    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  async run(): Promise<IterationReport> {
    this.startTime = new Date();
    console.log('🚀 Starting VIZTRITR iteration cycle...');
    console.log(`   Target Score: ${this.config.targetScore}/10`);
    console.log(`   Max Iterations: ${this.config.maxIterations}`);
    console.log(`   Output: ${this.config.outputDir}\n`);

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
      console.log(`✅ VIZTRITR COMPLETE`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Starting Score: ${this.iterations[0]?.designSpec.currentScore.toFixed(1) || 0}/10`);
      console.log(`   Final Score: ${currentScore.toFixed(1)}/10`);
      console.log(`   Improvement: +${(currentScore - (this.iterations[0]?.designSpec.currentScore || 0)).toFixed(1)}`);
      console.log(`   Iterations: ${this.iterations.length}`);
      console.log(`   Report: ${report.reportPath}\n`);

      return report;
    } finally {
      await this.cleanup();
    }
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
    await fs.copyFile(beforeScreenshot.path, beforePath);
    beforeScreenshot.path = beforePath;

    // Step 2: Analyze with vision model
    console.log('🔍 Step 2: Analyzing UI with Claude Opus vision...');
    const designSpec = await this.visionPlugin.analyzeScreenshot(beforeScreenshot);
    designSpec.iteration = iterationNum;

    // Save design spec
    const specPath = path.join(iterationDir, 'design_spec.json');
    await fs.writeFile(specPath, JSON.stringify(designSpec, null, 2));

    console.log(`   Current Score: ${designSpec.currentScore}/10`);
    console.log(`   Issues Found: ${designSpec.currentIssues.length}`);
    console.log(`   Recommendations: ${designSpec.recommendations.length}`);

    // Step 3: Implement changes
    console.log('🔧 Step 3: Implementing changes...');
    const changes = await this.implementChanges(designSpec);

    // Save changes
    const changesPath = path.join(iterationDir, 'changes.json');
    await fs.writeFile(changesPath, JSON.stringify(changes, null, 2));

    console.log(`   Files Modified: ${changes.files.length}`);

    // Step 4: Wait for rebuild (if dev server is running, it should hot-reload)
    console.log('⏳ Step 4: Waiting for rebuild...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

    // Step 5: Capture after screenshot
    console.log('📸 Step 5: Capturing after screenshot...');
    const afterScreenshot = await this.capturePlugin.captureScreenshot(
      this.config.frontendUrl,
      this.config.screenshotConfig
    );

    const afterPath = path.join(iterationDir, 'after.png');
    await fs.copyFile(afterScreenshot.path, afterPath);
    afterScreenshot.path = afterPath;

    // Step 6: Evaluate
    console.log('📊 Step 6: Evaluating result...');
    const evaluation = await this.evaluate(afterScreenshot);

    // Save evaluation
    const evalPath = path.join(iterationDir, 'evaluation.json');
    await fs.writeFile(evalPath, JSON.stringify(evaluation, null, 2));

    const previousScore = iterationNum > 0
      ? this.iterations[iterationNum - 1].evaluation.compositeScore
      : designSpec.currentScore;

    const scoreDelta = evaluation.compositeScore - previousScore;

    return {
      iteration: iterationNum,
      timestamp: new Date(),
      beforeScreenshot,
      afterScreenshot,
      designSpec,
      changes,
      evaluation,
      scoreDelta,
      targetReached: evaluation.targetReached
    };
  }

  private async implementChanges(spec: DesignSpec): Promise<Changes> {
    // For MVP, we'll implement the top 3 highest-priority recommendations
    const topChanges = spec.prioritizedChanges.slice(0, 3);

    console.log(`   Implementing top ${topChanges.length} recommendations...`);

    const fileChanges = [];

    for (const change of topChanges) {
      console.log(`   - ${change.title}`);

      // For MVP, we'd need to use Claude Sonnet API to actually generate code
      // For now, we'll create placeholder changes
      // In production, this would call Claude Sonnet API with:
      // - The current file content
      // - The design recommendation
      // - Request for specific code changes

      // TODO: Implement actual code generation via Claude Sonnet API
    }

    return {
      files: fileChanges,
      summary: `Applied ${topChanges.length} design improvements`,
      buildCommand: 'npm run build',
      testCommand: 'npm test'
    };
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
        overall_aesthetic: 0
      },
      dimensions: {},
      strengths: [],
      weaknesses: spec.currentIssues.map(i => `${i.dimension}: ${i.description}`),
      summary: `Current score: ${spec.currentScore}/10`,
      priorityImprovements: []
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
      reportPath: path.join(this.config.outputDir, 'report.json')
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

    const md = `# VIZTRITR Report

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

## Iteration History

${report.iterations.map((iter, idx) => `
### Iteration ${idx}

- **Score:** ${iter.evaluation.compositeScore.toFixed(1)}/10
- **Delta:** ${iter.scoreDelta > 0 ? '+' : ''}${iter.scoreDelta.toFixed(1)}
- **Before:** [screenshot](./iteration_${idx}/before.png)
- **After:** [screenshot](./iteration_${idx}/after.png)
- **Spec:** [design_spec.json](./iteration_${idx}/design_spec.json)
- **Changes:** [changes.json](./iteration_${idx}/changes.json)
`).join('\n')}

## Recommendations

${report.iterations[report.bestIteration]?.designSpec.recommendations.map(r =>
  `- **${r.title}** (${r.dimension}): ${r.description}`
).join('\n')}

---

*Generated by VIZTRITR v0.1.0*
`;

    await fs.writeFile(mdPath, md);
  }

  private async cleanup() {
    await this.capturePlugin.close();
  }
}
