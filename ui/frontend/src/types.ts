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
  status: 'queued' | 'running' | 'completed' | 'failed';
  currentIteration: number;
  maxIterations: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface DetectedProject {
  projectType: 'teleprompter' | 'web-builder' | 'control-panel' | 'general';
  focusAreas: string[];
  avoidAreas: string[];
  detectedComponents: string[];
  suggestedUrl: string;
  confidence: number;
}
