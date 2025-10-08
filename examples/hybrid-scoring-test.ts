/**
 * Hybrid Scoring Test
 *
 * Tests the hybrid scoring system (AI vision 60% + browser metrics 40%)
 * on VIZTRTR's own UI
 */

import { VIZTRTROrchestrator } from '../src/core/orchestrator';
import { VIZTRTRConfig } from '../src/core/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
dotenv.config();

async function main() {
  // Determine project root (works in both src and dist)
  const projectRoot = process.cwd();
  const frontendPath = path.join(projectRoot, 'ui/frontend');
  const frontendUrl = 'http://localhost:5173';

  // Check if frontend is running
  try {
    const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      console.error('❌ Frontend server not responding properly');
      console.error(`   Please start the frontend: cd ui/frontend && npm run dev`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Frontend server not running on', frontendUrl);
    console.error(`   Please start it first: cd ui/frontend && npm run dev`);
    process.exit(1);
  }

  const config: VIZTRTRConfig = {
    // Project settings - test on VIZTRTR's own UI
    projectPath: frontendPath,
    frontendUrl,
    targetScore: 8.5,
    maxIterations: 2,

    // Plugin selection
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',

    // API credentials
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Enable hybrid scoring with Chrome DevTools
    useChromeDevTools: true,
    scoringWeights: {
      vision: 0.6, // 60% AI vision
      metrics: 0.4, // 40% real browser metrics
    },

    // Screenshot config
    screenshotConfig: {
      width: 1440,
      height: 900,
      fullPage: false,
    },

    // Output
    outputDir: path.join(projectRoot, 'viztritr-output/hybrid-test'),
    verbose: true,
  };

  // Validate API key
  if (!config.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
    console.error('   Please create a .env file with your API key:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...\n');
    process.exit(1);
  }

  console.log('🔬 VIZTRTR - Hybrid Scoring Test');
  console.log('━'.repeat(70));
  console.log(`   Project: ${config.projectPath}`);
  console.log(`   URL: ${config.frontendUrl}`);
  console.log(`   Target: ${config.targetScore}/10`);
  console.log(`   Max Iterations: ${config.maxIterations}`);
  console.log('   Scoring Mode: Hybrid (Vision 60% + Metrics 40%)');
  console.log('━'.repeat(70));
  console.log();

  // Create orchestrator
  const orchestrator = new VIZTRTROrchestrator(config);

  try {
    // Run iteration cycle
    const report = await orchestrator.run();

    console.log('\n📊 Final Report:');
    console.log(`   ${report.reportPath}`);

    // Show hybrid scoring results
    console.log('\n🔬 Hybrid Scoring Summary:');
    report.iterations.forEach((iter, idx) => {
      if (iter.hybridScore) {
        console.log(`   Iteration ${idx + 1}:`);
        console.log(`     Composite: ${iter.hybridScore.compositeScore.toFixed(1)}/10`);
        console.log(`     Vision: ${iter.hybridScore.visionScore.toFixed(1)}/10 (60%)`);
        console.log(`     Metrics: ${iter.hybridScore.metricsScore.toFixed(1)}/10 (40%)`);
        console.log(`     Confidence: ${(iter.hybridScore.confidence * 100).toFixed(0)}%`);
        console.log(
          `     Performance: ${iter.hybridScore.metricsBreakdown?.performance.toFixed(1)}/10`
        );
        console.log(
          `     Accessibility: ${iter.hybridScore.metricsBreakdown?.accessibility.toFixed(1)}/10`
        );
        console.log(
          `     Best Practices: ${iter.hybridScore.metricsBreakdown?.bestPractices.toFixed(1)}/10`
        );
      }
    });

    if (report.targetReached) {
      console.log('\n🎉 Success! Target score reached.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Target not reached. Final score: ${report.finalScore.toFixed(1)}/10`);
      console.log('   Consider running additional iterations or manual refinement.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
