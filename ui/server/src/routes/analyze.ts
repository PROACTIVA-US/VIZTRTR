/**
 * AI Analysis Endpoints
 */
import express from 'express';
import { AIProjectAnalyzer } from '../services/aiProjectAnalyzer.js';
import { VIZTRTRDatabase } from '../services/database.js';

const router = express.Router();
const db = new VIZTRTRDatabase();

// Initialize AI analyzer (will need API key from env)
let aiAnalyzer: AIProjectAnalyzer | null = null;

if (process.env.ANTHROPIC_API_KEY) {
  aiAnalyzer = new AIProjectAnalyzer(process.env.ANTHROPIC_API_KEY);
} else {
  console.warn('⚠️  ANTHROPIC_API_KEY not set - AI analysis will be unavailable');
}

/**
 * POST /api/projects/analyze
 * Run AI analysis on a project
 */
router.post('/projects/analyze', async (req, res) => {
  try {
    const { projectId, projectPath, userProvidedPRD } = req.body;

    if (!projectId || !projectPath) {
      return res.status(400).json({ error: 'projectId and projectPath required' });
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
