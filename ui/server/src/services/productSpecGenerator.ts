/**
 * Product Spec Generator
 *
 * Converts unstructured PRD into component-based VIZTRTRProductSpec
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import type { VIZTRTRProductSpec } from '../types/productSpec';

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
  console.log('[ProductSpecGenerator] Starting PRD analysis...');
  console.log('[ProductSpecGenerator] PRD length:', prdText.length, 'chars');
  console.log('[ProductSpecGenerator] Detected components:', detectedComponents);

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  // Build table context if available
  let tableContext = '';
  if (doclingData?.tables && doclingData.tables.length > 0) {
    tableContext = `\n\n<extracted_tables>\nThe following tables were extracted from the PRD document:\n\n${doclingData.tables
      .map(
        (table, idx) =>
          `Table ${idx + 1} (${table.num_rows || '?'} rows × ${table.num_cols || '?'} cols):\n${table.data}`
      )
      .join('\n\n')}\n</extracted_tables>`;
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
- Return ONLY valid, well-formed JSON - no trailing commas, all strings properly quoted
- Do NOT include any text before or after the JSON object

Return ONLY valid JSON matching this structure (ensure all strings use double quotes, no trailing commas):
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

  console.log('[ProductSpecGenerator] Calling Claude Sonnet 4.5...');
  const startTime = Date.now();

  try {
    // Add 60 second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;
    console.log(`[ProductSpecGenerator] Claude responded in ${elapsed}ms`);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    console.log('[ProductSpecGenerator] Parsing Claude response...');

    // Extract JSON - find the first { and last }
    const text = content.text;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      console.error('[ProductSpecGenerator] No JSON found in response');
      throw new Error('No JSON found in Claude response');
    }

    const jsonString = text.substring(firstBrace, lastBrace + 1);
    console.log('[ProductSpecGenerator] Extracted JSON string, length:', jsonString.length);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
      console.log('[ProductSpecGenerator] Successfully parsed product spec');
    } catch (parseError) {
      console.error('[ProductSpecGenerator] JSON parse error:', parseError);
      console.error(
        '[ProductSpecGenerator] Problematic JSON substring:',
        jsonString.substring(31700, 31900)
      );

      // Try to fix common JSON issues
      const fixedJson = jsonString
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes

      try {
        parsed = JSON.parse(fixedJson);
        console.log('[ProductSpecGenerator] Successfully parsed after fixing JSON');
      } catch (secondError) {
        throw new Error(
          `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
      }
    }

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
      originalPRD: prdText,
    };

    console.log('[ProductSpecGenerator] Product spec generated successfully');
    return spec;
  } catch (error) {
    console.error('[ProductSpecGenerator] Error generating product spec:', error);
    throw error;
  }
}

export async function saveProductSpec(
  spec: VIZTRTRProductSpec,
  workspacePath: string
): Promise<void> {
  const specPath = path.join(workspacePath, 'product-spec.json');
  await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
  await fs.promises.writeFile(specPath, JSON.stringify(spec, null, 2), 'utf-8');
}

export async function loadProductSpec(workspacePath: string): Promise<VIZTRTRProductSpec | null> {
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
    lastUpdated: new Date().toISOString(),
  };

  await saveProductSpec(updated, workspacePath);
  return updated;
}
