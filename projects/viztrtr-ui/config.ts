/**
 * VIZTRTR UI Self-Improvement Configuration
 *
 * This configuration enables VIZTRTR to analyze and improve its own web interface.
 * The goal is to validate the system can achieve 8.5+/10 design quality score.
 */

import { VIZTRTRConfig } from '../../src/core/types';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Find the actual project root (where package.json is)
// When compiled, __dirname is in dist/projects/viztrtr-ui
// We need to go up 3 levels: dist/projects/viztrtr-ui -> dist/projects -> dist -> VIZTRTR
const projectRoot = path.resolve(__dirname, '../../..');
const uiFrontendPath = path.join(projectRoot, 'ui/frontend');

export const config: VIZTRTRConfig = {
  // Project Path
  projectPath: uiFrontendPath,

  // Frontend URL (must be running)
  frontendUrl: 'http://localhost:5173',

  // Quality Targets
  targetScore: 8.5,
  maxIterations: 5,

  // Model Configuration
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Screenshot Configuration
  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: true, // Capture full page for comprehensive analysis
  },

  // Output Directory (IMPORTANT: Must be inside project root)
  outputDir: path.join(projectRoot, 'viztritr-output/viztrtr-ui-self-test'),

  // Logging
  verbose: true,

  // Human-in-the-loop approval (Phase 2)
  humanLoop: {
    enabled: true,
    approvalRequired: 'always', // Require approval for every iteration
    costThreshold: 100, // 100 cents = $1.00
    riskThreshold: 'low', // Show all changes, even low-risk ones
    enablePromptRefinement: true,
    enableMemoryAnnotation: true,
  },
};

// Validation
if (!config.anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

console.log('✅ VIZTRTR UI Self-Test Configuration:');
console.log(`   Project Path: ${config.projectPath}`);
console.log(`   Frontend URL: ${config.frontendUrl}`);
console.log(`   Target Score: ${config.targetScore}/10`);
console.log(`   Max Iterations: ${config.maxIterations}`);
console.log(`   Output Dir: ${config.outputDir}`);
