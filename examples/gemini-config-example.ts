/**
 * Example configuration for using Gemini models with VIZTRTR
 */

import type { VIZTRTRConfig } from '../src/core/types';
import * as path from 'path';

export const geminiConfig: VIZTRTRConfig = {
  // Project settings
  projectPath: '/path/to/your/frontend/project',
  frontendUrl: 'http://localhost:5173',
  targetScore: 8.5,
  maxIterations: 5,

  // Gemini-based model configuration
  providers: {
    google: {
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    },
  },

  models: {
    // Use Gemini 2.0 Flash for vision analysis (fast, cost-effective)
    vision: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.3,
      maxTokens: 4096,
    },

    // Use Gemini 2.5 Computer Use for implementation (browser automation)
    implementation: {
      provider: 'google',
      model: 'gemini-2.5-computer-use-preview-10-2025',
      temperature: 0.2,
      maxTokens: 8192,
    },

    // Use Gemini 1.5 Pro for evaluation (detailed analysis)
    evaluation: {
      provider: 'google',
      model: 'gemini-1.5-pro',
      temperature: 0.1,
      maxTokens: 2048,
    },
  },

  // Screenshot configuration
  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: false,
  },

  // Output directory
  outputDir: path.join(__dirname, '../viztritr-output'),

  // Verbose logging
  verbose: true,

  // Project context (optional)
  projectContext: {
    name: 'My Web App',
    type: 'general',
    description: 'Modern web application built with React and Tailwind',
    focusAreas: ['User experience', 'Visual polish', 'Accessibility'],
    avoidAreas: ['Backend logic', 'API routes'],
  },

  // Human-in-the-loop (optional)
  humanLoop: {
    enabled: true,
    approvalRequired: 'high-risk',
    costThreshold: 100, // cents
    riskThreshold: 'medium',
  },
};

/**
 * Alternative: Hybrid configuration with Claude for vision, Gemini for implementation
 */
export const hybridConfig: VIZTRTRConfig = {
  projectPath: '/path/to/your/frontend/project',
  frontendUrl: 'http://localhost:5173',
  targetScore: 8.5,
  maxIterations: 5,

  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    google: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
  },

  models: {
    // Claude Opus 4 for vision (best-in-class analysis)
    vision: {
      provider: 'anthropic',
      model: 'claude-opus-4-20250514',
      temperature: 0.3,
    },

    // Gemini Computer Use for implementation (browser automation)
    implementation: {
      provider: 'google',
      model: 'gemini-2.5-computer-use-preview-10-2025',
      temperature: 0.2,
    },

    // Claude Sonnet for evaluation (fast, accurate)
    evaluation: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5-20250402',
      temperature: 0.1,
    },
  },

  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: false,
  },

  outputDir: path.join(__dirname, '../viztritr-output'),
  verbose: true,
};
