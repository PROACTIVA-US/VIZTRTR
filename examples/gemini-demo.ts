/**
 * Demo script for Gemini integration
 * Tests both vision and implementation plugins
 */

import { createGeminiVisionPlugin } from '../src/plugins/vision-gemini';
import { createGeminiImplementationPlugin } from '../src/plugins/implementation-gemini';
import { PuppeteerCapturePlugin } from '../src/plugins/capture-puppeteer';
import type { Screenshot, DesignSpec } from '../src/core/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runGeminiDemo() {
  console.log('🚀 Gemini Integration Demo\n');

  // Validate API key
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable required');
    console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    process.exit(1);
  }

  try {
    // Step 1: Capture screenshot
    console.log('📸 Step 1: Capturing screenshot...');
    const capturePlugin = new PuppeteerCapturePlugin();
    const screenshot: Screenshot = await capturePlugin.captureScreenshot(
      'http://localhost:5173', // Change to your frontend URL
      {
        width: 1920,
        height: 1080,
        fullPage: false,
      }
    );
    console.log('✅ Screenshot captured successfully\n');

    // Step 2: Analyze with Gemini Vision
    console.log('👁️  Step 2: Analyzing UI with Gemini 2.0 Flash...');
    const visionPlugin = createGeminiVisionPlugin();
    const designSpec: DesignSpec = await visionPlugin.analyzeScreenshot!(
      screenshot,
      undefined, // no memory context for demo
      {
        name: 'Demo Project',
        type: 'general',
        description: 'Testing Gemini vision analysis',
        focusAreas: ['Visual hierarchy', 'Accessibility'],
        avoidAreas: [],
      }
    );
    console.log('✅ Analysis complete');
    console.log(`   Current score: ${designSpec.currentScore}/10`);
    console.log(`   Issues found: ${designSpec.currentIssues.length}`);
    console.log(`   Recommendations: ${designSpec.recommendations.length}\n`);

    // Display top recommendation
    if (designSpec.prioritizedChanges.length > 0) {
      const topRec = designSpec.prioritizedChanges[0];
      console.log('🎯 Top recommendation:');
      console.log(`   ${topRec.title}`);
      console.log(`   Impact: ${topRec.impact}/10 | Effort: ${topRec.effort}/10`);
      console.log(`   ${topRec.description}\n`);
    }

    // Step 3: Implement changes with Gemini Computer Use (optional)
    const shouldImplement = process.argv.includes('--implement');

    if (shouldImplement) {
      console.log('🤖 Step 3: Implementing changes with Gemini Computer Use...');
      const implementationPlugin = createGeminiImplementationPlugin();
      const changes = await implementationPlugin.implementChanges!(
        designSpec,
        process.cwd() // Use current directory for demo
      );
      console.log('✅ Implementation complete');
      console.log(`   Files modified: ${changes.files.length}`);
      console.log(`   ${changes.summary}\n`);

      // Display file changes
      changes.files.forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.type.toUpperCase()}: ${file.path}`);
      });
    } else {
      console.log('ℹ️  Skipping implementation (use --implement flag to enable)');
    }

    console.log('\n✨ Demo complete!');
    console.log('\nNext steps:');
    console.log('  1. Review the recommendations above');
    console.log('  2. Run with --implement to apply changes');
    console.log(
      '  3. Configure VIZTRTR to use Gemini models (see examples/gemini-config-example.ts)'
    );
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run demo
runGeminiDemo().catch(console.error);
