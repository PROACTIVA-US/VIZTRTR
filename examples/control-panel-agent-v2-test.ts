/**
 * ControlPanelAgentV2 Test
 *
 * Tests the constrained tools integration with ControlPanelAgent
 */

import { ControlPanelAgentV2 } from '../src/agents/specialized/ControlPanelAgentV2';
import { Recommendation } from '../src/core/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log('🧪 ControlPanelAgentV2 Integration Test\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  // Create temporary test project
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'viztrtr-cpv2-'));

  try {
    // Create a test component structure
    const componentsDir = path.join(testDir, 'src', 'components');
    await fs.mkdir(componentsDir, { recursive: true });

    const headerFile = path.join(componentsDir, 'Header.tsx');
    await fs.writeFile(
      headerFile,
      `export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <nav className="mt-2">
          <button className="bg-blue-500 text-sm px-3 py-2 rounded">
            Settings
          </button>
        </nav>
      </div>
    </header>
  );
}`,
      'utf-8'
    );

    console.log('📄 Test Component Created:');
    console.log(await fs.readFile(headerFile, 'utf-8'));
    console.log('\n---\n');

    // Create design recommendation
    const recommendation: Recommendation = {
      dimension: 'typography',
      title: 'Improve button typography for better readability',
      description:
        'Increase button font size from text-sm to text-base for better desktop readability',
      impact: 7,
      effort: 2,
    };

    console.log('🎨 Design Recommendation:');
    console.log(`  Dimension: ${recommendation.dimension}`);
    console.log(`  Title: ${recommendation.title}`);
    console.log(`  Description: ${recommendation.description}`);
    console.log(`  Impact: ${recommendation.impact}/10`);
    console.log(`  Effort: ${recommendation.effort}/10`);
    console.log('\n---\n');

    // Initialize agent
    const agent = new ControlPanelAgentV2(apiKey, testDir);

    // Execute recommendation
    console.log('🤖 Executing Agent...\n');
    const changes = await agent.implement([recommendation], testDir);

    console.log('\n---\n');

    if (changes.length === 0) {
      console.error('❌ No changes were made');
      process.exit(1);
    }

    // Show results
    console.log('📊 Results:');
    console.log(`  Changes Made: ${changes.length}`);
    console.log();

    for (const change of changes) {
      console.log(`📝 File: ${change.path}`);
      console.log(`   Type: ${change.type}`);
      console.log();
      if (change.diff) {
        console.log('   Diff:');
        console.log(
          change.diff
            .split('\n')
            .map(line => `   ${line}`)
            .join('\n')
        );
        console.log();
      }
    }

    // Show final component
    console.log('📄 Final Component:');
    console.log(await fs.readFile(headerFile, 'utf-8'));
    console.log('\n---\n');

    // Show toolkit statistics
    const toolkit = agent.getToolkit();
    const stats = toolkit.getStats();
    console.log('📊 Toolkit Statistics:');
    console.log(`  Total Changes: ${stats.totalChanges}`);
    console.log(`  Successful: ${stats.successfulChanges}`);
    console.log(`  Failed: ${stats.failedChanges}`);
    console.log(`  By Type:`, stats.changesByType);

    // Validate expectations
    const finalContent = await fs.readFile(headerFile, 'utf-8');

    console.log('\n✅ Validation:');
    if (finalContent.includes('text-base')) {
      console.log('  ✅ Button className updated to text-base');
    } else {
      console.log('  ❌ Button className NOT updated');
    }

    if (!finalContent.includes('text-sm')) {
      console.log('  ✅ Old text-sm className removed');
    } else {
      console.log('  ❌ Old text-sm className still present');
    }

    // Check that structural changes were not made
    if (finalContent.includes('export default function Header')) {
      console.log('  ✅ Component structure preserved');
    } else {
      console.log('  ❌ Component structure changed');
    }

    console.log('\n✅ ControlPanelAgentV2 test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

runTest();
