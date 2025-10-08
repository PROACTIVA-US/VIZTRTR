/**
 * VIZTRTR Self-Improvement Configuration
 *
 * This configuration sets up VIZTRTR to iterate on and improve its own UI.
 * Meta-strategy: The system uses AI vision and implementation to autonomously
 * improve the interface through which users interact with VIZTRTR itself.
 */

import * as path from 'path';
import { VIZTRTRConfig } from '../../src/core/types';

// Get API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    'ANTHROPIC_API_KEY environment variable is required. Please set it in your .env file.'
  );
}

/**
 * Configuration for VIZTRTR to improve its own UI
 *
 * Project: VIZTRTR Frontend Interface
 * Target: Achieve a 9.0/10 design score (excellent quality)
 * Strategy: Iterative AI-driven improvements with memory-based learning
 */
export const config: VIZTRTRConfig = {
  // Project settings
  projectPath: path.resolve(__dirname, '../../ui/frontend'),
  frontendUrl: 'http://localhost:5173',
  targetScore: 9.0,
  maxIterations: 1,

  // AI Model selection
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',

  // API credentials
  anthropicApiKey: ANTHROPIC_API_KEY,

  // Screenshot configuration
  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: true, // Capture full scrollable page
  },

  // Output configuration
  outputDir: path.resolve(__dirname, './viztrtr-output'),
  verbose: true,
};

export default config;
