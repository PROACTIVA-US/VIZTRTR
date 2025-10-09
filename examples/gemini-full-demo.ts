/**
 * Gemini Computer Use Full Demo
 *
 * Demonstrates the complete visual verification loop:
 * 1. Capture before screenshot
 * 2. Analyze UI visually
 * 3. Plan and execute code changes
 * 4. Reload and capture after screenshot
 * 5. Verify improvements
 * 6. Rollback if regression detected
 *
 * Run: npm run build && node dist/examples/gemini-full-demo.js
 */

import { PuppeteerCapturePlugin } from '../src/plugins/capture-puppeteer';
import { GeminiVisionPlugin } from '../src/plugins/vision-gemini';
import { GeminiComputerUseFullPlugin } from '../src/plugins/gemini-computer-use-full';
import { DesignSpec, ProjectContext } from '../src/core/types';

async function runGeminiFullDemo() {
  console.log('🚀 Gemini Computer Use Full Demo\n');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const projectPath = process.cwd();

  console.log(`📍 Frontend URL: ${frontendUrl}`);
  console.log(`📁 Project Path: ${projectPath}\n`);

  try {
    // Step 1: Initial screenshot with Puppeteer
    console.log('📸 Step 1: Capturing initial screenshot...');
    const capturePlugin = new PuppeteerCapturePlugin();
    const screenshot = await capturePlugin.captureScreenshot(frontendUrl, {
      width: 1920,
      height: 1080,
      fullPage: false,
    });
    console.log('✅ Screenshot captured\n');

    // Step 2: Analyze with Gemini Vision
    console.log('👁️  Step 2: Analyzing UI with Gemini Vision...');
    const visionPlugin = new GeminiVisionPlugin();

    const projectContext: ProjectContext = {
      name: 'VIZTRTR UI',
      type: 'general',
      description: 'Testing Gemini Computer Use full integration',
      focusAreas: ['Accessibility', 'Visual hierarchy'],
      avoidAreas: [],
    };

    const designSpec: DesignSpec = await visionPlugin.analyzeScreenshot!(
      screenshot,
      undefined,
      projectContext
    );

    console.log('✅ Analysis complete');
    console.log(`   Current score: ${designSpec.currentScore}/10`);
    console.log(`   Issues found: ${designSpec.currentIssues.length}`);
    console.log(`   Recommendations: ${designSpec.recommendations.length}\n`);

    if (designSpec.recommendations.length === 0) {
      console.log('🎉 No recommendations - UI is already excellent!');
      return;
    }

    const topRec = designSpec.recommendations[0];
    console.log('🎯 Top recommendation:');
    console.log(`   ${topRec.title}`);
    console.log(`   Impact: ${topRec.impact}/10 | Effort: ${topRec.effort}/10`);
    console.log(`   ${topRec.description}\n`);

    // Step 3: Implement with full visual verification
    console.log('🤖 Step 3: Implementing changes with visual verification loop...');
    const fullPlugin = new GeminiComputerUseFullPlugin();

    const changes = await fullPlugin.implementChanges!(designSpec, projectPath, frontendUrl);

    console.log('\n✅ Implementation complete');
    console.log(`   Files modified: ${changes.files.length}`);
    console.log(`   Summary: ${changes.summary}\n`);

    if (changes.files.length > 0) {
      console.log('📝 Changes made:');
      changes.files.forEach(file => {
        console.log(`   - ${file.path} (${file.type})`);
      });
    } else {
      console.log('⚠️  No files were modified (possible rollback due to regression)');
    }

    // Cleanup
    await fullPlugin.cleanup();
    console.log('\n✅ Demo complete!');
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run demo
runGeminiFullDemo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
