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

CRITICAL JSON FORMATTING RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. All strings MUST use double quotes ("), never single quotes (')
3. NO trailing commas after the last item in arrays or objects
4. ALL object keys MUST be quoted with double quotes
5. Escape special characters in strings (newlines as \\n, quotes as \\")
6. Do NOT include any text before the opening { or after the closing }

IMPORTANT:
- Break down the product into logical UI components (not just the detected files)
- Each component should have 2-4 user stories
- Focus areas should be specific UI/UX concerns
- Acceptance criteria should be measurable
- Keep descriptions concise to avoid JSON parsing issues

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

      // Extract error position if available
      const errorMatch =
        parseError instanceof Error ? parseError.message.match(/position (\d+)/) : null;
      const errorPos = errorMatch ? parseInt(errorMatch[1]) : -1;

      if (errorPos > 0) {
        const contextStart = Math.max(0, errorPos - 100);
        const contextEnd = Math.min(jsonString.length, errorPos + 100);
        console.error(
          '[ProductSpecGenerator] Error context:',
          jsonString.substring(contextStart, contextEnd)
        );
      }

      console.log('[ProductSpecGenerator] Attempting to fix JSON...');

      try {
        // Strategy: Re-request from Claude with stricter formatting
        console.log('[ProductSpecGenerator] Retrying with stricter prompt...');

        const retryResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          messages: [
            { role: 'user', content: prompt },
            {
              role: 'assistant',
              content: 'I will return ONLY valid JSON with no markdown formatting.',
            },
            {
              role: 'user',
              content:
                'The previous response had JSON parsing errors. Please return ONLY the raw JSON object, with absolutely no markdown code blocks, no explanations, and all strings properly escaped. Start with { and end with }. Keep all text descriptions SHORT (under 100 characters each) to avoid escaping issues.',
            },
          ],
        });

        const retryContent = retryResponse.content[0];
        if (retryContent.type !== 'text') {
          throw new Error('Retry response was not text');
        }

        const retryText = retryContent.text;
        const retryFirstBrace = retryText.indexOf('{');
        const retryLastBrace = retryText.lastIndexOf('}');

        if (retryFirstBrace === -1 || retryLastBrace === -1) {
          throw new Error('No JSON found in retry response');
        }

        const retryJson = retryText.substring(retryFirstBrace, retryLastBrace + 1);
        parsed = JSON.parse(retryJson);
        console.log('[ProductSpecGenerator] Successfully parsed after retry');
      } catch (retryError) {
        console.error('[ProductSpecGenerator] Retry also failed:', retryError);

        // Last resort: Return a minimal valid spec
        console.log('[ProductSpecGenerator] Returning minimal fallback spec');
        parsed = {
          productVision: 'Unable to parse PRD - analysis failed',
          targetUsers: ['General users'],
          components: {},
          globalConstraints: {
            accessibility: ['WCAG 2.1 AA'],
            performance: ['Standard performance'],
            browser: ['Modern browsers'],
            design: ['Consistent design system'],
          },
        };
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
