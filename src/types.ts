/**
 * VIZTRITR Type Definitions
 */

export interface VIZTRITRConfig {
  // Project settings
  projectPath: string;
  frontendUrl: string;
  targetScore: number;
  maxIterations: number;

  // Plugin selection
  visionModel: 'claude-opus' | 'gpt4v' | 'gemini' | 'custom';
  implementationModel: 'claude-sonnet' | 'gpt4' | 'deepseek' | 'custom';

  // API credentials
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  customEndpoint?: string;

  // Screenshot config
  screenshotConfig: {
    width: number;
    height: number;
    fullPage?: boolean;
    selector?: string;
  };

  // Output config
  outputDir: string;
  verbose?: boolean;
}

export interface Screenshot {
  path: string;
  base64: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface Issue {
  dimension: string;
  severity: 'critical' | 'important' | 'minor';
  description: string;
  location?: string;
}

export interface Recommendation {
  dimension: string;
  title: string;
  description: string;
  impact: number; // 1-10
  effort: number; // 1-10
  code?: string;
}

export interface Change {
  type: 'create' | 'edit' | 'delete';
  filePath: string;
  oldContent?: string;
  newContent?: string;
  description: string;
}

export interface DesignSpec {
  iteration: number;
  timestamp: Date;
  currentScore: number;
  currentIssues: Issue[];
  recommendations: Recommendation[];
  prioritizedChanges: Recommendation[];
  estimatedNewScore: number;
}

export interface FileChange {
  path: string;
  type: 'create' | 'edit' | 'delete';
  oldContent?: string;
  newContent?: string;
  diff?: string;
}

export interface Changes {
  files: FileChange[];
  summary: string;
  buildCommand?: string;
  testCommand?: string;
}

export interface DimensionScore {
  score: number;
  weight: number;
  weightedScore: number;
  assessment: string;
  recommendations: string[];
}

export interface EvaluationResult {
  compositeScore: number;
  targetScore: number;
  targetReached: boolean;
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
  dimensions: {
    [key: string]: DimensionScore;
  };
  strengths: string[];
  weaknesses: string[];
  summary: string;
  priorityImprovements: Array<{
    dimension: string;
    currentScore: number;
    potentialGain: number;
    priority: string;
  }>;
}

export interface IterationResult {
  iteration: number;
  timestamp: Date;
  beforeScreenshot: Screenshot;
  afterScreenshot: Screenshot;
  designSpec: DesignSpec;
  changes: Changes;
  evaluation: EvaluationResult;
  scoreDelta: number;
  targetReached: boolean;
}

export interface IterationReport {
  status: 'complete' | 'incomplete' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  startingScore: number;
  finalScore: number;
  improvement: number;
  targetScore: number;
  targetReached: boolean;
  totalIterations: number;
  bestIteration: number;
  iterations: IterationResult[];
  reportPath: string;
}

export interface ScoringRubric {
  [dimension: string]: {
    weight: number;
    criteria: string[];
  };
}

export interface VIZTRITRPlugin {
  name: string;
  version: string;
  type: 'vision' | 'implementation' | 'evaluation' | 'capture';

  // Vision plugin
  analyzeScreenshot?(screenshot: Screenshot): Promise<DesignSpec>;

  // Implementation plugin
  implementChanges?(spec: DesignSpec, projectPath: string): Promise<Changes>;

  // Evaluation plugin
  scoreDesign?(screenshot: Screenshot): Promise<EvaluationResult>;

  // Capture plugin
  captureScreenshot?(url: string, config: any): Promise<Screenshot>;
}
