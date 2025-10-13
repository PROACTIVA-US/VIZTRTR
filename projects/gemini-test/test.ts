/**
 * Gemini Computer Use - Simple Test
 */

import { GeminiComputerUsePlugin } from '../../src/plugins/implementation-gemini-computer-use';
import { ClaudeOpusVisionPlugin } from '../../src/plugins/vision-claude';
import { PuppeteerCapturePlugin } from '../../src/plugins/capture-puppeteer';
import { config } from './config';

async function main() {
  console.log('🚀 Gemini Computer Use - Simple Test\n');

  console.log('📋 Configuration:');
  console.log(`   Target: ${config.frontendUrl}`);
  console.log(`   Project: ${config.projectPath}`);
  console.log('   Vision: Claude Opus 4');
  console.log('   Implementation: Gemini 2.5 Computer Use\n');

  console.log('⚠️  Make sure to start a local server:');
  console.log('   cd projects/gemini-test && python3 -m http.server 8080\n');

  try {
    // Step 1: Capture
    console.log('📸 Step 1: Capturing screenshot...');
    const capturePlugin = new PuppeteerCapturePlugin();
    const screenshot = await capturePlugin.captureScreenshot!(
      config.frontendUrl,
      config.screenshotConfig
    );
    console.log('✅ Screenshot captured\n');

    // Step 2: Analyze
    console.log('🔍 Step 2: Analyzing with Claude Opus...');
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY required');
    }
    const visionPlugin = new ClaudeOpusVisionPlugin(config.anthropicApiKey);
    const designSpec = await visionPlugin.analyzeScreenshot!(screenshot);

    console.log(`   Score: ${designSpec.currentScore}/10`);
    console.log(`   Recommendations: ${designSpec.prioritizedChanges.length}`);
    console.log('\n   Top 2 recommendations:');
    designSpec.prioritizedChanges.slice(0, 2).forEach((rec, i) => {
      console.log(`      ${i + 1}. [${rec.impact}/10] ${rec.title}`);
    });
    console.log('');

    // Step 3: Implement
    console.log('🤖 Step 3: Implementing with Gemini...\n');
    if (!config.googleApiKey) {
      throw new Error('GOOGLE_API_KEY required');
    }
    const geminiPlugin = new GeminiComputerUsePlugin(config.googleApiKey);
    geminiPlugin.setFrontendUrl(config.frontendUrl);

    const testSpec = {
      ...designSpec,
      prioritizedChanges: designSpec.prioritizedChanges.slice(0, 2),
    };

    const changes = await geminiPlugin.implementChanges(testSpec, config.projectPath);

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`Actions: ${changes.files.length}`);
    console.log(`Summary: ${changes.summary}\n`);

    changes.files.forEach((file, i) => {
      console.log(`${i + 1}. ${file.path}`);
      if (file.diff) {
        console.log(`   ${file.diff.replace(/\n/g, '\n   ')}`);
      }
    });

    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
