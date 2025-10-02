/**
 * VIZTRTR Type Definitions
 */

export interface ProjectContext {
  name: string;
  type: 'web-builder' | 'teleprompter' | 'control-panel' | 'general';
  description: string;
  focusAreas: string[];
  avoidAreas: string[];
}

export interface HumanLoopConfig {
  enabled: boolean;
  approvalRequired: 'always' | 'high-risk' | 'first-iteration' | 'never';
  costThreshold: number; // cents
  riskThreshold: 'low' | 'medium' | 'high';
  enablePromptRefinement?: boolean;
  enableMemoryAnnotation?: boolean;
}

export interface VIZTRTRConfig {
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

  // Layer 1: Project context
  projectContext?: ProjectContext;

  // Layer 4: Human-in-the-loop
  humanLoop?: HumanLoopConfig;

  // Chrome DevTools MCP config
  useChromeDevTools?: boolean; // Enable hybrid scoring with real metrics
  chromeDevToolsConfig?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    isolated?: boolean;
    channel?: 'stable' | 'canary' | 'beta' | 'dev';
  };

  // Scoring weights for hybrid mode
  scoringWeights?: {
    vision: number; // Default: 0.6 (60%)
    metrics: number; // Default: 0.4 (40%)
  };
}

export interface Screenshot {
  data: string; // base64 encoded image data
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  path?: string; // Optional file path
  timestamp?: Date;
}

export interface ScreenshotConfig {
  width?: number;
  height?: number;
  fullPage?: boolean;
  selector?: string;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
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
  detectedContext?: 'teleprompter' | 'settings' | 'blueprint' | 'header' | 'mixed';
}

// Memory system for tracking iteration history
export interface AttemptedRecommendation extends Recommendation {
  iteration: number;
  status: 'success' | 'failed' | 'no_effect' | 'broke_build';
  reason?: string;
  filesModified?: string[];
}

export interface ScoreHistoryEntry {
  iteration: number;
  beforeScore: number;
  afterScore: number;
  delta: number;
  dimension_scores?: Record<string, number>;
}

export interface IterationMemory {
  attemptedRecommendations: AttemptedRecommendation[];
  successfulChanges: FileChange[];
  failedChanges: Array<{
    recommendation: Recommendation;
    reason: string;
    iteration: number;
  }>;
  scoreHistory: ScoreHistoryEntry[];
  plateauCount: number;
  contextAwareness: {
    lastModifiedContext?: 'teleprompter' | 'settings' | 'blueprint' | 'header' | 'mixed';
    componentsModified: string[];
    modificationCount: Record<string, number>;
  };
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

// Verification system
export interface VerificationResult {
  success: boolean;
  buildSucceeded: boolean;
  filesModified: boolean;
  visualChangesDetected: boolean;
  errors: string[];
  warnings: string[];
  pixelDiffCount?: number;
  consoleErrors?: string[];
}

export interface ReflectionResult {
  shouldContinue: boolean;
  shouldRollback: boolean;
  reasoning: string;
  lessonsLearned: string[];
  suggestedNextSteps: string[];
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

export interface FilteredRecommendations {
  approved: Recommendation[];
  rejected: Array<{
    recommendation: Recommendation;
    reason: string;
  }>;
}

export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
  modifications?: Recommendation[];
}

export interface VIZTRTRPlugin {
  name: string;
  version: string;
  type: 'vision' | 'implementation' | 'evaluation' | 'capture';

  // Vision plugin
  analyzeScreenshot?(
    screenshot: Screenshot,
    memoryContext?: string,
    projectContext?: ProjectContext,
    avoidedComponents?: string[]
  ): Promise<DesignSpec>;

  // Implementation plugin
  implementChanges?(spec: DesignSpec, projectPath: string): Promise<Changes>;

  // Evaluation plugin
  scoreDesign?(screenshot: Screenshot): Promise<EvaluationResult>;

