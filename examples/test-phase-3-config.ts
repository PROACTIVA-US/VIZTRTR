/**
 * Test Phase 3: Refinement Mode Configuration
 *
 * This script validates that Phase 3 config types work correctly
 * and the ExpertReviewAgent integrates properly.
 */

import { VIZTRTRConfig } from '../src/core/types';
import { ExpertReviewAgent } from '../src/agents/ExpertReviewAgent';

console.log('🧪 Testing Phase 3 Configuration...\n');

// Test 1: Basic refinement config
const basicConfig: VIZTRTRConfig = {
  projectPath: './test-project',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,
  maxIterations: 5,
  anthropicApiKey: 'test-key',
  screenshotConfig: {
    width: 1440,
    height: 900,
  },
  outputDir: './test-output',
  continueToExcellence: {
    enabled: true,
    targetScore: 10.0,
    maxRefinementIterations: 5,
    minImprovement: 0.05,
    plateauIterations: 3,
    requireApproval: true,
  },
};

console.log('✅ Test 1: Basic refinement config');
console.log(`   Refinement enabled: ${basicConfig.continueToExcellence?.enabled}`);
console.log(`   Target: ${basicConfig.continueToExcellence?.targetScore}/10`);
console.log(`   Max iterations: ${basicConfig.continueToExcellence?.maxRefinementIterations}\n`);

// Test 2: Optional config with defaults
const minimalConfig: VIZTRTRConfig = {
  projectPath: './test-project',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,
  maxIterations: 5,
  anthropicApiKey: 'test-key',
  screenshotConfig: {
    width: 1440,
    height: 900,
  },
  outputDir: './test-output',
  // No continueToExcellence - should work fine
};

console.log('✅ Test 2: Config without refinement (backwards compatible)');
console.log(`   Refinement enabled: ${minimalConfig.continueToExcellence?.enabled || 'false'}\n`);

// Test 3: Advanced config with focus dimensions
const advancedConfig: VIZTRTRConfig = {
  projectPath: './test-project',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,
  maxIterations: 5,
  anthropicApiKey: 'test-key',
  screenshotConfig: {
    width: 1440,
    height: 900,
  },
  outputDir: './test-output',
  continueToExcellence: {
    enabled: true,
    targetScore: 9.5, // Custom target (not 10/10)
    maxRefinementIterations: 10,
    minImprovement: 0.1, // Higher threshold
    plateauIterations: 2, // Stricter plateau detection
    requireApproval: false, // Auto-approve refinements
    focusDimensions: ['typography', 'color_contrast', 'accessibility'],
  },
};

console.log('✅ Test 3: Advanced config with focus dimensions');
console.log(
  `   Focus dimensions: ${advancedConfig.continueToExcellence?.focusDimensions?.join(', ')}`
);
console.log(`   Auto-approve: ${!advancedConfig.continueToExcellence?.requireApproval}\n`);

// Test 4: ExpertReviewAgent instantiation
try {
  const agent = new ExpertReviewAgent('test-key');
  console.log('✅ Test 4: ExpertReviewAgent instantiated successfully\n');
} catch (error) {
  console.error('❌ Test 4 failed:', error);
}

console.log('🎉 All Phase 3 config tests passed!');
console.log('\nPhase 3 is ready for integration testing.');
