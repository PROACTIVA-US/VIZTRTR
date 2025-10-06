/**
 * Shared types between frontend and backend
 */

export interface Project {
  id: string;
  name: string;
  projectPath: string;
  frontendUrl: string;
  targetScore: number;
  maxIterations: number;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentIteration: number;
  maxIterations: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface IterationUpdate {
  runId: string;
  iteration: number;
  type: 'capture' | 'analyze' | 'orchestrate' | 'implement' | 'verify' | 'evaluate' | 'reflect';
  status: 'started' | 'completed' | 'failed';
  data?: any;
  timestamp: string;
}

export interface RunResult {
  runId: string;
  startingScore: number;
  finalScore: number;
  improvement: number;
  targetReached: boolean;
  totalIterations: number;
  duration: number;
  iterations: IterationData[];
  reportPath: string;
}

export interface IterationData {
  iteration: number;
  beforeScore: number;
  afterScore: number;
  improvement: number;
  beforeScreenshot: string;
  afterScreenshot: string;
  recommendations: string[];
  appliedRecommendation?: string;
  evaluation: {
    scores: {
      visual_hierarchy: number;
      typography: number;
      color_contrast: number;
      spacing_layout: number;
      component_design: number;
      animation_interaction: number;
      accessibility: number;
      overall_aesthetic: number;
    };
    compositeScore: number;
  };
}

export interface CreateProjectRequest {
  name: string;
  projectPath: string;
  frontendUrl: string;
  targetScore?: number;
  maxIterations?: number;
}

export interface StartRunRequest {
  projectId: string;
}

export interface SSEMessage {
  event: string;
  data: any;
}

// Prompt Evaluation types
export interface AgentTask {
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestedAgent {
  id: string;
  type: 'architect' | 'designer' | 'engineer' | 'tester' | 'viztritr';
  name: string;
  description: string;
  tasks: AgentTask[];
}

export interface PromptEvaluation {
  suggestedAgents: SuggestedAgent[];
  projectType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedDuration: string;
  keyFeatures: string[];
  technicalRequirements: string[];
}

export interface EvaluatePromptRequest {
  prompt: string;
  type: 'prompt' | 'prd';
}

// Product Specification types
export interface ComponentSpec {
  purpose?: string;
  userStories?: string[];
  designPriorities?: string[];
  focusAreas?: string[];
  stateManagement?: Record<string, unknown>;
  interactions?: Record<string, unknown>;
}

export interface ProductSpec {
  projectId: string;
  version: number;
  createdAt: string;
  lastUpdated: string;
  productVision: string;
  targetUsers: string[];
  components: Record<string, ComponentSpec>;
  globalConstraints?: Record<string, unknown>;
  originalPRD?: string;
}
