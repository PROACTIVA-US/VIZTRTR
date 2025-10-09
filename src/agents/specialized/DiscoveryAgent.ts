/**
 * DiscoveryAgent - Phase 1 of Two-Phase Workflow
 *
 * Purpose: Analyze files and create precise change plans for ExecutionAgent (V2)
 * - Read-only access to project files
 * - Outputs structured JSON change plans
 * - Identifies exact line numbers and current values
 * - No file modification capability
 *
 * This agent solves the V2 limitation where constrained tools need file context
 * but cannot access files directly. DiscoveryAgent provides the context.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Recommendation } from '../../core/types';
import { discoverComponentFiles, DiscoveredFile } from '../../utils/file-discovery';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * A planned change to be executed by ControlPanelAgentV2
 */
export interface PlannedChange {
  /** Which micro-change tool to use */
  tool: 'updateClassName' | 'updateStyleValue' | 'updateTextContent' | 'appendToClassName';

  /** File path relative to project root */
  filePath: string;

  /** Exact line number (1-indexed) */
  lineNumber: number;

  /** Actual line content from file (for verification) */
  lineContent: string;

  /** Tool-specific parameters */
  params:
    | UpdateClassNameParams
    | UpdateStyleValueParams
    | UpdateTextContentParams
    | AppendToClassNameParams;

  /** Human-readable explanation of why this change is needed */
  reason: string;
}

export interface UpdateClassNameParams {
  oldClassName: string;
  newClassName: string;
}

export interface UpdateStyleValueParams {
  property: string;
  oldValue: string;
  newValue: string;
}

export interface UpdateTextContentParams {
  oldText: string;
  newText: string;
}

export interface AppendToClassNameParams {
  classesToAdd: string[];
}

/**
 * Complete change plan for a recommendation
 */
export interface ChangePlan {
  /** Original recommendation this plan addresses */
  recommendation: Recommendation;

  /** List of changes to execute in order */
  changes: PlannedChange[];

  /** Overall strategy/approach */
  strategy: string;

  /** Expected impact after changes */
  expectedImpact: string;
}

export class DiscoveryAgent {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Analyze recommendation and create detailed change plan
   */
  async createChangePlan(
    recommendation: Recommendation,
    projectPath: string
  ): Promise<ChangePlan | null> {
    try {
      console.log(`\n   🔍 DiscoveryAgent analyzing: ${recommendation.title}`);

      // Discover component files
      const discoveredFiles = await discoverComponentFiles(projectPath, {
        maxFileSize: 50 * 1024,
        includeContent: false,
      });

      if (discoveredFiles.length === 0) {
        console.warn(`   ⚠️  No component files found in ${projectPath}`);
        return null;
      }

      console.log(`   📂 Found ${discoveredFiles.length} component files`);

      // Read file contents for context
      const filesWithContent = await this.loadFileContents(discoveredFiles, projectPath);

      // Create prompt for analysis
      const prompt = this.buildAnalysisPrompt(recommendation, filesWithContent, projectPath);

      // Request change plan from Claude
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        thinking: {
          type: 'enabled',
          budget_tokens: 3000, // More thinking for analysis phase
        },
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (textBlocks.length === 0) {
        console.warn(`   ⚠️  No text response from DiscoveryAgent`);
        return null;
      }

      // Parse JSON response
      const responseText = textBlocks[0].text;
      const changePlan = this.parseChangePlan(responseText, recommendation);

      if (!changePlan) {
        console.warn(`   ⚠️  Failed to parse change plan from response`);
        return null;
      }

      console.log(`   ✅ Change plan created: ${changePlan.changes.length} planned changes`);
      changePlan.changes.forEach((change, i) => {
        console.log(`      ${i + 1}. ${change.tool} at ${change.filePath}:${change.lineNumber}`);
      });

      return changePlan;
    } catch (error) {
      console.error(`   ❌ DiscoveryAgent error:`, error);
      return null;
    }
  }

  private async loadFileContents(
    discoveredFiles: DiscoveredFile[],
    projectPath: string
  ): Promise<Array<DiscoveredFile & { content: string }>> {
    const filesWithContent: Array<DiscoveredFile & { content: string }> = [];

    // Load up to 10 files for analysis
    const filesToLoad = discoveredFiles.slice(0, 10);

    for (const file of filesToLoad) {
      try {
        const content = await fs.readFile(file.absolutePath, 'utf-8');
        filesWithContent.push({ ...file, content });
      } catch (error) {
        console.warn(`   ⚠️  Failed to read ${file.path}: ${error}`);
      }
    }

    return filesWithContent;
  }

