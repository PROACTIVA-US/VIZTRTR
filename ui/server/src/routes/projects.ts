/**
 * Projects API routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { VIZTRTRDatabase } from '../services/database.js';
import type { CreateProjectRequest } from '../types.js';

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  projectPath: z.string().min(1),
  frontendUrl: z.string().url(),
  targetScore: z.number().min(0).max(10).optional(),
  maxIterations: z.number().int().min(1).max(20).optional()
});

export function createProjectsRouter(db: VIZTRTRDatabase): Router {
  const router = Router();

  // List all projects
  router.get('/', (req: Request, res: Response) => {
    try {
      const projects = db.listProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list projects'
      });
    }
  });

  // Get single project
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get project'
      });
    }
  });

  // Create project
  router.post('/', (req: Request, res: Response) => {
    try {
      const data = CreateProjectSchema.parse(req.body);
      const project = db.createProject({
        ...data,
        targetScore: data.targetScore ?? 8.5,
        maxIterations: data.maxIterations ?? 5
      });
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create project'
      });
    }
  });

  // Update project
  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      db.updateProject(req.params.id, req.body);
      const updated = db.getProject(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update project'
      });
    }
  });

  // Delete project
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      db.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete project'
      });
    }
  });

  return router;
}
