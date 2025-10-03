/**
 * Integration tests for /api/projects/analyze endpoint
 */
import request from 'supertest';
import express from 'express';
import analyzeRouter from '../routes/analyze';

const app = express();
app.use(express.json());
app.use('/api', analyzeRouter);

describe('POST /api/projects/analyze', () => {
  describe('Input Validation', () => {
    it('should reject missing projectId', async () => {
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectPath: '/some/path' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject missing projectPath', async () => {
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectId: 'proj_123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject non-string projectId', async () => {
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectId: 123, projectPath: '/some/path' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be strings');
    });

    it('should reject non-string projectPath', async () => {
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectId: 'proj_123', projectPath: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be strings');
    });

    it('should reject non-string PRD', async () => {
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({
          projectId: 'proj_123',
          projectPath: '/some/path',
          userProvidedPRD: { invalid: 'object' }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be a string');
    });

    it('should reject PRD exceeding max length', async () => {
      const longPRD = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({
          projectId: 'proj_123',
          projectPath: '/some/path',
          userProvidedPRD: longPRD
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('maximum length');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const projectId = `proj_${Date.now()}`;

      // Make 5 rapid requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/projects/analyze')
          .send({ projectId, projectPath: '/some/path' });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectId, projectPath: '/some/path' });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should track rate limits per project', async () => {
      const projectId1 = `proj_${Date.now()}_1`;
      const projectId2 = `proj_${Date.now()}_2`;

      // Make 5 requests for project 1
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/projects/analyze')
          .send({ projectId: projectId1, projectPath: '/some/path' });
      }

      // Project 2 should still be allowed (different project)
      const response = await request(app)
        .post('/api/projects/analyze')
        .send({ projectId: projectId2, projectPath: '/some/path' });

      // Won't be 429 - will be different error (project not found, etc)
      expect(response.status).not.toBe(429);
    });
  });
});
