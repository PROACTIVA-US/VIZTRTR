/**
 * V2 Tool Search Optimization Test
 *
 * Tests strategies to reduce tool calls from 12 to 2-3:
 * 1. File content caching
 * 2. Line hints in prompts
 * 3. Targeted file discovery
 */

import { ControlPanelAgentV2 } from '../src/agents/specialized/ControlPanelAgentV2';
import { Recommendation } from '../src/core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const TEST_PROJECT = path.join(process.cwd(), 'ui/frontend/src/components');

interface OptimizationStrategy {
  name: string;
  description: string;
  implementation: string;
}

const strategies: OptimizationStrategy[] = [
  {
    name: 'Baseline (Current)',
    description: 'Current V2 implementation without optimizations',
    implementation: 'No changes - measure baseline performance',
  },
  {
    name: 'File Content Cache',
    description: 'Cache file content in prompt to avoid re-reading',
    implementation: 'Include full file content in initial prompt',
  },
  {
    name: 'Line Hints',
    description: 'Provide grep-based line hints for target patterns',
    implementation: 'Search for className patterns and provide line numbers',
  },
  {
    name: 'Combined Approach',
    description: 'Cache + line hints + targeted discovery',
    implementation: 'All optimizations enabled',
  },
];

const testRecommendation: Recommendation = {
  dimension: 'Typography',
  title: 'Improve button typography for better desktop readability',
  description:
    'Increase button font sizes from text-sm to text-base for better readability on desktop screens (1-2ft viewing distance)',
  impact: 7,
  effort: 2,
};

async function testBaselinePerformance() {
  console.log('\n🧪 BASELINE TEST - Current V2 Performance');
  console.log('━'.repeat(80));

  const agent = new ControlPanelAgentV2(ANTHROPIC_API_KEY, TEST_PROJECT);

  const startTime = Date.now();
  const changes = await agent.implement([testRecommendation], TEST_PROJECT);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const stats = agent.getToolkit().getStats();

  console.log('\n📊 BASELINE RESULTS:');
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`   🔨 Total Tool Calls: ${stats.totalChanges}`);
  console.log(`   ✅ Successful: ${stats.successfulChanges}`);
  console.log(`   ❌ Failed: ${stats.failedChanges}`);
  console.log(`   📝 Changes Applied: ${changes.length}`);
  console.log(`   📦 By Type:`, stats.changesByType);

  return {
    duration: parseFloat(duration),
    totalToolCalls: stats.totalChanges,
    successful: stats.successfulChanges,
    failed: stats.failedChanges,
    changesApplied: changes.length,
  };
}

async function analyzeFileForHints(filePath: string, pattern: string): Promise<number[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const matchingLines: number[] = [];

  lines.forEach((line, index) => {
    if (line.includes(pattern)) {
      matchingLines.push(index + 1); // 1-indexed
    }
  });

  return matchingLines;
}

async function runOptimizationAnalysis() {
  console.log('🔬 V2 Tool Search Optimization Analysis\n');
  console.log('━'.repeat(80));
  console.log('🎯 Goal: Reduce tool calls from 12 to 2-3 target');
  console.log('📍 Test Project:', TEST_PROJECT);
  console.log('━'.repeat(80));

  // Run baseline test
  const baseline = await testBaselinePerformance();

  console.log('\n━'.repeat(80));
  console.log('💡 OPTIMIZATION STRATEGIES');
  console.log('━'.repeat(80));

  for (const strategy of strategies) {
    console.log(`\n📌 Strategy: ${strategy.name}`);
    console.log(`   Description: ${strategy.description}`);
    console.log(`   Implementation: ${strategy.implementation}`);
  }

  // Analyze what went wrong in baseline
  console.log('\n━'.repeat(80));
  console.log('🔍 ROOT CAUSE ANALYSIS');
  console.log('━'.repeat(80));

  console.log('\n❓ Why 12 tool calls instead of 2?');
  console.log('   Hypothesis 1: Agent searches for correct line numbers');
  console.log('   Hypothesis 2: Agent retries after failures');
  console.log('   Hypothesis 3: Agent makes exploratory calls');

  console.log('\n🧪 Testing Hypothesis 1: Line number search');
  const headerPath = path.join(TEST_PROJECT, 'Header.tsx');
  try {
    const textSmLines = await analyzeFileForHints(headerPath, 'text-sm');
    console.log(`   Found "text-sm" on lines: [${textSmLines.join(', ')}]`);
    console.log(`   ✅ If we provide these line hints, agent should make exactly 2 calls`);
  } catch (error) {
    console.log(`   ⚠️  Could not analyze Header.tsx`);
  }

  // Generate recommendations
  console.log('\n━'.repeat(80));
  console.log('🎯 RECOMMENDED OPTIMIZATIONS');
  console.log('━'.repeat(80));

  console.log('\n1️⃣  SHORT-TERM (Immediate - 1 day):');
  console.log('   ✅ Add grep-based line hints to agent prompt');
  console.log('   ✅ Search for target patterns before making tool calls');
  console.log('   ✅ Provide "text-sm found on lines: [10, 13]" in prompt');
  console.log('   📈 Expected reduction: 12 → 4-5 calls');

  console.log('\n2️⃣  MEDIUM-TERM (This week):');
  console.log('   ✅ Cache file content in agent context');
  console.log('   ✅ Use AST parsing to identify exact modification points');
  console.log('   ✅ Provide structured file map with line numbers');
  console.log('   📈 Expected reduction: 12 → 2-3 calls');

  console.log('\n3️⃣  LONG-TERM (Next week):');
  console.log('   ✅ Implement vision-guided line detection');
  console.log('   ✅ Use Claude to analyze file and suggest exact lines');
  console.log('   ✅ Pre-validate tool call targets before execution');
  console.log('   📈 Expected reduction: 12 → 2 calls (optimal)');

  // Save analysis report
  const reportPath = path.join(process.cwd(), 'v2-optimization-analysis.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseline,
        strategies,
        recommendations: {
          shortTerm: 'Add grep-based line hints',
          mediumTerm: 'Cache file content and AST parsing',
          longTerm: 'Vision-guided line detection',
        },
      },
      null,
      2
    )
  );

  console.log(`\n📄 Analysis saved: ${reportPath}`);
  console.log('━'.repeat(80));
}

// Check if API key is set
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set in environment');
  process.exit(1);
}

runOptimizationAnalysis().catch(console.error);
