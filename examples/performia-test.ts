/**
 * VIZTRTR Performia Test
 *
 * Runs VIZTRTR on the Performia Living Chart
 */

import { VIZTRTROrchestrator } from '../src/core/orchestrator';
import { VIZTRTRConfig } from '../src/core/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const config: VIZTRTRConfig = {
    // Project settings
    projectPath: '/Users/danielconnolly/Projects/Performia/frontend',
    frontendUrl: 'http://localhost:5001',
    targetScore: 8.5,
    maxIterations: 5,

    // Plugin selection
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',

    // API credentials
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Screenshot config
    screenshotConfig: {
      width: 1920,
      height: 1080,
      fullPage: false,
    },

    // Output
    outputDir: path.join(__dirname, '../viztritr-output-performia'),
    verbose: true,
  };

  // Validate API key
  if (!config.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
    console.error('   Please create a .env file with your API key:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...\n');
    process.exit(1);
  }

  console.log('🎨 VIZTRTR - Performia Living Chart Test');
  console.log('━'.repeat(70));
  console.log(`   Project: Performia Living Chart`);
  console.log(`   URL: ${config.frontendUrl}`);
  console.log(`   Target: ${config.targetScore}/10`);
  console.log(`   Max Iterations: ${config.maxIterations}`);
  console.log('━'.repeat(70));
  console.log();

  // Create orchestrator
  const orchestrator = new VIZTRTROrchestrator(config);

  try {
    // Run iteration cycle
    const report = await orchestrator.run();

    console.log('\n📊 Final Report:');
    console.log(`   ${report.reportPath}`);

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