  private buildAnalysisPrompt(
    recommendation: Recommendation,
    files: Array<DiscoveredFile & { content: string }>,
    projectPath: string
  ): string {
    // Add line numbers to file contents for accurate counting
    const fileContents = files
      .map(file => {
        const lines = file.content.split('\n');
        const numberedLines = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
        return `
**File: ${file.path}** (${lines.length} lines total)
\`\`\`${file.path.endsWith('.tsx') ? 'tsx' : 'jsx'}
${numberedLines}
\`\`\`
`;
      })
      .join('\n\n');

    return `You are a DISCOVERY AGENT for a UI/UX improvement system.

**🎯 YOUR MISSION:**
Analyze the provided files and create a PRECISE CHANGE PLAN for the following design recommendation.
You MUST output valid JSON only (no markdown, no explanations outside JSON).

**📋 DESIGN RECOMMENDATION:**
- Dimension: ${recommendation.dimension}
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Effort: ${recommendation.effort}/10

**📂 PROJECT FILES:**
${fileContents}

**🔧 AVAILABLE MICRO-CHANGE TOOLS:**
You can plan changes using these tools (each tool modifies EXACTLY ONE thing on ONE line):

1. **updateClassName** - Replace one Tailwind class with another
   - Example: Change "text-sm" to "text-base" on line 42

2. **updateStyleValue** - Change one CSS property value
   - Example: Change fontSize from "14px" to "16px" on line 15

3. **updateTextContent** - Change text content on one line
   - Example: Change "Submit" to "Save" on line 8

4. **appendToClassName** - Add new classes to existing className
   - Example: Add ["focus-visible:ring-2", "focus-visible:ring-blue-500"] to line 24

**📐 CONSTRAINTS:**
- Each change modifies EXACTLY ONE line
- You must provide EXACT line numbers (count from the file contents above)
- You must provide EXACT current values to match
- Line numbers are 1-indexed (first line = 1)
- Plan 1-5 changes maximum per recommendation
- Focus on high-impact, minimal changes

**📤 OUTPUT FORMAT:**
You MUST respond with ONLY valid JSON matching this schema:

{
  "strategy": "Brief description of overall approach (1-2 sentences)",
  "expectedImpact": "What will improve after these changes (1-2 sentences)",
  "changes": [
    {
      "tool": "updateClassName" | "updateStyleValue" | "updateTextContent" | "appendToClassName",
      "filePath": "relative/path/to/file.tsx",
      "lineNumber": 42,
      "lineContent": "        <button className=\"text-sm px-4\">",
      "params": {
        // For updateClassName:
        "oldClassName": "text-sm",
        "newClassName": "text-base"

        // For updateStyleValue:
        "property": "fontSize",
        "oldValue": "14px",
        "newValue": "16px"

        // For updateTextContent:
        "oldText": "Submit",
        "newText": "Save"

        // For appendToClassName:
        "classesToAdd": ["focus-visible:ring-2", "focus-visible:ring-blue-500"]
      },
      "reason": "Brief explanation of why this specific change is needed"
    }
  ]
}

**CRITICAL LINE NUMBER VERIFICATION:**
1. Each line in the file above is prefixed with its line number (e.g., "42: <div>")
2. Find the line with your target className/value/text
3. Use the line number from the prefix (the number before the colon)
4. Copy ONLY the line content AFTER the colon to "lineContent" (exclude the "42: " prefix)
5. Verify the oldClassName/oldValue/oldText appears in that exact line
6. Double-check the line number matches the prefix number

**IMPORTANT:**
- Output ONLY the JSON object (no markdown code blocks, no explanations)
- lineContent MUST be the exact line from the file (copy-paste from above)
- Count line numbers by looking at the file content structure
- Verify exact text matches (oldClassName, oldValue, oldText must match exactly)
- If you cannot make changes, output: {"strategy": "N/A", "expectedImpact": "N/A", "changes": []}

**Project Path:** ${projectPath}

Begin your analysis and output the JSON change plan:`;
  }

  private parseChangePlan(responseText: string, recommendation: Recommendation): ChangePlan | null {
    try {
      // Strip markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```')) {
        const lines = jsonText.split('\n');
        jsonText = lines.slice(1, -1).join('\n'); // Remove first and last line
      }
      if (jsonText.startsWith('json')) {
        jsonText = jsonText.substring(4).trim();
      }

      const parsed = JSON.parse(jsonText);

      return {
        recommendation,
        strategy: parsed.strategy || 'No strategy provided',
        expectedImpact: parsed.expectedImpact || 'No expected impact provided',
        changes: parsed.changes || [],
      };
    } catch (error) {
      console.error(`   ❌ JSON parse error:`, error);
      console.error(`   Response text:`, responseText.substring(0, 500));
      return null;
    }
  }
}
