/**
 * API Configuration
 * Centralized API URL configuration for all fetch calls
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  projects: `${API_BASE_URL}/api/projects`,
  analyze: `${API_BASE_URL}/api/projects/analyze`,
  runs: `${API_BASE_URL}/api/runs`,
  evaluate: `${API_BASE_URL}/api/evaluate-prompt`,
} as const;

/**
 * Helper to build API URLs
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
