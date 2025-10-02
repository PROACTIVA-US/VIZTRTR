import * as path from 'path';
import { VIZTRTRConfig, ProjectContext, HumanLoopConfig } from './core/types';

export function getConfig(): VIZTRTRConfig {
  const projectContext: ProjectContext = {
    name: 'Performia Living Chart',
    type: 'teleprompter',
    description: 'Stage teleprompter for live musical performances',
    focusAreas: ['Lyrics display', 'Chord charts', 'Song structure', 'Scrolling controls'],
    avoidAreas: ['Development tools', 'Code editors', 'Build status'],
  };

  const humanLoop: HumanLoopConfig = {
    enabled: false,
    approvalRequired: 'never',
    costThreshold: 100,
    riskThreshold: 'high',
  };

  return {
    projectPath: path.resolve(__dirname, '../../Performia/frontend'),
    frontendUrl: 'http://localhost:5001',
    targetScore: 8.5,
    maxIterations: 3,
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    screenshotConfig: { width: 1920, height: 1080, fullPage: false },
    outputDir: path.resolve(__dirname, '../performia-output'),
    verbose: true,
    projectContext,
    humanLoop,
  };
}
