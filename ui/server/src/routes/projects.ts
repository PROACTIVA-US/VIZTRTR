/**
 * Projects API routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { VIZTRTRDatabase } from '../services/database';
import { detectProjectType } from '../services/projectDetector';
import {
  analyzePRD,
  analyzePRDFromFile,
  mergeAnalysisWithDetection,
} from '../services/prdAnalyzer';
import {
  generateProductSpec,
  saveProductSpec,
  loadProductSpec,
  updateProductSpec,
} from '../services/productSpecGenerator';
import type { CreateProjectRequest } from '../types';

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  projectPath: z.string().min(1),
  frontendUrl: z.string().url(),
  targetScore: z.number().min(0).max(10).optional(),
  maxIterations: z.number().int().min(1).max(20).optional(),
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
        error: error instanceof Error ? error.message : 'Failed to list projects',
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
        error: error instanceof Error ? error.message : 'Failed to get project',
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
        maxIterations: data.maxIterations ?? 5,
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
          const docling = await import('../services/doclingService');
          const service = new docling.DoclingService();
          const parsed = await service.parsePRD(filePath);
          doclingData = {
            tables: parsed.tables,
            metadata: parsed.metadata,
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
        error: error instanceof Error ? error.message : 'Failed to create project',
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
        error: error instanceof Error ? error.message : 'Failed to update project',
      });
    }
  });

  // Delete project
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      console.log(`[DELETE] Deleting project: ${req.params.id}`);
      const project = db.getProject(req.params.id);
      if (!project) {
        console.log(`[DELETE] Project not found: ${req.params.id}`);
        return res.status(404).json({ error: 'Project not found' });
      }

      console.log(`[DELETE] Project found, deleting...`);
      db.deleteProject(req.params.id);
      console.log(`[DELETE] Project deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error(`[DELETE] Error deleting project:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete project',
      });
    }
  });

  // Auto-detect frontend URL from package.json
  router.post('/detect-url', async (req: Request, res: Response) => {
    try {
      const { projectPath } = req.body;

      if (!projectPath || typeof projectPath !== 'string') {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      // Validate path exists
      if (!fs.existsSync(projectPath)) {
        return res.status(400).json({ error: 'Project path does not exist' });
      }

      // Look for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return res.json({ url: null, message: 'No package.json found' });
      }

      // Parse package.json
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Try to extract port from dev script
      const devScript = packageJson.scripts?.dev || packageJson.scripts?.start || '';

      // Common patterns: vite (5173), next (3000), create-react-app (3000)
      const candidatePorts: number[] = [];

      // Try to read vite.config.ts/js for custom port
      let vitePort: number | null = null;
      const viteConfigPaths = [
        path.join(projectPath, 'vite.config.ts'),
        path.join(projectPath, 'vite.config.js'),
      ];

      for (const configPath of viteConfigPaths) {
        try {
          if (fs.existsSync(configPath)) {
            const viteConfig = fs.readFileSync(configPath, 'utf-8');
            const portMatch = viteConfig.match(/port:\s*(\d+)/);
            if (portMatch) {
              vitePort = parseInt(portMatch[1], 10);
              console.log(`[URL Detection] Found vite port in config: ${vitePort}`);
              break;
            }
          }
        } catch (error) {
          // Config file read failed, continue
        }
      }

      // Prioritize vite.config port if found
      if (vitePort) {
        candidatePorts.push(vitePort);
      }

      // Then check script for explicit port flags
      const portMatch = devScript.match(/(?:--port|-p)\s+(\d+)/);
      if (portMatch) {
        candidatePorts.push(parseInt(portMatch[1], 10));
      }

      // Then default ports based on framework
      if (devScript.includes('vite')) {
        candidatePorts.push(5173);
      } else if (devScript.includes('next')) {
        candidatePorts.push(3000);
      } else {
        candidatePorts.push(3000); // Default
      }

      // Also check common alternative ports (but prioritize detected ports)
      candidatePorts.push(5001, 5174, 3001, 4000, 8080);

      // Test each port to see if server is actually running AND matches the project
      const testUrl = async (port: number): Promise<{ url: string; match: boolean } | null> => {
        const url = `http://localhost:${port}`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);

          // Fetch the HTML to check page title and meta tags
          const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            return null;
          }

          // Get HTML content to verify it's the right project
          const html = await response.text();

          // Extract project name from package.json for matching
          const projectName = packageJson.name || '';
          const projectDisplayName = packageJson.displayName || projectName;

          // Check for project identifiers in HTML
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';

          // Check if title or HTML contains project name
          const nameInTitle =
            title.toLowerCase().includes(projectName.toLowerCase()) ||
            title.toLowerCase().includes(projectDisplayName.toLowerCase());
          const nameInHtml =
            html.toLowerCase().includes(projectName.toLowerCase()) ||
            html.toLowerCase().includes(projectDisplayName.toLowerCase());

          // Also check for Vite dev server signature (means it's a dev server)
          const isDevServer = html.includes('__vite') || html.includes('@vite/client');

          const isMatch = nameInTitle || (nameInHtml && isDevServer);

          console.log(
            `[URL Detection] Server at ${url}: title="${title}", projectName="${projectName}", match=${isMatch}`
          );

          return { url, match: isMatch };
        } catch (error) {
          // Server not running on this port
          return null;
        }
      };

      // Test ports in order, prioritizing matches
      let firstRunningServer: { url: string; match: boolean } | null = null;

      for (const port of candidatePorts) {
        const result = await testUrl(port);
        if (result) {
          // If it's a match, use it immediately
          if (result.match) {
            return res.json({
              url: result.url,
              verified: true,
              matched: true,
              message: 'Server verified and project matched',
            });
          }
          // Otherwise, keep track of first running server as fallback
          if (!firstRunningServer) {
            firstRunningServer = result;
          }
        }
      }

      // If we found a running server but no match, warn the user
      if (firstRunningServer) {
        return res.json({
          url: firstRunningServer.url,
          verified: true,
          matched: false,
          message:
            'Server is running but project name does not match. Please verify this is the correct project.',
        });
      }

      // No running server found, return best guess
      const defaultUrl = `http://localhost:${candidatePorts[0]}`;
      console.log(
        `[URL Detection] No running server found. Suggesting ${defaultUrl} based on package.json`
      );
      res.json({
        url: defaultUrl,
        verified: false,
        message: 'Server not currently running. Please start your frontend dev server.',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to detect URL',
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
        error: error instanceof Error ? error.message : 'Failed to analyze project',
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
        error: error instanceof Error ? error.message : 'Failed to get runs',
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
        error: error instanceof Error ? error.message : 'Failed to load product spec',
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
        error: error instanceof Error ? error.message : 'Failed to update product spec',
      });
    }
  });

  // Analyze PRD and generate product spec
  router.post('/:id/analyze-prd', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { prd, prdFilePath } = req.body;

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
      } else {
        return res.status(400).json({ error: 'PRD text or file path is required' });
      }

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
        const docling = await import('../services/doclingService');
        const service = new docling.DoclingService();
        const parsed = await service.parsePRD(filePath);
        doclingData = {
          tables: parsed.tables,
          metadata: parsed.metadata,
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

      res.json(spec);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze PRD',
      });
    }
  });

  // Project chat - AI assistant for project questions
  router.post('/:id/chat', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const { message, history = [], context } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
      }

      // Load product spec for context
      const productSpec = await loadProductSpec(project.workspacePath);

      // Use Claude to answer questions
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey });

      // Build system prompt with context
      const systemPrompt = `You are an AI assistant helping edit and refine a product specification for a VIZTRTR project.

Project: ${project.name}
Frontend URL: ${project.frontendUrl}
Project Path: ${project.projectPath}

${productSpec ? `Current Product Specification:\n${JSON.stringify(productSpec, null, 2)}\n\n` : ''}

Your role:
- Help the user refine and edit the product specification
- Maintain conversation context across multiple messages
- Suggest specific JSON edits when asked
- Answer questions about the spec structure
- Be concise but helpful`;

      // Build conversation messages array
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        // Add conversation history
        ...history.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        // Add current user message
        {
          role: 'user' as const,
          content: message,
        },
      ];

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      });

      const assistantMessage =
        response.content[0].type === 'text'
          ? response.content[0].text
          : 'Sorry, I could not generate a response.';

      res.json({ response: assistantMessage });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process chat',
      });
    }
  });

  // Upload documents to project
  router.post('/:id/documents', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // TODO: Implement multipart file upload with multer
      // For now, return placeholder
      res.status(501).json({
        error: 'Document upload not yet implemented',
        message: 'This endpoint will support PRD, screenshot, and video uploads',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to upload document',
      });
    }
  });

  // Get project configuration (including backend server config)
  router.get('/:id/config', (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Load config from workspace if it exists
      const configPath = path.join(project.workspacePath, 'viztrtr-config.json');
      let projectConfig = {};

      if (fs.existsSync(configPath)) {
        projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      res.json({
        ...projectConfig,
        projectPath: project.projectPath,
        frontendUrl: project.frontendUrl,
        targetScore: project.targetScore,
        maxIterations: project.maxIterations,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load config',
      });
    }
  });

  // Update project configuration
  router.put('/:id/config', async (req: Request, res: Response) => {
    try {
      const project = db.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const config = req.body;

      // Save to workspace
      const configPath = path.join(project.workspacePath, 'viztrtr-config.json');
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Update database fields
      const dbUpdates: any = {};
      if (config.targetScore !== undefined) dbUpdates.targetScore = config.targetScore;
      if (config.maxIterations !== undefined) dbUpdates.maxIterations = config.maxIterations;
      if (config.frontendUrl !== undefined) dbUpdates.frontendUrl = config.frontendUrl;

      if (Object.keys(dbUpdates).length > 0) {
        db.updateProject(req.params.id, dbUpdates);
      }

      res.json({ message: 'Configuration updated', config });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update config',
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
          error: error instanceof Error ? error.message : String(error),
        });
      });

      res.status(201).json(run);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start run',
      });
    }
  });

  // Retry a failed run
  router.post('/runs/:runId/retry', async (req: Request, res: Response) => {
    try {
      const run = db.getRun(req.params.runId);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const project = db.getProject(run.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Create a new run (don't reuse failed run ID)
      const newRun = db.createRun(project.id, project.maxIterations);

      // Start execution in background
      executeRun(newRun.id, project, db).catch(error => {
        console.error(`Run ${newRun.id} failed:`, error);
        db.updateRun(newRun.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
      });

      res.status(201).json(newRun);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to retry run',
      });
    }
  });

  return router;
}

/**
 * Execute a VIZTRTR run in the background
 */
async function executeRun(runId: string, project: any, db: VIZTRTRDatabase) {
  const { VIZTRTROrchestrator } = await import('../../../../dist/core/orchestrator');

  // Update status to running
  db.updateRun(runId, { status: 'running' });

  const config = {
    projectPath: path.resolve(project.projectPath),
    frontendUrl: project.frontendUrl,
    targetScore: project.targetScore,
    maxIterations: project.maxIterations,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    outputDir: path.join(process.cwd(), 'viztrtr-output', runId),
    screenshotConfig: {
      width: 1280,
      height: 720,
      fullPage: false,
    },
    verbose: true,
  };

  const orchestrator = new VIZTRTROrchestrator(config);

  // Hook into iteration updates
  const originalRun = orchestrator.run.bind(orchestrator);
  orchestrator.run = async function () {
    const result = await originalRun();

    // Update run with final results
    db.updateRun(runId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      currentIteration: result.iterations.length,
    });

    db.saveRunResult(runId, result);

    return result;
  };

  await orchestrator.run();
}
