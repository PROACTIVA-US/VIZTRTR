/**
 * Unit tests for /api/projects routes
 */
import request from 'supertest';
import express from 'express';
import { VIZTRTRDatabase } from '../services/database';
import { createProjectsRouter } from '../routes/projects';

// Mock database
const mockDb = {
  getProject: jest.fn(),
  createRun: jest.fn(),
  updateRun: jest.fn(),
} as unknown as VIZTRTRDatabase;

const app = express();
app.use(express.json());
app.use('/api/projects', createProjectsRouter(mockDb));

describe('POST /api/projects/:id/runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject runs on VIZTRTR UI port 5173', async () => {
    const mockProject = {
      id: 'proj_test',
      name: 'Test Project',
      projectPath: '/test/path',
      frontendUrl: 'http://localhost:5173',
      targetScore: 8.5,
      maxIterations: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (mockDb.getProject as jest.Mock).mockReturnValue(mockProject);

    const response = await request(app).post('/api/projects/proj_test/runs').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('5173');
    expect(response.body.error).toContain('VIZTRTR UI');
    expect(response.body.suggestion).toContain('different port');
    expect(mockDb.createRun).not.toHaveBeenCalled();
  });

  it('should allow runs on other ports', async () => {
    const mockProject = {
      id: 'proj_test',
      name: 'Test Project',
      projectPath: '/test/path',
      frontendUrl: 'http://localhost:5001',
      targetScore: 8.5,
      maxIterations: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockRun = {
      id: 'run_test',
      projectId: 'proj_test',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    (mockDb.getProject as jest.Mock).mockReturnValue(mockProject);
    (mockDb.createRun as jest.Mock).mockReturnValue(mockRun);

    const response = await request(app).post('/api/projects/proj_test/runs').send({});

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockRun);
    expect(mockDb.createRun).toHaveBeenCalledWith('proj_test', 5);
  });

  it('should reject runs when project not found', async () => {
    (mockDb.getProject as jest.Mock).mockReturnValue(null);

    const response = await request(app).post('/api/projects/nonexistent/runs').send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });

  it('should handle invalid URL formats gracefully', async () => {
    const mockProject = {
      id: 'proj_test',
      name: 'Test Project',
      projectPath: '/test/path',
      frontendUrl: 'not-a-valid-url',
      targetScore: 8.5,
      maxIterations: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockRun = {
      id: 'run_test',
      projectId: 'proj_test',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    (mockDb.getProject as jest.Mock).mockReturnValue(mockProject);
    (mockDb.createRun as jest.Mock).mockReturnValue(mockRun);

    // Should not throw error, just skip port check
    const response = await request(app).post('/api/projects/proj_test/runs').send({});

    expect(response.status).toBe(201);
    expect(mockDb.createRun).toHaveBeenCalled();
  });

  it('should respect VITE_PORT environment variable', async () => {
    const originalPort = process.env.VITE_PORT;
    process.env.VITE_PORT = '3000';

    const mockProject = {
      id: 'proj_test',
      name: 'Test Project',
      projectPath: '/test/path',
      frontendUrl: 'http://localhost:3000',
      targetScore: 8.5,
      maxIterations: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (mockDb.getProject as jest.Mock).mockReturnValue(mockProject);

    const response = await request(app).post('/api/projects/proj_test/runs').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('3000');

    // Restore original value
    if (originalPort) {
      process.env.VITE_PORT = originalPort;
    } else {
      delete process.env.VITE_PORT;
    }
  });
});
