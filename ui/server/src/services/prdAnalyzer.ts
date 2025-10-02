/**
 * PRD Analysis Agent
 *
 * Uses Claude to analyze product requirements and extract:
 * - Product vision and goals
 * - Target users and use cases
 * - Design priorities
 * - Focus areas for UI/UX improvements
 */

import Anthropic from '@anthropic-ai/sdk';
import { DoclingService } from './doclingService.js';
import * as fs from 'fs/promises';

export interface PRDAnalysis {
  productVision: string;
  targetUsers: string[];
  designPriorities: string[];
  focusAreas: string[];
  avoidAreas: string[];
  keyFeatures: string[];
  tables?: Array<{ data: string; num_rows: number | null; num_cols: number | null }>;
  metadata?: { num_pages: number | null; file_type: string; file_name: string };
}

export async function analyzePRD(
  prdText: string,
  anthropicApiKey: string
): Promise<PRDAnalysis> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const prompt = `You are a product and design analysis expert. Analyze the following product documentation and extract key insights for UI/UX improvement.

<product_documentation>
${prdText}
</product_documentation>

Extract and return a JSON object with:
1. productVision: A concise 1-2 sentence summary of what this product aims to achieve
2. targetUsers: Array of target user personas or segments
3. designPriorities: Array of design principles/priorities mentioned or implied (e.g., "accessibility", "performance", "simplicity")
4. focusAreas: Specific UI/UX areas to focus on (e.g., "navigation clarity", "form usability", "mobile responsiveness")
5. avoidAreas: UI/UX patterns or features to avoid or de-prioritize
6. keyFeatures: Main features or capabilities mentioned

Return ONLY valid JSON, no other text.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  const analysis = JSON.parse(jsonMatch[0]) as PRDAnalysis;
  return analysis;
}

/**
 * Analyze PRD from a file path using Docling
 *
 * @param filePath - Path to PRD file (PDF, DOCX, MD, etc.)
 * @param anthropicApiKey - Anthropic API key
 * @returns PRDAnalysis with extracted tables and metadata
 */
export async function analyzePRDFromFile(
  filePath: string,
  anthropicApiKey: string
): Promise<PRDAnalysis> {
  const docling = new DoclingService();

  // Parse document with Docling
  const parsed = await docling.parsePRD(filePath);

  // Analyze the markdown content with Claude
  const analysis = await analyzePRD(parsed.markdown, anthropicApiKey);

  // Add table and metadata information
  return {
    ...analysis,
    tables: parsed.tables,
    metadata: parsed.metadata
  };
}

/**
 * Merge PRD analysis with component-based detection
 */
export function mergeAnalysisWithDetection(
  prdAnalysis: PRDAnalysis,
  detection: any
): any {
  return {
    ...detection,
    productVision: prdAnalysis.productVision,
    targetUsers: prdAnalysis.targetUsers,
    designPriorities: prdAnalysis.designPriorities,
    // Merge focus areas - prioritize PRD insights
    focusAreas: [
      ...prdAnalysis.focusAreas,
      ...detection.focusAreas.filter((area: string) =>
        !prdAnalysis.focusAreas.some(prdArea =>
          prdArea.toLowerCase().includes(area.toLowerCase())
        )
      )
    ].slice(0, 8), // Limit to 8 total
    // Merge avoid areas
    avoidAreas: [
      ...prdAnalysis.avoidAreas,
      ...detection.avoidAreas
    ],
    keyFeatures: prdAnalysis.keyFeatures,
    tables: prdAnalysis.tables,
    metadata: prdAnalysis.metadata,
    hasPRD: true
  };
}
