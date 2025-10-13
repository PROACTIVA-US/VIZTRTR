/**
 * Gemini Computer Use Test Configuration
 */

import { VIZTRTRConfig } from '../../src/core/types';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const projectRoot = path.resolve(__dirname, '../../..');
const testProjectPath = path.join(projectRoot, 'projects/gemini-test');

export const config: VIZTRTRConfig = {
  projectPath: testProjectPath,
  frontendUrl: 'http://localhost:8080',
  targetScore: 8.5,
  maxIterations: 3,
  visionModel: 'claude-opus',
  implementationModel: 'custom', // Use Gemini Computer Use plugin directly
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: true,
  },
  outputDir: path.join(projectRoot, 'viztritr-output/gemini-test'),
  verbose: true,
};

if (!config.anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY required');
}

if (!config.googleApiKey) {
  throw new Error('GOOGLE_API_KEY required');
}
