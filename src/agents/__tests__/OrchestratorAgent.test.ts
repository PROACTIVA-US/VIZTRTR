/**
 * Unit tests for OrchestratorAgent
 */

import { OrchestratorAgent } from '../OrchestratorAgent';
import { DesignSpec } from '../../core/types';
import * as fileDiscovery from '../../utils/file-discovery';

// Mock the file discovery module
jest.mock('../../utils/file-discovery');

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                decisions: [
                  {
                    agent: 'ControlPanelAgent',
                    recommendations: [],
                    reasoning: 'Test routing',
                    priority: 'high',
                  },
                ],
                strategy: 'Test strategy',
                expectedImpact: 'Test impact',
              }),
            },
          ],
        }),
      },
    })),
  };
});

// Mock specialist agents
jest.mock('../specialized/ControlPanelAgent', () => ({
  ControlPanelAgent: jest.fn().mockImplementation(() => ({
    implement: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../specialized/TeleprompterAgent', () => ({
  TeleprompterAgent: jest.fn().mockImplementation(() => ({
    implement: jest.fn().mockResolvedValue([]),
  })),
}));

describe('OrchestratorAgent', () => {
  const mockApiKey = 'test-api-key';
  let agent: OrchestratorAgent;

  const mockSpec: DesignSpec = {
    iteration: 0,
    timestamp: new Date(),
    currentScore: 5.0,
    currentIssues: [],
    recommendations: [],
    prioritizedChanges: [],
    estimatedNewScore: 7.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new OrchestratorAgent(mockApiKey);
  });

  describe('implementChanges', () => {
    it('should discover files in project successfully', async () => {
      const mockFiles = [
        { name: 'Component.tsx', path: 'src/components/Component.tsx', size: 1024 },
        { name: 'Page.tsx', path: 'src/pages/Page.tsx', size: 2048 },
      ];

      (fileDiscovery.discoverComponentFiles as jest.Mock).mockResolvedValue(mockFiles);

      const result = await agent.implementChanges(mockSpec, '/test/project');

      expect(fileDiscovery.discoverComponentFiles).toHaveBeenCalledWith('/test/project', {
        maxFileSize: 50 * 1024,
        includeContent: false,
      });

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('should handle empty project gracefully', async () => {
      (fileDiscovery.discoverComponentFiles as jest.Mock).mockResolvedValue([]);

      const result = await agent.implementChanges(mockSpec, '/empty/project');

      expect(result.files).toEqual([]);
      expect(result.summary).toContain('No component files found');
    });

    it('should throw error when file discovery fails', async () => {
      (fileDiscovery.discoverComponentFiles as jest.Mock).mockRejectedValue(
        new Error('File system error')
      );

      await expect(agent.implementChanges(mockSpec, '/invalid/path')).rejects.toThrow(
        'Failed to discover project files'
      );
    });

    it('should cache discovered files for same project path', async () => {
      const mockFiles = [
        { name: 'Component.tsx', path: 'src/components/Component.tsx', size: 1024 },
      ];

      (fileDiscovery.discoverComponentFiles as jest.Mock).mockResolvedValue(mockFiles);

      // First call
      await agent.implementChanges(mockSpec, '/test/project');
      expect(fileDiscovery.discoverComponentFiles).toHaveBeenCalledTimes(1);

      // Second call with same path should use cache
      await agent.implementChanges(mockSpec, '/test/project');
      expect(fileDiscovery.discoverComponentFiles).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should discover files separately for different projects', async () => {
      const mockFiles1 = [{ name: 'A.tsx', path: 'src/A.tsx', size: 1024 }];
      const mockFiles2 = [{ name: 'B.tsx', path: 'src/B.tsx', size: 2048 }];

      (fileDiscovery.discoverComponentFiles as jest.Mock)
        .mockResolvedValueOnce(mockFiles1)
        .mockResolvedValueOnce(mockFiles2);

      await agent.implementChanges(mockSpec, '/project1');
      await agent.implementChanges(mockSpec, '/project2');

      expect(fileDiscovery.discoverComponentFiles).toHaveBeenCalledTimes(2);
      expect(fileDiscovery.discoverComponentFiles).toHaveBeenNthCalledWith(1, '/project1', expect.any(Object));
      expect(fileDiscovery.discoverComponentFiles).toHaveBeenNthCalledWith(2, '/project2', expect.any(Object));
    });
  });
});
