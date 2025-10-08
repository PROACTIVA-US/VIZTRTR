/**
 * Micro-Change Toolkit Test
 *
 * Tests the constrained tools system with real file modifications
 */

import { MicroChangeToolkit } from '../src/tools/MicroChangeToolkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function runTests() {
  console.log('🧪 Micro-Change Toolkit Tests\n');

  // Create a temporary test directory
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'viztrtr-test-'));
  const toolkit = new MicroChangeToolkit(testDir);

  try {
    // Test 1: updateClassName
    console.log('Test 1: updateClassName');
    const testFile1 = path.join(testDir, 'Button.tsx');
    await fs.writeFile(
      testFile1,
      `export default function Button() {
  return <button className="bg-blue-500 text-sm px-4 py-2">Click</button>;
}`,
      'utf-8'
    );

    const result1 = await toolkit.updateClassName({
      filePath: 'Button.tsx',
      lineNumber: 2,
      oldClassName: 'text-sm',
      newClassName: 'text-base',
    });

    console.log(`  ✅ Success: ${result1.success}`);
    console.log(`  📝 Before: ${result1.before}`);
    console.log(`  📝 After:  ${result1.after}\n`);

    // Test 2: updateStyleValue
    console.log('Test 2: updateStyleValue');
    const testFile2 = path.join(testDir, 'Card.tsx');
    await fs.writeFile(
      testFile2,
      `export default function Card() {
  return <div style={{ fontSize: '14px', padding: '8px' }}>Content</div>;
}`,
      'utf-8'
    );

    const result2 = await toolkit.updateStyleValue({
      filePath: 'Card.tsx',
      lineNumber: 2,
      property: 'fontSize',
      oldValue: '14px',
      newValue: '16px',
    });

    console.log(`  ✅ Success: ${result2.success}`);
    console.log(`  📝 Before: ${result2.before}`);
    console.log(`  📝 After:  ${result2.after}\n`);

    // Test 3: updateTextContent
    console.log('Test 3: updateTextContent');
    const testFile3 = path.join(testDir, 'Header.tsx');
    await fs.writeFile(
      testFile3,
      `export default function Header() {
  return <h1>Dashboard</h1>;
}`,
      'utf-8'
    );

    const result3 = await toolkit.updateTextContent({
      filePath: 'Header.tsx',
      lineNumber: 2,
      oldText: 'Dashboard',
      newText: 'Overview',
    });

    console.log(`  ✅ Success: ${result3.success}`);
    console.log(`  📝 Before: ${result3.before}`);
    console.log(`  📝 After:  ${result3.after}\n`);

    // Test 4: Error handling - invalid line number
    console.log('Test 4: Error handling (invalid line number)');
    const result4 = await toolkit.updateClassName({
      filePath: 'Button.tsx',
      lineNumber: 999,
      oldClassName: 'text-sm',
      newClassName: 'text-base',
    });

    console.log(`  ❌ Success: ${result4.success}`);
    console.log(`  ⚠️  Error: ${result4.error}\n`);

    // Test 5: Error handling - className not found
    console.log('Test 5: Error handling (className not found)');
    const result5 = await toolkit.updateClassName({
      filePath: 'Button.tsx',
      lineNumber: 2,
      oldClassName: 'nonexistent-class',
      newClassName: 'text-base',
    });

    console.log(`  ❌ Success: ${result5.success}`);
    console.log(`  ⚠️  Error: ${result5.error}\n`);

    // Print statistics
    console.log('📊 Change Statistics:');
    const stats = toolkit.getStats();
    console.log(`  Total Changes: ${stats.totalChanges}`);
    console.log(`  Successful: ${stats.successfulChanges}`);
    console.log(`  Failed: ${stats.failedChanges}`);
    console.log(`  By Type:`, stats.changesByType);

    // Print change log
    console.log('\n📋 Full Change Log:');
    const log = toolkit.getChangeLog();
    log.forEach((change, i) => {
      console.log(`  ${i + 1}. [${change.changeType}] ${change.filePath}:${change.lineNumber}`);
      console.log(`     ${change.success ? '✅' : '❌'} ${change.before} → ${change.after}`);
      if (change.error) {
        console.log(`     Error: ${change.error}`);
      }
    });

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

runTests();