  // Capture plugin
  captureScreenshot?(config: ScreenshotConfig): Promise<Screenshot>;
}

// Video Processing Types
export interface VideoMetadata {
  duration: number; // seconds
  fps: number;
  width: number;
  height: number;
  format: string;
  codec: string;
  bitrate: number;
  fileSize: number; // bytes
}

export interface VideoProcessingOptions {
  fps?: number; // frames per second to extract (default: 2)
  keyframesOnly?: boolean; // only extract keyframes (scene changes)
  startTime?: number; // start time in seconds
  endTime?: number; // end time in seconds
  maxFrames?: number; // maximum number of frames to extract
  resize?: {
    width: number;
    height: number;
  };
  quality?: number; // 1-100 for PNG compression
  sceneChangeThreshold?: number; // 0-1, sensitivity for scene detection (default: 0.3)
  onProgress?: (progress: ProgressInfo) => void;
}

export interface ProgressInfo {
  phase: 'metadata' | 'keyframe-detection' | 'extraction' | 'complete';
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
}

export interface SceneChange {
  timestamp: number; // seconds
  frameNumber: number;
  score: number; // 0-1, how different from previous frame
  description?: string;
}

export interface VideoFrame {
  path: string;
  base64?: string;
  timestamp: number; // seconds
  frameNumber: number;
  width: number;
  height: number;
  isKeyframe: boolean;
}

export interface VideoFrameResult {
  videoPath: string;
  metadata: VideoMetadata;
  frames: VideoFrame[];
  sceneChanges: SceneChange[];
  extractionTime: number; // milliseconds
  outputDirectory: string;
}

export interface AnimationPattern {
  type: 'fade' | 'slide' | 'zoom' | 'rotate' | 'morph' | 'parallax' | 'custom';
  element?: string; // CSS selector or description
  startFrame: number;
  endFrame: number;
  duration: number; // seconds
  easing?: string;
  description: string;
  quality: number; // 1-10 score
}

export interface TransitionPattern {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide';
  fromFrame: number;
  toFrame: number;
  duration: number; // seconds
  quality: number; // 1-10 score
}

export interface InteractionFlow {
  sequence: string[]; // array of screen states
  frames: number[]; // corresponding frame numbers
  description: string;
  usabilityScore: number; // 1-10
}

export interface VideoDesignSpec extends DesignSpec {
  // Extended for video analysis
  animations: AnimationPattern[];
  transitions: TransitionPattern[];
  interactionFlows: InteractionFlow[];
  temporalIssues: Issue[]; // issues specific to animations/transitions
  frameAnalyses: Array<{
    frameNumber: number;
    timestamp: number;
    score: number;
    issues: Issue[];
  }>;
}

// Validation Types for Scope Constraints
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  originalLines: number;
  modifiedLines: number;
  lineDelta: number;
  lineGrowthPercent: number;
  exportsChanged: boolean;
  importsChanged: boolean;
  violations: string[];
}

export interface ChangeConstraints {
  maxLineDelta: number;
  maxGrowthPercent: number; // 0.5 = 50% max growth
  preserveExports: boolean;
  preserveImports: boolean;
  requireDiffFormat: boolean;
  effortBasedLineLimits?: {
    low: number; // effort 1-2: max lines changed
    medium: number; // effort 3-4: max lines changed
    high: number; // effort 5+: max lines changed
  };
}

// Cross-File Interface Validation Types
export interface ComponentInterface {
  exports: ExportSignature[];
  props?: PropInterface;
  types: TypeDefinition[];
  dependencies: string[];
}

export interface ExportSignature {
  name: string;
  type: 'default' | 'named';
  signature: string;
}

export interface PropInterface {
  required: string[];
  optional: string[];
  types: Record<string, string>;
}

export interface TypeDefinition {
  name: string;
  definition: string;
}

export interface BreakingChange {
  type: 'prop-removed' | 'prop-type-changed' | 'export-changed' | 'type-changed';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CrossFileValidationResult {
  valid: boolean;
  breakingChanges: BreakingChange[];
  affectedFiles: string[];
  suggestions: string[];
}
