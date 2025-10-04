/**
 * AI Analysis Endpoints
 */
import express from 'express';
import { AIProjectAnalyzer } from '../services/aiProjectAnalyzer';
import { VIZTRTRDatabase } from '../services/database';

const router = express.Router();
const db = new VIZTRTRDatabase();

// Initialize AI analyzer (will need API key from env)
// Note: API key is loaded in index.ts before this module is imported
let aiAnalyzer: AIProjectAnalyzer | null = null;

if (process.env.ANTHROPIC_API_KEY) {
  aiAnalyzer = new AIProjectAnalyzer(process.env.ANTHROPIC_API_KEY);
}

// Rate limiting for expensive AI analysis
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkRateLimit(projectId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Clean up old entries
  for (const [key, timestamp] of rateLimitMap.entries()) {
    if (timestamp < windowStart) {
      rateLimitMap.delete(key);
    }
  }

  // Count requests in current window
  const recentRequests = Array.from(rateLimitMap.entries())
    .filter(([key, timestamp]) => key.startsWith(projectId) && timestamp >= windowStart)
    .length;

  if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  // Record this request
  rateLimitMap.set(`${projectId}_${now}`, now);
  return true;
}

/**
 * POST /api/projects/analyze
 * Run AI analysis on a project
 */
router.post('/projects/analyze', async (req, res) => {
  try {
    const { projectId, projectPath, userProvidedPRD } = req.body;

    // Input validation
    if (!projectId || !projectPath) {
      return res.status(400).json({ error: 'projectId and projectPath required' });
    }

    if (typeof projectId !== 'string' || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'projectId and projectPath must be strings' });
    }

    if (userProvidedPRD && typeof userProvidedPRD !== 'string') {
      return res.status(400).json({ error: 'userProvidedPRD must be a string' });
    }

    // Validate PRD length (max 10,000 characters)
    if (userProvidedPRD && userProvidedPRD.length > 10000) {
      return res.status(400).json({
        error: 'PRD exceeds maximum length of 10,000 characters'
      });
    }

    // Check rate limit
    if (!checkRateLimit(projectId)) {
      return res.status(429).json({
        error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`
      });
    }

    if (!aiAnalyzer) {
      return res.status(503).json({
        error: 'AI analysis unavailable - ANTHROPIC_API_KEY not configured'
      });
    }

    // Check project exists
    const project = db.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`🧠 Starting AI analysis for project: ${projectId}`);

    // Run AI analysis
    const analysis = await aiAnalyzer.analyzeProject(
      projectPath,
      userProvidedPRD
    );

    // Update project with analysis results
    db.updateProject(projectId, {
      synthesizedPRD: analysis.synthesizedPRD,
      projectType: analysis.projectType,
      analysisConfidence: analysis.confidence,
      hasProductSpec: true,
      status: 'analyzed',
    });

    console.log(`✅ Analysis complete for ${projectId}: ${analysis.projectType}`);

    res.json(analysis);
  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
});

export default router;
