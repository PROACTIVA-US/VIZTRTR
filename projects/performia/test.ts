/**
 * VIZTRTR Test Runner for Performia
 *
 * Usage:
 *   1. Start Performia dev server: cd ../Performia/frontend && npm run dev
 *   2. Run this script: npm run test:performia
 */

import { VIZTRITROrchestrator } from '../../src/core/orchestrator';
import performiaConfig from './config';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🎵 VIZTRTR Test: Performia Living Chart');
  console.log('=' .repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`   Project: ${performiaConfig.projectPath}`);
  console.log(`   Frontend URL: ${performiaConfig.frontendUrl}`);
  console.log(`   Target Score: ${performiaConfig.targetScore}/10`);
  console.log(`   Max Iterations: ${performiaConfig.maxIterations}`);
  console.log(`   Output: ${performiaConfig.outputDir}\n`);

  // Validate API key
  if (!performiaConfig.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in .env');
    console.error('   Please add your API key to the .env file');
    process.exit(1);
  }

  // Pre-flight checks
  console.log('🔍 Pre-flight checks...');

  try {
    // Check if frontend is running
    const response = await fetch(performiaConfig.frontendUrl);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
    console.log('✅ Frontend is accessible\n');
  } catch (error) {
    console.error('❌ Error: Performia frontend is not running');
    console.error(`   Please start it with: cd ${performiaConfig.projectPath} && npm run dev`);
    console.error(`   Expected URL: ${performiaConfig.frontendUrl}\n`);
    process.exit(1);
  }

  // Run VIZTRTR
  try {
    const orchestrator = new VIZTRITROrchestrator(performiaConfig);
    const report = await orchestrator.run();

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 PERFORMIA TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`\n🎯 Score Progression:`);
    console.log(`   Starting: ${report.startingScore.toFixed(1)}/10`);
    console.log(`   Final: ${report.finalScore.toFixed(1)}/10`);
    console.log(`   Improvement: +${report.improvement.toFixed(1)} points`);
    console.log(`   Target Reached: ${report.targetReached ? '✅ YES' : '❌ NO'}`);
    console.log(`\n⚡ Performance:`);
    console.log(`   Total Iterations: ${report.totalIterations}`);
    console.log(`   Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`   Best Iteration: #${report.bestIteration}`);
    console.log(`\n📁 Outputs:`);
    console.log(`   Report: ${report.reportPath}`);
    console.log(`   Markdown: ${performiaConfig.outputDir}/REPORT.md`);
    console.log(`   Screenshots: ${performiaConfig.outputDir}/iteration_*/\n`);

    // Performia-specific analysis
    const finalEval = report.iterations[report.iterations.length - 1]?.evaluation;
    if (finalEval) {
      console.log('🎸 Performia-Specific Scores:');
      console.log(`   Visual Hierarchy: ${finalEval.scores.visual_hierarchy.toFixed(1)}/10`);
      console.log(`   Typography (readability): ${finalEval.scores.typography.toFixed(1)}/10`);
      console.log(`   Color & Contrast (stage): ${finalEval.scores.color_contrast.toFixed(1)}/10`);
      console.log(`   Accessibility (critical): ${finalEval.scores.accessibility.toFixed(1)}/10`);
      console.log(`   Component Design: ${finalEval.scores.component_design.toFixed(1)}/10\n`);
    }

    // Next steps
    console.log('📝 Next Steps:');
    console.log('   1. Review the detailed report at:', report.reportPath);
    console.log('   2. Compare before/after screenshots in:', performiaConfig.outputDir);
    console.log('   3. Test the changes in Performia');
    console.log('   4. Run accessibility audit');
    console.log('   5. Get feedback from musicians\n');

    process.exit(report.targetReached ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error running VIZTRTR:', error);
    process.exit(1);
  }
}

main();
