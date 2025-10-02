/**
 * VIZTRTR Self-Improvement Test Runner
 *
 * This script runs VIZTRTR on its own UI to autonomously improve the interface.
 * It's a meta-application of the system - VIZTRTR improving itself.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { VIZTRTROrchestrator } from './core/orchestrator';
import config from './viztrtr-ui-config';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         VIZTRTR SELF-IMPROVEMENT TEST                         ║');
  console.log('║         Meta-Strategy: AI Improving Its Own Interface         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`  Project Path: ${config.projectPath}`);
  console.log(`  Frontend URL: ${config.frontendUrl}`);
  console.log(`  Target Score: ${config.targetScore}/10`);
  console.log(`  Max Iterations: ${config.maxIterations}`);
  console.log(`  Vision Model: ${config.visionModel}`);
  console.log(`  Implementation Model: ${config.implementationModel}`);
  console.log(`  Output Directory: ${config.outputDir}\n`);

  console.log('Prerequisites:');
  console.log('  ✓ ANTHROPIC_API_KEY is set');
  console.log('  ⚠ Please ensure frontend dev server is running at http://localhost:3000');
  console.log('  ⚠ Run: cd ui/frontend && npm run dev\n');

  console.log('Press Ctrl+C to cancel, or wait 5 seconds to begin...\n');

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Initialize orchestrator
    const orchestrator = new VIZTRTROrchestrator(config);

    // Run the iteration cycle
    const report = await orchestrator.run();

    // Print summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL RESULTS                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Starting Score:    ${report.startingScore.toFixed(1)}/10`);
    console.log(`Final Score:       ${report.finalScore.toFixed(1)}/10`);
    console.log(`Improvement:       ${report.improvement > 0 ? '+' : ''}${report.improvement.toFixed(1)} points`);
    console.log(`Target Reached:    ${report.targetReached ? '✅ YES' : '❌ NO'}`);
    console.log(`Total Iterations:  ${report.totalIterations}`);
    console.log(`Best Iteration:    #${report.bestIteration}`);
    console.log(`Duration:          ${Math.round(report.duration / 1000)}s`);
    console.log(`\nReport Location:   ${report.reportPath}`);
    console.log(`Markdown Report:   ${path.join(config.outputDir, 'REPORT.md')}`);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              META-STRATEGY INSIGHTS                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('This run demonstrates VIZTRTR\'s capability to:');
    console.log('  • Analyze its own user interface objectively');
    console.log('  • Identify design issues autonomously');
    console.log('  • Implement code changes to improve itself');
    console.log('  • Learn from iteration history (memory system)');
    console.log('  • Achieve production-quality design through AI iteration\n');

    if (report.targetReached) {
      console.log('🎉 Success! VIZTRTR has improved its own UI to target quality.\n');
    } else {
      console.log('⚠️  Target not reached. Consider:');
      console.log('   - Increasing maxIterations');
      console.log('   - Reviewing iteration reports for patterns');
      console.log('   - Adjusting targetScore if unrealistic\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during VIZTRTR execution:\n');
    console.error(error);

    console.log('\nTroubleshooting:');
    console.log('  1. Is the frontend dev server running? (npm run dev in ui/frontend/)');
    console.log('  2. Is it accessible at http://localhost:3000?');
    console.log('  3. Is ANTHROPIC_API_KEY set in .env?');
    console.log('  4. Check the logs above for specific error details\n');

    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user. Exiting...\n');
  process.exit(0);
});

// Run
main();
