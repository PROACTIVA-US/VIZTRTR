/**
 * Product Spec Generator
 *
 * Converts unstructured PRD into component-based VIZTRTRProductSpec
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import type { VIZTRTRProductSpec } from '../types/productSpec.js';

export interface DoclingMetadata {
  tables?: Array<{ data: string; num_rows: number | null; num_cols: number | null }>;
  metadata?: { num_pages: number | null; file_type: string; file_name: string };
}

export async function generateProductSpec(
  projectId: string,
  prdText: string,
  detectedComponents: string[],
  anthropicApiKey: string,
  doclingData?: DoclingMetadata
): Promise<VIZTRTRProductSpec> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  // Build table context if available
  let tableContext = '';
  if (doclingData?.tables && doclingData.tables.length > 0) {
    tableContext = `\n\n<extracted_tables>\nThe following tables were extracted from the PRD document:\n\n${doclingData.tables.map((table, idx) =>
      `Table ${idx + 1} (${table.num_rows || '?'} rows × ${table.num_cols || '?'} cols):\n${table.data}`
    ).join('\n\n')}\n</extracted_tables>`;
  }

  // Build metadata context if available
  let metadataContext = '';
  if (doclingData?.metadata) {
    metadataContext = `\n\n<document_metadata>\nSource: ${doclingData.metadata.file_name} (${doclingData.metadata.file_type})\nPages: ${doclingData.metadata.num_pages || 'N/A'}\n</document_metadata>`;
  }

  const prompt = `You are a product analysis expert. Convert this PRD into a structured, component-based specification for UI/UX improvement.

<prd>
${prdText}
</prd>${tableContext}${metadataContext}

<detected_components>
${detectedComponents.join(', ')}
</detected_components>

Create a detailed JSON specification with:

1. **productVision**: 1-2 sentence summary of product goals
2. **targetUsers**: Array of user personas
3. **components**: Object mapping component names to detailed specs:
   - For each detected component AND any others mentioned in PRD
   - Include: purpose, userStories, designPriorities, focusAreas, avoidAreas, acceptanceCriteria, status
4. **globalConstraints**: accessibility, performance, browser, design requirements

IMPORTANT:
- Break down the product into logical UI components (not just the detected files)
- Each component should have 2-4 user stories
- Focus areas should be specific UI/UX concerns
- Acceptance criteria should be measurable

Return ONLY valid JSON matching this structure:
{
  "productVision": "...",
  "targetUsers": ["..."],
  "components": {
    "ComponentName": {
      "purpose": "...",
      "userStories": ["As a ..., I need ..."],
      "designPriorities": ["Readability", "Performance"],
      "focusAreas": ["Font sizing", "Color contrast"],
      "avoidAreas": ["Complex animations"],
      "acceptanceCriteria": ["Font >= 24pt", "WCAG AA compliance"],
      "status": "active"
    }
  },
  "globalConstraints": {
    "accessibility": ["WCAG 2.1 AA"],
    "performance": ["60fps scrolling"],
    "browser": ["Chrome, Safari, Firefox"],
    "design": ["Material Design 3"]
  }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Extract JSON
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Build full spec
  const spec: VIZTRTRProductSpec = {
    projectId,
    version: 1,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    productVision: parsed.productVision,
    targetUsers: parsed.targetUsers,
    components: parsed.components,
    globalConstraints: parsed.globalConstraints,
    originalPRD: prdText
  };

  return spec;
}

export async function saveProductSpec(
  spec: VIZTRTRProductSpec,
  workspacePath: string
): Promise<void> {
  const specPath = path.join(workspacePath, 'product-spec.json');
  await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
  await fs.promises.writeFile(
    specPath,
    JSON.stringify(spec, null, 2),
    'utf-8'
  );
}

export async function loadProductSpec(
  workspacePath: string
): Promise<VIZTRTRProductSpec | null> {
  const specPath = path.join(workspacePath, 'product-spec.json');
  try {
    const content = await fs.promises.readFile(specPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export async function updateProductSpec(
  spec: VIZTRTRProductSpec,
  updates: Partial<VIZTRTRProductSpec>,
  workspacePath: string
): Promise<VIZTRTRProductSpec> {
  const updated = {
    ...spec,
    ...updates,
    version: spec.version + 1,
    lastUpdated: new Date().toISOString()
  };

  await saveProductSpec(updated, workspacePath);
  return updated;
}
