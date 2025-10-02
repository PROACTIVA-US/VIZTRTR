/**
 * Projects API routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { VIZTRTRDatabase } from '../services/database.js';
import { detectProjectType } from '../services/projectDetector.js';
import { analyzePRD, analyzePRDFromFile, mergeAnalysisWithDetection } from '../services/prdAnalyzer.js';
import { generateProductSpec, saveProductSpec, loadProductSpec, updateProductSpec } from '../services/productSpecGenerator.js';
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

  // Create project with optional PRD
  router.post('/', async (req: Request, res: Response) => {
    try {
      const data = CreateProjectSchema.parse(req.body);
      const { prd, prdFilePath } = req.body;

      // Create project
      const project = db.createProject({
        ...data,
        targetScore: data.targetScore ?? 8.5,
        maxIterations: data.maxIterations ?? 5
      });

      // Get PRD text (either from body or file)
      let prdText = '';
      if (prdFilePath && typeof prdFilePath === 'string' && prdFilePath.trim()) {
        const filePath = path.resolve(prdFilePath.trim());
        if (!fs.existsSync(filePath)) {
          return res.status(400).json({ error: 'PRD file not found' });
        }
        prdText = await fs.promises.readFile(filePath, 'utf-8');
      } else if (prd && typeof prd === 'string' && prd.trim()) {
        prdText = prd;
      }

      // If PRD provided, generate and save product spec
      if (prdText) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        // Detect components for context
        const detection = await detectProjectType(project.projectPath);

        // Prepare Docling data if available
        let doclingData;
        if (prdFilePath && typeof prdFilePath === 'string' && prdFilePath.trim()) {
          const filePath = path.resolve(prdFilePath.trim());
          const docling = await import('./services/doclingService.js');
          const service = new docling.DoclingService();
          const parsed = await service.parsePRD(filePath);
          doclingData = {
            tables: parsed.tables,
            metadata: parsed.metadata
          };
        }

        // Generate structured spec
        const spec = await generateProductSpec(
          project.id,
          prdText,
          detection.detectedComponents,
          apiKey,
          doclingData
        );

        // Save to workspace
        await saveProductSpec(spec, project.workspacePath);

        // Update project to mark it has spec
        db.updateProject(project.id, { hasProductSpec: true });
      }

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

  // Auto-detect project configuration with optional PRD analysis
  router.post('/detect', async (req: Request, res: Response) => {
    try {
      const { projectPath, prd, prdFilePath } = req.body;

      if (!projectPath || typeof projectPath !== 'string') {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      // Validate path exists
      if (!fs.existsSync(projectPath)) {
        return res.status(400).json({ error: 'Project path does not exist' });
      }

      // Component-based detection
      let detection = await detectProjectType(projectPath);

      // If PRD provided, analyze it and merge insights
      if (prdFilePath && typeof prdFilePath === 'string' && prdFilePath.trim()) {
        const filePath = path.resolve(prdFilePath.trim());
        if (!fs.existsSync(filePath)) {
          return res.status(400).json({ error: 'PRD file not found' });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        // Use Docling to parse file (PDF, DOCX, etc.)
        const prdAnalysis = await analyzePRDFromFile(filePath, apiKey);
        detection = mergeAnalysisWithDetection(prdAnalysis, detection);
      } else if (prd && typeof prd === 'string' && prd.trim()) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        // Analyze text directly
        const prdAnalysis = await analyzePRD(prd, apiKey);
        detection = mergeAnalysisWithDetection(prdAnalysis, detection);
      }

      res.json(detection);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze project'
      });
    }
  });

  // Get runs for a project
  router.get('/:id/runs', (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const runs = db.listRuns(req.params.id);
      res.json(runs);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get runs'
      });
    }
  });

  // Get product spec for a project
  router.get('/:id/spec', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const spec = await loadProductSpec(project.workspacePath);
      if (!spec) {
        return res.status(404).json({ error: 'Product spec not found' });
      }

      res.json(spec);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load product spec'
      });
    }
  });

  // Update product spec for a project
  router.put('/:id/spec', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const currentSpec = await loadProductSpec(project.workspacePath);
      if (!currentSpec) {
        return res.status(404).json({ error: 'Product spec not found' });
      }

      const updated = await updateProductSpec(currentSpec, req.body, project.workspacePath);
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update product spec'
      });
    }
  });

  // Start a new run for a project
  router.post('/:id/runs', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Create run record
      const run = db.createRun(project.id, project.maxIterations);

      // Start execution in background
      executeRun(run.id, project, db).catch(error => {
        console.error(`Run ${run.id} failed:`, error);
        db.updateRun(run.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        });
      });

      res.status(201).json(run);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start run'
      });
    }
  });

  return router;
}

/**
 * Execute a VIZTRTR run in the background
 */
async function executeRun(runId: string, project: any, db: VIZTRTRDatabase) {
  const { VIZTRTROrchestrator } = await import('../../../dist/core/orchestrator.js');

  // Update status to running
  db.updateRun(runId, { status: 'running' });

  const config = {
    projectPath: path.resolve(project.projectPath),
    frontendUrl: project.frontendUrl,
    targetScore: project.targetScore,
    maxIterations: project.maxIterations,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    outputDir: path.join(process.cwd(), 'viztrtr-output', runId),
    verbose: true,
  };

  const orchestrator = new VIZTRTROrchestrator(config);

  // Hook into iteration updates
  const originalRun = orchestrator.run.bind(orchestrator);
  orchestrator.run = async function() {
    const result = await originalRun();

    // Update run with final results
    db.updateRun(runId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      currentIteration: result.iterations.length
    });

    db.saveRunResult(runId, result);

    return result;
  };

  await orchestrator.run();
}
