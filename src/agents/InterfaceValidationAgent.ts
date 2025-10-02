/**
 * Interface Validation Agent
 *
 * Uses Claude Agent SDK to analyze TypeScript/React component interfaces
 * and detect breaking changes across files
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Grep } from '../utils/grep-helper';

export interface ComponentInterface {
  exports: ExportSignature[];
  props?: PropInterface;
  types: TypeDefinition[];
  dependencies: string[];
}

export interface ExportSignature {
  name: string;
  type: 'default' | 'named';
  signature: string;
}

export interface PropInterface {
  required: string[];
  optional: string[];
  types: Record<string, string>;
}

export interface TypeDefinition {
  name: string;
  definition: string;
}

export interface BreakingChange {
  type: 'prop-removed' | 'prop-type-changed' | 'export-changed' | 'type-changed';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CrossFileValidationResult {
  valid: boolean;
  breakingChanges: BreakingChange[];
  affectedFiles: string[];
  suggestions: string[];
}

export interface InterfaceAnalysis {
  componentName: string;
  exports: string[];
  props: Record<string, { type: string; required: boolean }>;
  types: Record<string, string>;
  dependencies: string[];
}

export class InterfaceValidationAgent {
  private client: Anthropic;
  private analysisCache = new Map<string, InterfaceAnalysis>();

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Analyze a component's interface using Claude
   */
  async analyzeComponentInterface(filePath: string, code: string): Promise<InterfaceAnalysis> {
    const cacheKey = `${filePath}:${this.hashCode(code)}`;

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const prompt = `Analyze this TypeScript/React component and extract its interface information.

**File:** ${path.basename(filePath)}

**Code:**
\`\`\`typescript
${code}
\`\`\`

**Task:** Extract the component's public interface:
1. Export signatures (what this file exports)
2. Props interface (if it's a React component)
3. Type definitions (interfaces, types exported)
4. Dependencies (what this file imports)

**Return JSON format:**
{
  "componentName": "ComponentName",
  "exports": ["default ComponentName", "namedExport"],
  "props": {
    "propName": { "type": "string", "required": true },
    "onSubmit": { "type": "() => void", "required": true }
  },
  "types": {
    "PropsInterface": "full definition"
  },
  "dependencies": ["react", "./utils"]
}

Be precise about:
- Required vs optional props (use ? in TypeScript)
- Function signatures with their full type
- Default exports vs named exports`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      thinking: {
        type: 'enabled',
        budget_tokens: 1500,
      },
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract JSON from response
    const analysis = this.extractJsonFromResponse(response);

    // Cache the result
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Find files that depend on this component
   */
  async findDependentFiles(componentPath: string, projectPath: string): Promise<string[]> {
    const dependents: string[] = [];

    try {
      // Get component name from path
      const componentName = path.basename(componentPath, path.extname(componentPath));

      // Search for imports of this component
      // Use grep to find files importing this component
      const searchPatterns = [
        `import.*from.*['\"].*${componentName}['\"]`,
        `import.*${componentName}.*from`,
      ];

      const grepHelper = new Grep(projectPath);

      for (const pattern of searchPatterns) {
        const matches = await grepHelper.search(pattern, {
          filePattern: '**/*.{ts,tsx,js,jsx}',
          ignoreCase: false,
        });

        dependents.push(...matches.map(m => m.file));
      }

      // Deduplicate and filter out the component itself
      const unique = [...new Set(dependents)].filter(f => !f.includes(componentPath));

      return unique;
    } catch (error) {
      console.warn(`Warning: Could not find dependents for ${componentPath}:`, error);
      return [];
    }
  }

  /**
   * Validate interface changes and detect breaking changes
   */
  async validateInterfaceChange(
    filePath: string,
    originalCode: string,
    modifiedCode: string,
    projectPath: string
  ): Promise<CrossFileValidationResult> {
    // Analyze both versions
    const originalInterface = await this.analyzeComponentInterface(filePath, originalCode);
    const modifiedInterface = await this.analyzeComponentInterface(filePath, modifiedCode);

    // Find dependent files
    const dependents = await this.findDependentFiles(filePath, projectPath);

    // Use Claude to reason about breaking changes
    const breakingChanges = await this.detectBreakingChanges(
      filePath,
      originalInterface,
      modifiedInterface,
      dependents
    );

    // Determine if valid (no high-impact breaking changes)
    const valid = !breakingChanges.some(change => change.impact === 'high');

    // Generate suggestions for fixing breaking changes
    const suggestions = breakingChanges.length > 0
      ? await this.generateFixSuggestions(breakingChanges, dependents)
      : [];

    return {
      valid,
      breakingChanges,
      affectedFiles: dependents,
      suggestions,
    };
  }

  /**
   * Detect breaking changes using Claude's reasoning
   */
  private async detectBreakingChanges(
    filePath: string,
    original: InterfaceAnalysis,
    modified: InterfaceAnalysis,
    dependents: string[]
  ): Promise<BreakingChange[]> {
    const prompt = `Analyze these TypeScript component interface changes for breaking changes.

**File:** ${path.basename(filePath)}
**Dependent Files:** ${dependents.length} files import this component

**ORIGINAL Interface:**
\`\`\`json
${JSON.stringify(original, null, 2)}
\`\`\`

**MODIFIED Interface:**
\`\`\`json
${JSON.stringify(modified, null, 2)}
\`\`\`

**Task:** Identify ALL breaking changes that would cause dependent files to fail.

**Breaking changes include:**
1. **Removed required props** - e.g., "onSubmit" was required, now removed
2. **Changed prop types** - e.g., "value: string" changed to "value: number"
3. **Export signature changes** - e.g., default export removed or renamed
4. **Required props changed to different type** - e.g., function signature changed

**Impact levels:**
- **high**: Will definitely break builds (removed required prop, changed export)
- **medium**: Might break builds (type changes that are compatible)
- **low**: Won't break builds (added optional props, internal changes)

**Return JSON array:**
[
  {
    "type": "prop-removed",
    "description": "Required prop 'onSubmit' was removed from Props interface",
    "before": "onSubmit: () => void (required)",
    "after": "not present",
    "impact": "high"
  }
]

Return ONLY breaking changes. If there are none, return empty array: []`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      thinking: {
        type: 'enabled',
        budget_tokens: 1500,
      },
      messages: [{ role: 'user', content: prompt }],
    });

    const changes = this.extractJsonFromResponse(response);

    // Ensure it's an array
    return Array.isArray(changes) ? changes : [];
  }

  /**
   * Generate suggestions for fixing breaking changes
   */
  private async generateFixSuggestions(
    breakingChanges: BreakingChange[],
    affectedFiles: string[]
  ): Promise<string[]> {
    const suggestions: string[] = [];

    for (const change of breakingChanges) {
      switch (change.type) {
        case 'prop-removed':
          suggestions.push(
            `Keep the '${change.before.split(':')[0].trim()}' prop or make it optional with a default value`
          );
          if (affectedFiles.length > 0) {
            suggestions.push(
              `Update ${affectedFiles.length} dependent file(s) to not use this prop`
            );
          }
          break;

        case 'prop-type-changed':
          suggestions.push(
            `Revert the type change or create a migration path for dependent components`
          );
          break;

        case 'export-changed':
          suggestions.push(
            `Maintain the original export signature or update all ${affectedFiles.length} imports`
          );
          break;

        case 'type-changed':
          suggestions.push(`Create a type alias to maintain backward compatibility`);
          break;
      }
    }

    return suggestions;
  }

  /**
   * Extract JSON from Claude response (handles markdown code blocks)
   */
  private extractJsonFromResponse(response: Anthropic.Message): any {
    let text = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    // Try to extract JSON from markdown code block
    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }

    // Try to find JSON object directly
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not extract JSON from response');
  }

  /**
   * Simple hash function for caching
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.analysisCache.size,
      entries: Array.from(this.analysisCache.keys()),
    };
  }
}

