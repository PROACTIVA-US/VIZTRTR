/**
 * VIZTRITR Demo
 *
 * Runs VIZTRITR on the Performia upload interface
 */

import { VIZTRITROrchestrator } from '../src/core/orchestrator';
import { VIZTRITRConfig } from '../src/core/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const config: VIZTRITRConfig = {
    // Project settings
    projectPath: path.join(__dirname, '../../frontend'),
    frontendUrl: 'http://localhost:5001',
    targetScore: 8.5,
    maxIterations: 3,

    // Plugin selection
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',

    // API credentials
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Screenshot config
    screenshotConfig: {
      width: 1440,
      height: 900,
      fullPage: false,
    },

    // Output
    outputDir: path.join(__dirname, '../../viztritr-output'),
    verbose: true,
  };

  // Validate API key
  if (!config.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
    console.error('   Please create a .env file with your API key:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-...\n');
    process.exit(1);
  }

  console.log('🎨 VIZTRITR - Visual Iteration Orchestrator');
  console.log('━'.repeat(70));
  console.log(`   Project: ${config.projectPath}`);
  console.log(`   URL: ${config.frontendUrl}`);
  console.log(`   Target: ${config.targetScore}/10`);
  console.log(`   Max Iterations: ${config.maxIterations}`);
  console.log('━'.repeat(70));
  console.log();

  // Create orchestrator
  const orchestrator = new VIZTRITROrchestrator(config);

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
