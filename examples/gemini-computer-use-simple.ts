/**
 * Simple Gemini Computer Use Test
 *
 * Direct test of Gemini 2.5 Computer Use model for browser automation
 * without the full VIZTRTR orchestrator.
 */

import { GeminiComputerUsePlugin } from '../src/plugins/implementation-gemini-computer-use';
import { ClaudeOpusVisionPlugin } from '../src/plugins/vision-claude';
import { PuppeteerCapturePlugin } from '../src/plugins/capture-puppeteer';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Gemini Computer Use - Simple Test\n');

  // Check for API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required for vision analysis');
  }

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY required for Gemini Computer Use');
  }

  const frontendUrl = 'http://localhost:5173';

  console.log('📋 Test Setup:');
  console.log(`   Vision: Claude Opus 4`);
  console.log(`   Implementation: Gemini 2.5 Computer Use`);
  console.log(`   Target: ${frontendUrl}\n`);

  // Step 1: Capture screenshot
  console.log('📸 Step 1: Capturing screenshot...');
  const capturePlugin = new PuppeteerCapturePlugin();
  const screenshot = await capturePlugin.captureScreenshot!(frontendUrl, {
    width: 1920,
    height: 1080,
    fullPage: true,
  });
  console.log('✅ Screenshot captured\n');

  // Step 2: Analyze with Claude Vision
  console.log('🔍 Step 2: Analyzing design with Claude Opus...');
  const visionPlugin = new ClaudeOpusVisionPlugin(process.env.ANTHROPIC_API_KEY);
  const designSpec = await visionPlugin.analyzeScreenshot!(screenshot);

  console.log(`   Current Score: ${designSpec.currentScore}/10`);
  console.log(`   Recommendations: ${designSpec.prioritizedChanges.length}`);
  console.log(`   Top recommendations:`);
  designSpec.prioritizedChanges.slice(0, 3).forEach((rec, i) => {
    console.log(`      ${i + 1}. ${rec.title} (impact: ${rec.impact}/10)`);
  });
  console.log('');

  // Step 3: Implement with Gemini Computer Use
  console.log('🤖 Step 3: Implementing with Gemini Computer Use...');
  const geminiPlugin = new GeminiComputerUsePlugin(process.env.GOOGLE_API_KEY);
  geminiPlugin.setFrontendUrl(frontendUrl);

  // Only implement top 2 recommendations for testing
  const testSpec = {
    ...designSpec,
    prioritizedChanges: designSpec.prioritizedChanges.slice(0, 2),
  };

  const changes = await geminiPlugin.implementChanges(testSpec, process.cwd());

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`Changes Applied: ${changes.files.length}`);
  console.log(`Summary: ${changes.summary}`);

  if (changes.files.length > 0) {
    console.log('\nActions Executed:');
    changes.files.forEach((file, i) => {
      console.log(`${i + 1}. ${file.path}`);
      if (file.diff) {
        console.log(`   ${file.diff.replace(/\n/g, '\n   ')}`);
      }
    });
  }

  console.log('\n✅ Gemini Computer Use test complete!');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
