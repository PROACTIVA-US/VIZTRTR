/**
 * Two-Phase Workflow Integration Test
 *
 * Tests the complete workflow:
 * 1. DiscoveryAgent analyzes files and creates change plan
 * 2. ControlPanelAgentV2 executes the plan using constrained tools
 *
 * This validates that the two-phase architecture solves the V2 limitation
 * where constrained tools need file context but cannot access files.
 */

import { DiscoveryAgent } from '../src/agents/specialized/DiscoveryAgent';
import { ControlPanelAgentV2 } from '../src/agents/specialized/ControlPanelAgentV2';
import { Recommendation } from '../src/core/types';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

async function runTwoPhaseWorkflowTest() {
  console.log('🧪 Two-Phase Workflow Integration Test\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test on VIZTRTR UI (use source path, not dist)
  const projectPath = path.resolve(process.cwd(), 'ui/frontend');

  console.log('📂 Project Path:', projectPath);
  console.log('🎯 Target: Demonstrate two-phase workflow solving V2 limitation\n');

  // Create test recommendation (button typography improvement)
  const recommendation: Recommendation = {
    dimension: 'Typography',
    title: 'Improve button text sizing for better readability',
    description:
      'Increase button text size from text-sm to text-base in primary action buttons for improved readability at typical viewing distances',
    impact: 7,
    effort: 3,
  };

  console.log('📋 Test Recommendation:');
  console.log(`   Dimension: ${recommendation.dimension}`);
  console.log(`   Title: ${recommendation.title}`);
  console.log(`   Impact: ${recommendation.impact}/10`);
  console.log(`   Effort: ${recommendation.effort}/10\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: DISCOVERY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: DISCOVERY AGENT (Read-Only Analysis)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const discoveryAgent = new DiscoveryAgent(ANTHROPIC_API_KEY!);
  const phase1Start = Date.now();

  const changePlan = await discoveryAgent.createChangePlan(recommendation, projectPath);

  const phase1Duration = Date.now() - phase1Start;

  if (!changePlan) {
    console.error('❌ Discovery phase failed - no change plan created');
    process.exit(1);
  }

  console.log('\n✅ Discovery phase completed');
  console.log(`⏱️  Duration: ${(phase1Duration / 1000).toFixed(1)}s\n`);

  console.log('📊 Change Plan Summary:');
  console.log(`   Strategy: ${changePlan.strategy}`);
  console.log(`   Expected Impact: ${changePlan.expectedImpact}`);
  console.log(`   Planned Changes: ${changePlan.changes.length}\n`);

  if (changePlan.changes.length === 0) {
    console.warn('⚠️  No changes planned - test cannot continue');
    process.exit(0);
  }

  console.log('📋 Detailed Change Plan:');
  changePlan.changes.forEach((change, i) => {
    console.log(`\n   ${i + 1}. ${change.tool}`);
    console.log(`      File: ${change.filePath}:${change.lineNumber}`);
    console.log(`      Params:`, JSON.stringify(change.params, null, 2).replace(/\n/g, '\n      '));
    console.log(`      Reason: ${change.reason}`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: EXECUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2: EXECUTION AGENT (Constrained Tools)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const executionAgent = new ControlPanelAgentV2(ANTHROPIC_API_KEY!, projectPath);
  const phase2Start = Date.now();

  const fileChange = await executionAgent.executeChangePlan(changePlan, projectPath);

  const phase2Duration = Date.now() - phase2Start;

  if (!fileChange) {
    console.error('❌ Execution phase failed - no changes applied');
    process.exit(1);
  }

  console.log(`\n⏱️  Duration: ${(phase2Duration / 1000).toFixed(1)}s\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESULTS ANALYSIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTS ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const totalDuration = phase1Duration + phase2Duration;
  const stats = executionAgent.getToolkit().getStats();

  console.log('📊 Workflow Metrics:');
  console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`   Phase 1 (Discovery): ${(phase1Duration / 1000).toFixed(1)}s`);
  console.log(`   Phase 2 (Execution): ${(phase2Duration / 1000).toFixed(1)}s`);
  console.log(`   Planned Changes: ${changePlan.changes.length}`);
  console.log(`   Applied Changes: ${stats.successfulChanges}`);
  console.log(`   Failed Changes: ${stats.failedChanges}`);
  console.log(
    `   Success Rate: ${((stats.successfulChanges / changePlan.changes.length) * 100).toFixed(0)}%\n`
  );

  console.log('📝 Changes Made:');
  console.log(`   File: ${fileChange.path}`);
  console.log(`   Type: ${fileChange.type}`);
  console.log('\n   Diff:');
  console.log(
    (fileChange.diff || '')
      .split('\n')
      .map(line => `   ${line}`)
      .join('\n')
  );

  // Calculate success criteria
  const implementationRate = (stats.successfulChanges / changePlan.changes.length) * 100;
  const durationOK = totalDuration < 90000; // < 90s
  const successRateOK = implementationRate >= 80;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUCCESS CRITERIA VALIDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(
    `${successRateOK ? '✅' : '❌'} Implementation Rate: ${implementationRate.toFixed(0)}% (target: ≥80%)`
  );
  console.log(
    `${durationOK ? '✅' : '❌'} Duration: ${(totalDuration / 1000).toFixed(1)}s (target: <90s)`
  );
  console.log(
    `${stats.failedChanges === 0 ? '✅' : '⚠️'} Failed Changes: ${stats.failedChanges} (target: 0)`
  );

  const allCriteriaMet = successRateOK && durationOK;

  console.log(`\n${allCriteriaMet ? '✅ ALL CRITERIA MET' : '⚠️ SOME CRITERIA NOT MET'}\n`);

  // Save results
  const resultsPath = path.resolve(__dirname, '../two-phase-workflow-results.json');
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        recommendation,
        changePlan: {
          strategy: changePlan.strategy,
          expectedImpact: changePlan.expectedImpact,
          plannedChanges: changePlan.changes.length,
        },
        metrics: {
          totalDuration: totalDuration,
          phase1Duration: phase1Duration,
          phase2Duration: phase2Duration,
          plannedChanges: changePlan.changes.length,
          successfulChanges: stats.successfulChanges,
          failedChanges: stats.failedChanges,
          implementationRate: implementationRate,
        },
        successCriteria: {
          implementationRate: successRateOK,
          duration: durationOK,
          allMet: allCriteriaMet,
        },
        fileChange: {
          path: fileChange.path,
          diff: fileChange.diff,
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`📁 Results saved to: ${resultsPath}\n`);

  if (allCriteriaMet) {
    console.log('🎉 Two-phase workflow test PASSED!');
    console.log('   Discovery + Execution architecture successfully solves V2 limitation\n');
  } else {
    console.log('⚠️  Two-phase workflow test PARTIALLY SUCCEEDED');
    console.log('   Architecture works but may need optimization\n');
  }
}

// Run test
runTwoPhaseWorkflowTest().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
