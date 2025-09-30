/**
 * Tests for VIZTRITR Orchestrator
 */

import { VIZTRITROrchestrator } from '../orchestrator';
import { VIZTRITRConfig } from '../types';

describe('VIZTRITROrchestrator', () => {
  const mockConfig: VIZTRITRConfig = {
    projectPath: '/mock/project',
    frontendUrl: 'http://localhost:3000',
    targetScore: 8.5,
    maxIterations: 5,
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',
    anthropicApiKey: 'test-key',
    screenshotConfig: {
      width: 1440,
      height: 900,
      fullPage: false,
    },
    outputDir: './test-output',
  };

  it('should initialize with config', () => {
    const orchestrator = new VIZTRITROrchestrator(mockConfig);
    expect(orchestrator).toBeInstanceOf(VIZTRITROrchestrator);
  });

  it('should have required plugins', () => {
    const orchestrator = new VIZTRITROrchestrator(mockConfig);
    expect(orchestrator['visionPlugin']).toBeDefined();
    expect(orchestrator['implementationPlugin']).toBeDefined();
    expect(orchestrator['capturePlugin']).toBeDefined();
  });

  // Integration tests would go here
  // These would require mocking the Anthropic API and Puppeteer
});
