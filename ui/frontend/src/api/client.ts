/**
 * API Client for VIZTRTR UI
 * Handles all communication with the backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Types for API requests and responses
 */
export interface EvaluatePromptRequest {
  text: string;
  type: 'prompt' | 'prd';
  file?: File;
}

export interface AIEvaluation {
  projectType: string;
  complexity: 'Simple' | 'Moderate' | 'Complex';
  estimatedTime: string;
  keyFeatures: string[];
  technicalStack: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  icon: string;
  responsibilities: string[];
  status: 'idle' | 'active' | 'completed' | 'error';
}

export interface StartBuildRequest {
  prompt: string;
  agents: Agent[];
}

export interface StartBuildResponse {
  buildId: string;
}

export interface BuildResult {
  buildId: string;
  status: string;
  iterations: IterationResult[];
  finalScore: number;
  code: {
    files: Array<{
      path: string;
      content: string;
    }>;
  };
}

export interface IterationResult {
  iteration: number;
  beforeScreenshot: string;
  afterScreenshot: string;
  scores: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
  compositeScore: number;
  timestamp: string;
}

export interface BuildEvent {
  type: 'state' | 'agent' | 'log' | 'iteration' | 'complete' | 'error';
  data: any;
}

/**
 * API Endpoints
 */

/**
 * POST /api/evaluate-prompt
 * Evaluates a user prompt with Claude AI
 */
export async function evaluatePrompt(
  request: EvaluatePromptRequest
): Promise<AIEvaluation> {
  // If file is provided, use FormData
  if (request.file) {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('type', request.type);

    const response = await fetch(`${API_BASE_URL}/api/evaluate-prompt`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  }

  // Otherwise use JSON
  return apiFetch<AIEvaluation>('/api/evaluate-prompt', {
    method: 'POST',
    body: JSON.stringify({
      text: request.text,
      type: request.type,
    }),
  });
}

/**
 * POST /api/builds
 * Starts a new build with the specified agents
 */
export async function startBuild(
  request: StartBuildRequest
): Promise<StartBuildResponse> {
  return apiFetch<StartBuildResponse>('/api/builds', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * GET /api/builds/:id/stream
 * Returns an EventSource for Server-Sent Events
 * This should be used with EventSource API, not fetch
 */
export function subscribeToBuildStream(buildId: string): EventSource {
  return new EventSource(`${API_BASE_URL}/api/builds/${buildId}/stream`);
}

/**
 * GET /api/builds/:id/result
 * Gets the final result of a completed build
 */
export async function getBuildResult(buildId: string): Promise<BuildResult> {
  return apiFetch<BuildResult>(`/api/builds/${buildId}/result`);
}

/**
 * GET /api/builds/:id/download
 * Downloads the generated code as a zip file
 */
export async function downloadBuildCode(buildId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/builds/${buildId}/download`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `build-${buildId}.zip`;

    if (contentDisposition) {
      const matches = /filename="(.+)"/.exec(contentDisposition);
      if (matches && matches[1]) {
        filename = matches[1];
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Helper to parse SSE messages
 */
export function parseBuildEvent(eventData: string): BuildEvent | null {
  try {
    return JSON.parse(eventData);
  } catch (error) {
    console.error('Failed to parse build event:', error);
    return null;
  }
}

/**
 * Example usage of the build stream:
 *
 * const eventSource = subscribeToBuildStream(buildId);
 *
 * eventSource.onmessage = (event) => {
 *   const buildEvent = parseBuildEvent(event.data);
 *   if (buildEvent) {
 *     switch (buildEvent.type) {
 *       case 'state':
 *         updateBuildState(buildEvent.data);
 *         break;
 *       case 'agent':
 *         updateCurrentAgent(buildEvent.data);
 *         break;
 *       case 'log':
 *         addActivityLog(buildEvent.data);
 *         break;
 *       case 'iteration':
 *         addIteration(buildEvent.data);
 *         break;
 *       case 'complete':
 *         handleBuildComplete(buildEvent.data);
 *         break;
 *       case 'error':
 *         handleBuildError(buildEvent.data);
 *         break;
 *     }
 *   }
 * };
 *
 * eventSource.onerror = (error) => {
 *   console.error('SSE error:', error);
 *   eventSource.close();
 * };
 */
