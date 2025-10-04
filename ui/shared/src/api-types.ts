/**
 * Shared TypeScript types for API requests and responses
 * Used by both frontend and backend
 */

// ========================================
// Filesystem API
// ========================================

export interface Directory {
  name: string;
  path: string;
}

export interface BrowseResponse {
  currentPath: string;
  parent: string | null;
  directories: Directory[];
}

export interface HomeResponse {
  path: string;
}

// ========================================
// Projects API
// ========================================

export interface DetectUrlResponse {
  url: string | null;
  message?: string;
  detectedPort?: number;
  framework?: 'vite' | 'next' | 'react' | 'unknown';
}

export interface CreateProjectRequest {
  name: string;
  projectPath: string;
  frontendUrl: string;
  targetScore: number;
  maxIterations: number;
}

export interface Project {
  id: number;
  name: string;
  projectPath: string;
  frontendUrl: string;
  targetScore: number;
  maxIterations: number;
  createdAt: string;
}

// ========================================
// Error Responses
// ========================================

export interface ErrorResponse {
  error: string;
  details?: string;
}
