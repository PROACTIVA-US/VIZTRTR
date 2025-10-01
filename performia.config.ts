/**
 * VIZTRTR Configuration for Performia Living Chart
 *
 * Test Case: Music performance platform with complex interactive UI
 * Focus: Living Chart teleprompter and blueprint editor views
 */

import { VIZTRITRConfig } from './src/types';
import * as dotenv from 'dotenv';

dotenv.config();

export const performiaConfig: VIZTRITRConfig = {
  // Project Settings
  projectPath: '/Users/danielconnolly/Projects/Performia/frontend',
  frontendUrl: 'http://localhost:5001',
  targetScore: 8.5,
  maxIterations: 5,

  // AI Models
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',

  // API Credentials
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Screenshot Configuration
  screenshotConfig: {
    width: 1440,      // Desktop viewport
    height: 900,      // Typical performance screen ratio
    fullPage: false,  // Capture visible viewport only
    selector: '#root' // Performia React root element
  },

  // Output Directory
  outputDir: '/Users/danielconnolly/Projects/Performia/viztritr-output',

  // Verbose logging
  verbose: true
};

export default performiaConfig;
