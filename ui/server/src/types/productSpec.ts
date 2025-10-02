/**
 * Structured Product Specification
 *
 * Component-based breakdown of product requirements optimized for VIZTRTR
 */

export interface ComponentSpec {
  purpose: string;
  userStories: string[];
  designPriorities: string[];
  focusAreas: string[];
  avoidAreas: string[];
  acceptanceCriteria: string[];
  status: 'planned' | 'active' | 'complete';
}

export interface VIZTRTRProductSpec {
  // Meta
  projectId: string;
  version: number;
  lastUpdated: string;
  createdAt: string;

  // High-level
  productVision: string;
  targetUsers: string[];

  // Component-based breakdown
  components: {
    [componentName: string]: ComponentSpec;
  };

  // System-wide constraints
  globalConstraints: {
    accessibility: string[];
    performance: string[];
    browser: string[];
    design: string[];
  };

  // Original PRD reference
  originalPRD?: string;
}
