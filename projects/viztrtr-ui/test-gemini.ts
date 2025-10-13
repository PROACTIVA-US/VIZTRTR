/**
 * VIZTRTR UI - Gemini Computer Use Test
 *
 * Tests Gemini 2.5 Computer Use on VIZTRTR's own UI
 */

import { GeminiComputerUsePlugin } from '../../src/plugins/implementation-gemini-computer-use';
import { ClaudeOpusVisionPlugin } from '../../src/plugins/vision-claude';
import { PuppeteerCapturePlugin } from '../../src/plugins/capture-puppeteer';
import { config } from './config';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 VIZTRTR UI - Gemini Computer Use Test\n');

  // Check for API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required for vision analysis');
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY required for Gemini Computer Use');
  }

  console.log('📋 Test Configuration:');
  console.log(`   Target: ${config.frontendUrl}`);
  console.log(`   Vision: Claude Opus 4`);
  console.log(`   Implementation: Gemini 2.5 Computer Use`);
  console.log(`   Max Recommendations: 3\n`);

  try {
    // Step 1: Capture screenshot
    console.log('📸 Step 1: Capturing screenshot...');
    const capturePlugin = new PuppeteerCapturePlugin();
    const screenshot = await capturePlugin.captureScreenshot!(config.frontendUrl, config.screenshotConfig);
    console.log('✅ Screenshot captured\n');

    // Step 2: Analyze with Claude Vision
    console.log('🔍 Step 2: Analyzing design with Claude Opus...');
    const visionPlugin = new ClaudeOpusVisionPlugin(process.env.ANTHROPIC_API_KEY);
    const designSpec = await visionPlugin.analyzeScreenshot!(screenshot);

    console.log(`   Current Score: ${designSpec.currentScore}/10`);
    console.log(`   Target Score: ${config.targetScore}/10`);
    console.log(`   Recommendations: ${designSpec.prioritizedChanges.length}`);
    console.log(`\n   Top 3 recommendations:`);
    designSpec.prioritizedChanges.slice(0, 3).forEach((rec, i) => {
      console.log(`      ${i + 1}. [${rec.impact}/10] ${rec.title}`);
      console.log(`         ${rec.description}`);
    });
    console.log('');

    // Step 3: Implement with Gemini Computer Use
    console.log('🤖 Step 3: Implementing with Gemini Computer Use...\n');
    const geminiPlugin = new GeminiComputerUsePlugin(process.env.GOOGLE_API_KEY);
    geminiPlugin.setFrontendUrl(config.frontendUrl);

    // Only implement top 3 recommendations
    const testSpec = {
      ...designSpec,
      prioritizedChanges: designSpec.prioritizedChanges.slice(0, 3),
    };

    const changes = await geminiPlugin.implementChanges(testSpec, config.projectPath);

    // Results
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTS');
    console.log('='.repeat(70));
    console.log(`Recommendations Attempted: ${testSpec.prioritizedChanges.length}`);
    console.log(`Changes Applied: ${changes.files.length}`);
    console.log(`Summary: ${changes.summary}\n`);

    if (changes.files.length > 0) {
      console.log('Actions Executed:');
      changes.files.forEach((file, i) => {
        console.log(`\n${i + 1}. ${file.path}`);
        if (file.diff) {
          console.log(`   ${file.diff.replace(/\n/g, '\n   ')}`);
        }
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the browser to see the applied changes');
    console.log('   2. Compare before/after screenshots');
    console.log('   3. Run full orchestrator if changes look good');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();
