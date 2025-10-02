/**
 * VIZTRTR Self-Improvement Configuration
 *
 * This configuration sets up VIZTRTR to iterate on and improve its own UI.
 * Meta-strategy: The system uses AI vision and implementation to autonomously
 * improve the interface through which users interact with VIZTRTR itself.
 */

import * as path from 'path';
import { VIZTRTRConfig, ProjectContext, HumanLoopConfig } from './core/types';

// Get API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    'ANTHROPIC_API_KEY environment variable is required. Please set it in your .env file.'
  );
}

// Layer 1: Project Context
const projectContext: ProjectContext = {
  name: 'VIZTRTR Web UI Builder',
  type: 'web-builder',
  description:
    'AI-powered development tool interface with prompt inputs, agent monitoring cards, build status displays, and control panels for managing autonomous UI improvements',
  focusAreas: [
    'Form inputs and text areas',
    'Agent monitoring cards',
    'Build status indicators',
    'Control panel buttons and toggles',
    'Navigation headers',
    'Status badges and labels',
  ],
  avoidAreas: [
    'Teleprompter displays',
    'Music chord charts',
    'Stage performance UI',
    'Lyric displays',
    'Song structure editors',
  ],
};

// Layer 4: Human-in-the-Loop Configuration
const humanLoop: HumanLoopConfig = {
  enabled: true,
  approvalRequired: 'high-risk', // Require approval for high-risk changes
  costThreshold: 50, // cents
  riskThreshold: 'medium',
  enablePromptRefinement: false, // Phase 2.6 feature
  enableMemoryAnnotation: false, // Phase 2.7 feature
};

/**
 * Configuration for VIZTRTR to improve its own UI
 *
 * Project: VIZTRTR Frontend Interface
 * Target: Achieve a 9.0/10 design score (excellent quality)
 * Strategy: Iterative AI-driven improvements with memory-based learning
 */
export const config: VIZTRTRConfig = {
  // Project settings
  projectPath: path.resolve(__dirname, '../ui/frontend'),
  frontendUrl: 'http://localhost:3000',
  targetScore: 9.0,
  maxIterations: 2,

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
  outputDir: path.resolve(__dirname, '../viztrtr-output'),
  verbose: true,

  // Phase 2.5: Layered Defense
  projectContext,
  humanLoop,
};

export default config;
