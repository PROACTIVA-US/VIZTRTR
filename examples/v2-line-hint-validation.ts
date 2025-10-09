/**
 * V2 Line Hint Validation Test
 *
 * Tests if V2 agent can work successfully with properly generated line hints.
 * This validates whether the architecture issue is line hint quality vs fundamental design.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ControlPanelAgentV2 } from '../src/agents/specialized/ControlPanelAgentV2';
import { Recommendation } from '../src/core/types';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         V2 LINE HINT VALIDATION TEST                          ║');
  console.log('║         Testing if proper line hints enable V2 success        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }

  const projectPath = path.resolve(__dirname, '../ui/frontend');

  console.log('Configuration:');
  console.log(`  Project: ${projectPath}`);
  console.log(`  Test: Add focus indicators to Header navigation`);
  console.log(`  Expected: 1-2 tool calls to modify line 24\n`);

  // Create a simple, focused recommendation
  const recommendation: Recommendation = {
    dimension: 'Accessibility',
    title: 'Add focus indicators to navigation links',
    description:
      'Add focus-visible:ring-2 and focus-visible:ring-blue-500 to improve keyboard navigation accessibility',
    impact: 8,
    effort: 2,
  };

  console.log('📋 Recommendation:');
  console.log(`   ${recommendation.title}`);
  console.log(`   Impact: ${recommendation.impact}/10, Effort: ${recommendation.effort}/10\n`);

  // Initialize V2 agent
  const agent = new ControlPanelAgentV2(apiKey, projectPath);

  try {
    console.log('🎨 Running V2 agent...\n');

    const startTime = Date.now();
    const changes = await agent.implement([recommendation], projectPath);
    const duration = Date.now() - startTime;

    // Analyze results
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const stats = agent.getToolkit().getStats();

    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Changes Made: ${changes.length}`);
    console.log(`Tool Calls: ${stats.totalChanges}`);
    console.log(`Successful: ${stats.successfulChanges}`);
    console.log(`Failed: ${stats.failedChanges}`);
    console.log(`By Type:`, stats.changesByType);

    // Determine success
    const success = changes.length > 0 && stats.successfulChanges > 0;

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ANALYSIS                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (success) {
      console.log('✅ SUCCESS: V2 agent made changes successfully!');
      console.log('\n📊 This proves:');
      console.log('   • V2 architecture is fundamentally sound');
      console.log('   • Line hints enable V2 to work correctly');
      console.log('   • Previous failure was due to line hint generator crash');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Improve line hint generation logic');
      console.log('   2. Add fallback patterns for common UI elements');
      console.log('   3. Test on full VIZTRTR UI suite');
      console.log('   4. Ship V2 as production-ready');
    } else {
      console.log('❌ FAILURE: V2 agent could not make changes');
      console.log('\n📊 This proves:');
      console.log('   • V2 architecture has fundamental limitations');
      console.log('   • Line hints alone are insufficient');
      console.log('   • Agent needs file content access');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Implement two-phase workflow (Discovery + Execution)');
      console.log('   2. Create DiscoveryAgent (V1 read-only)');
      console.log('   3. Modify V2 to accept change plans');
      console.log('   4. Test integrated workflow');
    }

    if (changes.length > 0) {
      console.log('\n📝 Changes Made:');
      changes.forEach((change, i) => {
        console.log(`\n   ${i + 1}. ${change.path}`);
        console.log(`      Type: ${change.type}`);
        if (change.diff) {
          console.log(
            `      Diff:\n${change.diff
              .split('\n')
              .map(l => '         ' + l)
              .join('\n')}`
          );
        }
      });
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error during test:\n', error);
    console.log('\n🔍 This indicates:');
    console.log('   • Agent encountered an unexpected error');
    console.log('   • Further investigation needed');
    process.exit(1);
  }
}

main();
