/**
 * Measure Design System Violation Rate
 *
 * Tests the effectiveness of design system constraints added to vision prompts.
 * Expected: <5% violation rate (down from 40% before Step 4)
 *
 * Run: npm run build && node dist/examples/measure-violation-rate.js
 */

import { ClaudeOpusVisionPlugin } from '../src/plugins/vision-claude.js';
import { PuppeteerCapturePlugin } from '../src/plugins/capture-puppeteer.js';
import { Recommendation } from '../src/core/types.js';
import * as fs from 'fs';
import * as path from 'path';

interface ViolationAnalysis {
  totalRecommendations: number;
  violatingRecommendations: number;
  violationRate: number;
  violations: Array<{
    recommendation: string;
    violationType: string;
    forbiddenClass: string;
  }>;
}

// Forbidden classes in dark theme (from designSystem.ts)
const FORBIDDEN_CLASSES = [
  'bg-white',
  'bg-gray-50',
  'bg-gray-100',
  'text-black',
  'text-gray-900',
  'border-gray-200',
  'border-gray-300',
];

async function analyzeViolations(): Promise<ViolationAnalysis> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     DESIGN SYSTEM VIOLATION RATE MEASUREMENT                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Capture screenshot
  console.log('📸 Step 1: Capturing screenshot of VIZTRTR UI...');
  const capturePlugin = new PuppeteerCapturePlugin();
  const screenshot = await capturePlugin.captureScreenshot('http://localhost:5173', {
    width: 1920,
    height: 1080,
    fullPage: false,
  });
  console.log(`✅ Screenshot captured: ${screenshot.path}\n`);

  // Step 2: Get vision analysis with design system constraints
  console.log('🔍 Step 2: Analyzing UI with design system constraints...');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  const visionPlugin = new ClaudeOpusVisionPlugin(apiKey);
  const analysis = await visionPlugin.analyzeScreenshot(screenshot);

  console.log(`✅ Analysis complete. Score: ${analysis.currentScore}/10`);
  console.log(`✅ Recommendations: ${analysis.recommendations.length}\n`);

  // Step 3: Check each recommendation for violations
  console.log('🔍 Step 3: Checking recommendations for design system violations...\n');

  const violations: Array<{
    recommendation: string;
    violationType: string;
    forbiddenClass: string;
  }> = [];

  analysis.recommendations.forEach((rec: Recommendation, idx: number) => {
    console.log(`   ${idx + 1}. [${rec.dimension}] ${rec.title}`);
    const codeSnippet = rec.code || '';
    console.log(`      Code snippet: ${codeSnippet.substring(0, 80)}...`);

    // Check for forbidden classes
    FORBIDDEN_CLASSES.forEach((forbiddenClass) => {
      if (codeSnippet.includes(forbiddenClass)) {
        violations.push({
          recommendation: rec.title,
          violationType: 'forbidden_class',
          forbiddenClass,
        });
        console.log(`      ❌ VIOLATION: Contains forbidden class "${forbiddenClass}"`);
      }
    });

    if (!violations.some(v => v.recommendation === rec.title)) {
      console.log(`      ✅ No violations detected`);
    }
    console.log('');
  });

  // Step 4: Calculate violation rate
  const violationRate = (violations.length / analysis.recommendations.length) * 100;

  const result: ViolationAnalysis = {
    totalRecommendations: analysis.recommendations.length,
    violatingRecommendations: violations.length,
    violationRate,
    violations,
  };

  // Step 5: Save results
  const outputPath = './violation-rate-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`💾 Results saved to ${outputPath}\n`);

  return result;
}

async function main() {
  try {
    const result = await analyzeViolations();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      RESULTS SUMMARY                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total Recommendations: ${result.totalRecommendations}`);
    console.log(`❌ Violating Recommendations: ${result.violatingRecommendations}`);
    console.log(`📈 Violation Rate: ${result.violationRate.toFixed(1)}%\n`);

    if (result.violationRate === 0) {
      console.log('✅ SUCCESS: 0% violation rate achieved!');
      console.log('   Design system constraints are 100% effective.\n');
    } else if (result.violationRate < 5) {
      console.log('✅ SUCCESS: Violation rate <5% (target achieved)');
      console.log('   Step 4 is sufficient, Step 5 not needed.\n');
    } else if (result.violationRate < 10) {
      console.log('⚠️  WARNING: Violation rate <10% but >5%');
      console.log('   Monitor for next iteration, may need Step 5.\n');
    } else {
      console.log('❌ FAILURE: Violation rate >10%');
      console.log('   Step 5 (approval workflow rearchitecture) required.\n');
    }

    // Show violations if any
    if (result.violations.length > 0) {
      console.log('📋 Violations Detected:\n');
      result.violations.forEach((v, idx) => {
        console.log(`   ${idx + 1}. ${v.recommendation}`);
        console.log(`      Forbidden: ${v.forbiddenClass}\n`);
      });
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    NEXT STEPS                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (result.violationRate < 10) {
      console.log('1. ✅ Step 4 validated as sufficient');
      console.log('2. 📦 Create production deployment PR');
      console.log('3. 🚀 Deploy to production');
    } else {
      console.log('1. ❌ Step 4 insufficient');
      console.log('2. 🔧 Implement Step 5: Move approval after validation');
      console.log('3. 🧪 Re-test violation rate');
    }

    console.log('');
    process.exit(result.violationRate >= 10 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error during violation analysis:', error);
    process.exit(1);
  }
}

main();
