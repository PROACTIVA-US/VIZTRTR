/**
 * Chrome DevTools MCP Integration Test
 *
 * Tests the MCP client connection and metrics capture
 */

import { createChromeDevToolsClient } from '../../src/services/chromeDevToolsClient';

async function testChromeDevTools() {
  console.log('🧪 Starting Chrome DevTools MCP Integration Test\n');

  const client = createChromeDevToolsClient({
    headless: false,
    viewport: '1280x720',
    isolated: true,
  });

  try {
    // Test 1: Connection
    console.log('📡 Test 1: Connecting to MCP server...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Test 2: Navigation
    const testUrl = 'http://localhost:3000';
    console.log(`🌐 Test 2: Navigating to ${testUrl}...`);
    await client.navigateTo(testUrl);
    console.log('✅ Navigation successful\n');

    // Test 3: Performance Metrics
    console.log('⚡ Test 3: Capturing performance metrics...');
    const perfTrace = await client.capturePerformanceTrace(testUrl);
    console.log('Performance Metrics:');
    console.log(`  - LCP: ${perfTrace.coreWebVitals.lcp}ms`);
    console.log(`  - FID: ${perfTrace.coreWebVitals.fid}ms`);
    console.log(`  - CLS: ${perfTrace.coreWebVitals.cls}`);
    console.log(`  - FCP: ${perfTrace.metrics.firstContentfulPaint}ms`);
    console.log(`  - TTI: ${perfTrace.metrics.timeToInteractive}ms`);
    console.log('✅ Performance capture successful\n');

    // Test 4: Accessibility Snapshot
    console.log('♿ Test 4: Capturing accessibility snapshot...');
    const a11ySnapshot = await client.captureAccessibilitySnapshot(testUrl);
    console.log('Accessibility Results:');
    console.log(`  - Violations: ${a11ySnapshot.violations.length}`);
    console.log(`  - Warnings: ${a11ySnapshot.warnings.length}`);
    console.log(`  - ARIA Roles: ${a11ySnapshot.ariaRoles.length}`);
    if (a11ySnapshot.violations.length > 0) {
      console.log('\n  Top Violations:');
      a11ySnapshot.violations.slice(0, 3).forEach((v, i) => {
        console.log(`    ${i + 1}. ${v.type}: ${v.message}`);
      });
    }
    console.log('✅ Accessibility capture successful\n');

    // Test 5: Network Requests
    console.log('🌐 Test 5: Capturing network requests...');
    const networkRequests = await client.captureNetworkRequests(testUrl);
    console.log('Network Analysis:');
    console.log(`  - Total Requests: ${networkRequests.length}`);
    const totalSize = networkRequests.reduce((sum, r) => sum + r.size, 0);
    console.log(`  - Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
    const avgTime =
      networkRequests.reduce((sum, r) => sum + r.timing.duration, 0) / networkRequests.length;
    console.log(`  - Avg Request Time: ${avgTime.toFixed(2)}ms`);
    console.log('✅ Network capture successful\n');

    // Test 6: Console Messages
    console.log('📝 Test 6: Capturing console messages...');
    const consoleMessages = await client.captureConsoleMessages(testUrl);
    console.log('Console Activity:');
    console.log(`  - Total Messages: ${consoleMessages.length}`);
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warn');
    console.log(`  - Errors: ${errors.length}`);
    console.log(`  - Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('\n  Recent Errors:');
      errors.slice(0, 3).forEach((e, i) => {
        console.log(`    ${i + 1}. ${e.text}`);
      });
    }
    console.log('✅ Console capture successful\n');

    // Test 7: Screenshot
    console.log('📸 Test 7: Taking screenshot...');
    const screenshot = await client.takeScreenshot({
      fullPage: true,
      format: 'png',
    });
    console.log(`  - Screenshot captured: ${screenshot.length} characters (base64)`);
    console.log('✅ Screenshot capture successful\n');

    // Test 8: All Metrics at Once
    console.log('🎯 Test 8: Capturing all metrics simultaneously...');
    const allMetrics = await client.captureAllMetrics(testUrl);
    console.log('Complete Metrics:');
    console.log('  Performance:');
    console.log(`    - LCP: ${allMetrics.performance.coreWebVitals.lcp}ms`);
    console.log(`    - CLS: ${allMetrics.performance.coreWebVitals.cls}`);
    console.log('  Accessibility:');
    console.log(`    - Violations: ${allMetrics.accessibility.violations.length}`);
    console.log(`    - Contrast Issues: ${allMetrics.accessibility.contrastIssues.length}`);
    console.log('  Network:');
    console.log(`    - Requests: ${allMetrics.network.length}`);
    console.log('  Console:');
    console.log(`    - Errors: ${allMetrics.console.filter(m => m.type === 'error').length}`);
    console.log('✅ All metrics captured successfully\n');

    // Disconnect
    console.log('🔌 Disconnecting...');
    await client.disconnect();
    console.log('✅ Disconnected\n');

    console.log('🎉 All tests passed!');
    console.log('\n📊 Summary:');
    console.log('  - MCP Connection: ✅');
    console.log('  - Navigation: ✅');
    console.log('  - Performance Metrics: ✅');
    console.log('  - Accessibility: ✅');
    console.log('  - Network Analysis: ✅');
    console.log('  - Console Monitoring: ✅');
    console.log('  - Screenshot: ✅');
    console.log('  - Combined Metrics: ✅');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testChromeDevTools();
