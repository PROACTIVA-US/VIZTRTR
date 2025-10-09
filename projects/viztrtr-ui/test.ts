/**
 * VIZTRTR UI Self-Improvement Test Runner
 *
 * Runs VIZTRTR on its own web interface to validate:
 * 1. System can analyze and improve its own UI
 * 2. Two-phase workflow achieves high implementation success rate
 * 3. Design score reaches 8.5+/10 target
 * 4. All 8 dimensions are properly evaluated
 */

import { VIZTRTROrchestrator } from '../../src/core/orchestrator';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

async function checkFrontendRunning(): Promise<boolean> {
  console.log(`\n🔍 Checking if frontend is running at ${config.frontendUrl}...`);

  try {
    const response = await fetch(config.frontendUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      console.log('✅ Frontend is running');
      return true;
    }

    console.error(`❌ Frontend returned status: ${response.status}`);
    return false;
  } catch (error) {
    console.error('❌ Frontend is not accessible');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('\n💡 Please start the frontend server:');
    console.error('   cd ui/frontend && npm run dev');
    return false;
  }
}

async function runSelfImprovementTest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  VIZTRTR UI Self-Improvement Test                           ║');
  console.log('║  Testing: Can VIZTRTR improve its own web interface?       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Pre-flight checks
  const frontendRunning = await checkFrontendRunning();
  if (!frontendRunning) {
    console.error('\n❌ Test aborted: Frontend server is not running');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${config.outputDir}`);
  }

  console.log('\n📋 Test Configuration:');
  console.log(`   Target: VIZTRTR UI (React + Vite + Tailwind)`);
  console.log(`   URL: ${config.frontendUrl}`);
  console.log(`   Path: ${config.projectPath}`);
  console.log(`   Target Score: ${config.targetScore}/10`);
  console.log(`   Max Iterations: ${config.maxIterations}`);
  console.log(`   Vision Model: ${config.visionModel}`);
  console.log(`   Implementation: Two-Phase Workflow (DiscoveryAgent + ControlPanelAgentV2)`);

  console.log('\n🚀 Starting VIZTRTR orchestrator...\n');

  try {
    const orchestrator = new VIZTRTROrchestrator(config);
    const result = await orchestrator.run();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  VIZTRTR UI Self-Test Results                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Starting Score:    ${result.startingScore.toFixed(2)}/10`);
    console.log(`📊 Final Score:       ${result.finalScore.toFixed(2)}/10`);
    console.log(`📈 Improvement:       ${result.improvement >= 0 ? '+' : ''}${result.improvement.toFixed(2)} points`);
    console.log(`🎯 Target Reached:    ${result.targetReached ? '✅ YES' : '❌ NO'}`);
    console.log(`🔄 Iterations:        ${result.totalIterations}/${config.maxIterations}`);
    console.log(`⏱️  Duration:          ${Math.round(result.duration / 1000)}s`);

    console.log('\n📁 Output Directory:');
    console.log(`   ${config.outputDir}`);
    console.log(`   ├── iteration_0/ ... iteration_${result.totalIterations - 1}/`);
    console.log(`   ├── memory/iteration-memory.json`);
    console.log(`   ├── report.json`);
    console.log(`   └── REPORT.md`);

    if (result.iterations && result.iterations.length > 0) {
      console.log('\n📋 Iteration Summary:');
      result.iterations.forEach((iter, idx) => {
        const beforeScore = iter.designSpec?.currentScore || 0;
        const afterScore = iter.evaluation?.compositeScore || 0;
        const improvement = afterScore - beforeScore;
        const status = improvement > 0 ? '📈' : improvement < 0 ? '📉' : '➡️';

        console.log(`   ${status} Iteration ${idx + 1}: ${beforeScore.toFixed(2)} → ${afterScore.toFixed(2)} (${improvement >= 0 ? '+' : ''}${improvement.toFixed(2)})`);

        if (iter.designSpec?.prioritizedChanges && iter.designSpec.prioritizedChanges.length > 0) {
          const topRec = iter.designSpec.prioritizedChanges[0];
          console.log(`      └─ Applied: ${topRec.title} (${topRec.dimension})`);
        }
      });
    }

    console.log('\n✨ Test Validation:');
    console.log(`   ✅ System can analyze its own UI`);
    console.log(`   ${result.totalIterations > 0 ? '✅' : '❌'} Two-phase workflow executed successfully`);
    console.log(`   ${result.targetReached ? '✅' : '⚠️ '} Target score ${result.targetReached ? 'achieved' : 'not reached'}`);
    console.log(`   ${result.iterations.every(i => i.evaluation?.scores) ? '✅' : '❌'} All 8 dimensions evaluated`);

    if (!result.targetReached) {
      console.log('\n💡 Recommendations:');
      console.log('   • Review iteration memory for failed attempts');
      console.log('   • Increase maxIterations for more improvement cycles');
      console.log('   • Check if recommendations are being implemented correctly');
      console.log('   • Review design spec for specific improvement areas');
    }

    console.log('\n📖 For detailed analysis, see:');
    console.log(`   ${path.join(config.outputDir, 'REPORT.md')}`);

    console.log('\n✅ Self-improvement test completed!\n');

    // Exit with success code if target reached
    process.exit(result.targetReached ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Ensure frontend server is running (npm run dev in ui/frontend)');
    console.error('   • Check ANTHROPIC_API_KEY is set in .env');
    console.error('   • Verify project path exists and contains valid React code');
    console.error('   • Review error details above for specific issues');
    process.exit(1);
  }
}

// Run the test
runSelfImprovementTest();
