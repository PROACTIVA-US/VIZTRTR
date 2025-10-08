/**
 * Screenshot Debug Test
 *
 * Investigates the Performia black screen screenshot issue.
 * Tests multiple capture configurations to identify the root cause.
 */

import { PuppeteerCapturePlugin } from '../src/plugins/capture-puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const PERFORMIA_URL = 'http://localhost:5001';
const OUTPUT_DIR = path.join(process.cwd(), 'screenshot-debug-output');

interface TestCase {
  name: string;
  config: {
    width: number;
    height: number;
    fullPage?: boolean;
    selector?: string;
    waitFor?: string;
    delay?: number;
  };
}

const testCases: TestCase[] = [
  {
    name: '01-default-viewport',
    config: {
      width: 1920,
      height: 1080,
      fullPage: false,
    },
  },
  {
    name: '02-with-delay-1s',
    config: {
      width: 1920,
      height: 1080,
      fullPage: false,
      delay: 1000,
    },
  },
  {
    name: '03-with-delay-3s',
    config: {
      width: 1920,
      height: 1080,
      fullPage: false,
      delay: 3000,
    },
  },
  {
    name: '04-wait-for-root',
    config: {
      width: 1920,
      height: 1080,
      fullPage: false,
      waitFor: '#root',
      delay: 2000,
    },
  },
  {
    name: '05-full-page',
    config: {
      width: 1920,
      height: 1080,
      fullPage: true,
      delay: 2000,
    },
  },
  {
    name: '06-smaller-viewport',
    config: {
      width: 1280,
      height: 720,
      fullPage: false,
      delay: 2000,
    },
  },
  {
    name: '07-wait-domcontentloaded',
    config: {
      width: 1920,
      height: 1080,
      fullPage: false,
      delay: 5000, // Longer wait to ensure React hydration
    },
  },
];

async function runScreenshotTests() {
  console.log('🧪 Screenshot Debug Test - Performia Black Screen Investigation\n');
  console.log('━'.repeat(80));
  console.log(`📍 Target URL: ${PERFORMIA_URL}`);
  console.log(`📁 Output Dir: ${OUTPUT_DIR}`);
  console.log(`🔬 Test Cases: ${testCases.length}`);
  console.log('━'.repeat(80));
  console.log();

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const plugin = new PuppeteerCapturePlugin();
  await plugin.init();

  const results: Array<{ name: string; success: boolean; error?: string; path?: string }> = [];

  for (const testCase of testCases) {
    console.log(`\n📸 Test: ${testCase.name}`);
    console.log(`   Config:`, JSON.stringify(testCase.config, null, 2).replace(/\n/g, '\n   '));

    try {
      const screenshot = await plugin.captureScreenshot(PERFORMIA_URL, testCase.config);

      // Save screenshot to output directory
      const outputPath = path.join(OUTPUT_DIR, `${testCase.name}.png`);
      const buffer = Buffer.from(screenshot.data, 'base64');
      await fs.writeFile(outputPath, buffer);

      console.log(`   ✅ Success: ${outputPath}`);
      console.log(`   📊 Size: ${(buffer.length / 1024).toFixed(2)} KB`);

      results.push({
        name: testCase.name,
        success: true,
        path: outputPath,
      });
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
      results.push({
        name: testCase.name,
        success: false,
        error: String(error),
      });
    }
  }

  await plugin.close();

  // Summary report
  console.log('\n' + '━'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('━'.repeat(80));

  const successful = results.filter(r => r.success).length;
  console.log(`\n✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successful}/${results.length}`);

  console.log('\n📋 RESULTS:');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.name}`);
    if (result.path) {
      console.log(`      → ${result.path}`);
    }
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  // Save results to JSON
  const reportPath = path.join(OUTPUT_DIR, 'test-results.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        url: PERFORMIA_URL,
        totalTests: testCases.length,
        successful,
        failed: results.length - successful,
        results,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Report saved: ${reportPath}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Open screenshots in screenshot-debug-output/');
  console.log('   2. Compare image sizes and content');
  console.log('   3. Identify which delay/config produces correct captures');
  console.log('   4. Update PuppeteerCapturePlugin defaults if needed');
  console.log('━'.repeat(80));
}

runScreenshotTests().catch(console.error);
