import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Verify API key loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment after dotenv.config()');
  console.error('Looking for .env at:', path.resolve(__dirname, '../.env'));
  process.exit(1);
}

import { VIZTRTROrchestrator } from './core/orchestrator';
import { getConfig } from './performia-config';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         PERFORMIA LIVING CHART - VIZTRTR TEST                 ║');
  console.log('║         Teleprompter UI Optimization for Live Performance    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const config = getConfig();

  console.log('Configuration:');
  console.log(`  Project: Performia Living Chart`);
  console.log(`  Project Path: ${config.projectPath}`);
  console.log(`  Frontend URL: ${config.frontendUrl}`);
  console.log(`  Target Score: ${config.targetScore}/10`);
  console.log(`  Max Iterations: ${config.maxIterations}\n`);

  console.log('Press Ctrl+C to cancel, or wait 5 seconds to begin...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const orchestrator = new VIZTRTROrchestrator(config);
    const report = await orchestrator.run();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL RESULTS                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Final Score: ${report.finalScore.toFixed(1)}/10`);
    console.log(`Improvement: +${report.improvement.toFixed(1)} points`);
    console.log(`Target Reached: ${report.targetReached ? '✅ YES' : '❌ NO'}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during VIZTRTR execution:\n');
    console.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user. Exiting...\n');
  process.exit(0);
});

main();
