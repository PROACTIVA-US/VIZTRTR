/**
 * Agent types for the VIZTRTR UI
 */

export type AgentType = 'architect' | 'designer' | 'engineer' | 'tester' | 'viztritr';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  tasks: string[];
  status: 'idle' | 'active' | 'completed' | 'error';
  progress?: number;
  currentTask?: string;
}

export interface AgentConnection {
  from: string; // Agent ID
  to: string;   // Agent ID
  status: 'pending' | 'active' | 'completed';
  data?: any;
}

export interface ProjectPrompt {
  text: string;
  type: 'prompt' | 'prd';
  file?: File;
}

export interface AIEvaluation {
  suggestedAgents: Agent[];
  projectType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedDuration: string;
  keyFeatures: string[];
  technicalRequirements: string[];
}
