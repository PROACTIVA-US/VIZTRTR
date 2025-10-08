/**
 * ⚠️ DEPRECATED: Claude Sonnet Implementation Agent V1 - DO NOT USE
 *
 * This V1 plugin has been DEPRECATED in favor of ControlPanelAgentV2.
 *
 * MIGRATION REQUIRED:
 * - Use: src/agents/specialized/ControlPanelAgentV2.ts
 * - V1 success rate: 0-17% (rewrites entire files, validation blocks everything)
 * - V2 success rate: 100% (uses constrained tools for atomic changes)
 * - V2 validated Oct 8, 2025 with 83% tool call reduction
 *
 * See CLAUDE.md for V2 migration guide.
 *
 * ---
 *
 * [LEGACY] Claude Sonnet Implementation Agent
 *
 * Uses Claude with extended thinking and tool use to implement design changes
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  DesignSpec,
  Changes,
  FileChange,
  ValidationResult,
  ChangeConstraints,
  CrossFileValidationResult,
} from '../core/types';
import {
  validateFileChanges,
  formatValidationResult,
  getEffortBasedLimit,
  validateCrossFileInterfaces,
  formatCrossFileValidationResult,
} from '../core/validation';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ClaudeSonnetImplementationPlugin {
  private client: Anthropic;
  private apiKey: string;
  private validationStats = {
    total: 0,
    passed: 0,
    failed: 0,
    crossFileChecks: 0,
    crossFileBlocked: 0,
    reasons: [] as string[],
  };

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.apiKey = apiKey;
  }

  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('   🤖 Using Claude Sonnet agent to implement changes...');

    const topChanges = spec.prioritizedChanges.slice(0, 3);
    const fileChanges: FileChange[] = [];

    // Reset validation stats for this run
    this.validationStats = {
      total: 0,
      passed: 0,
      failed: 0,
      crossFileChecks: 0,
      crossFileBlocked: 0,
      reasons: [],
    };

    for (const recommendation of topChanges) {
      console.log(`   - Implementing: ${recommendation.title} (effort: ${recommendation.effort})`);

      // Use Claude with extended thinking for complex code generation
      const implementation = await this.generateImplementation(recommendation, projectPath);

      if (implementation) {
        fileChanges.push(implementation);
      }
    }

    // Log validation summary
    console.log('\n   📊 Validation Summary:');
    console.log(`      Total attempts: ${this.validationStats.total}`);
    console.log(`      Passed: ${this.validationStats.passed}`);
    console.log(`      Failed: ${this.validationStats.failed}`);
    console.log(`      Cross-file checks: ${this.validationStats.crossFileChecks}`);
    console.log(`      Cross-file blocked: ${this.validationStats.crossFileBlocked}`);
    if (this.validationStats.failed > 0) {
      console.log(`      Failure reasons:`);
      this.validationStats.reasons.forEach(r => console.log(`        - ${r}`));
    }

    return {
      files: fileChanges,
      summary: `Implemented ${fileChanges.length} design improvements using Claude Sonnet agent (${this.validationStats.failed} rejected by scope validation, ${this.validationStats.crossFileBlocked} blocked by cross-file validation)`,
      buildCommand: 'npm run build',
      testCommand: 'npm test',
    };
  }

  private async generateImplementation(
    recommendation: any,
    projectPath: string
  ): Promise<FileChange | null> {
    try {
      // First, let Claude analyze the project structure to find relevant files
      const analysisPrompt = `You are a senior frontend developer tasked with implementing a UI/UX improvement.

**Design Recommendation:**
Dimension: ${recommendation.dimension}
Title: ${recommendation.title}
Description: ${recommendation.description}
Impact: ${recommendation.impact}/10
Effort: ${recommendation.effort}/10

**CRITICAL SCOPE CONSTRAINTS:**

🚨 MAKE SURGICAL CHANGES ONLY - DO NOT REWRITE FILES!

You MUST follow these constraints:
1. **Maximum Changes Based on Effort:**
   - Effort 1-2: Change at most 20 lines
   - Effort 3-4: Change at most 50 lines
   - Effort 5+: Change at most 100 lines

2. **Preserve Exports:** NEVER modify export statements
   - Keep exact same export signature
   - Example: export default MyComponent → MUST STAY EXACTLY THE SAME

3. **Preserve Imports:** Do NOT remove imports unless 100% certain they're unused

4. **File Growth Limit:** New file can be at most 50% larger than original
   - If original is 100 lines, new file CANNOT exceed 150 lines

5. **Targeted Edits:** Modify specific code blocks, not entire files
   - Find the specific className, style, or component to change
   - Replace ONLY that section
   - Example: Change "text-sm" to "text-base" in one className

**CONTEXT AWARENESS:**

This is a performance teleprompter app with THREE distinct UI contexts:

1. **Settings Panel / Header (Desktop Controls)**
   - Files: SettingsPanel.tsx, Header.tsx, LibraryView.tsx
   - Design: NORMAL desktop sizing (buttons 32-36px, text 0.875-1rem)
   - Purpose: User configuration, song selection
   - Viewing distance: 1-2 feet (normal desktop use)
   - DO NOT apply "stage friendly" large sizing here!

2. **Teleprompter View (Stage Performance)**
   - Files: TeleprompterView.tsx and related lyric/chord components
   - Design: LARGE sizing for distance reading (text 3-4.5rem, high contrast)
   - Purpose: Display lyrics/chords during performance
   - Viewing distance: 3-10 feet (stage use)

3. **Blueprint View (Song Editing)**
   - Files: BlueprintView.tsx and related structure components
   - Design: NORMAL sizing with clear information architecture
   - Purpose: Edit song structure
   - Viewing distance: 1-2 feet (normal desktop use)

**Your Task:**
1. Identify which UI CONTEXT this recommendation applies to
2. Apply CONTEXT-APPROPRIATE sizing and design criteria
3. ONLY modify files relevant to that context
4. Make MINIMAL, TARGETED changes (not whole file rewrites)
5. Follow existing code style and patterns

**Project Path:** ${projectPath}

Please think through:
- What UI context does this recommendation target?
- What files should be modified (respect context boundaries!)?
- What are the appropriate sizes/styles for THIS context?

Return your response as JSON:
{
  "filePath": "relative/path/to/file",
  "changes": "description of changes",
  "newCode": "the actual code to implement"
}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
          budget_tokens: 2000,
        },
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      });

      // Extract the implementation from response
      const content = response.content;
      let implementationText = '';

      for (const block of content) {
        if (block.type === 'text') {
          implementationText += block.text;
        }
      }

      // Try to parse JSON response - handle markdown code blocks
      let jsonText = implementationText;

      // Remove markdown code blocks if present
      const codeBlockMatch = implementationText.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        // Try to extract JSON object
        const jsonMatch = implementationText.match(/\{[\s\S]*?\n\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
      }

      if (!jsonText.trim()) {
        console.warn('   ⚠️  Could not parse implementation response');
        return null;
      }

      const implementation = JSON.parse(jsonText);
      const fullPath = path.join(projectPath, implementation.filePath);

      // Read existing file if it exists
      let oldContent = '';
      try {
        oldContent = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        // File doesn't exist yet
      }

      // VALIDATION: Check scope constraints before applying changes
      if (oldContent && implementation.newCode) {
        this.validationStats.total++;

        const validationResult = validateFileChanges(
          oldContent,
          implementation.newCode,
          {
            maxLineDelta: 100,
            maxGrowthPercent: 0.5, // 50% max growth
            preserveExports: true,
            preserveImports: true,
            effortBasedLineLimits: {
              low: 20,
              medium: 50,
              high: 100,
            },
          },
          recommendation.effort
        );

        console.log('\n' + formatValidationResult(validationResult));

        if (!validationResult.valid) {
          console.warn(`   ⚠️  Change exceeds size limits but will attempt (build-first strategy)`);
          console.warn(`   💡 Reason: ${validationResult.reason}`);
          this.validationStats.reasons.push(
            `${implementation.filePath}: ${validationResult.violations[0]}`
          );
        } else {
          this.validationStats.passed++;
        }
      }

      // CROSS-FILE VALIDATION: Check for breaking interface changes
      if (oldContent && implementation.newCode) {
        console.log('\n   🔍 Checking cross-file interface compatibility...');
        this.validationStats.crossFileChecks++;

        const startTime = Date.now();
        const crossFileResult = await validateCrossFileInterfaces(
          fullPath,
          oldContent,
          implementation.newCode,
          projectPath,
          this.apiKey
        );
        const duration = Date.now() - startTime;

        console.log(formatCrossFileValidationResult(crossFileResult));
        console.log(`   ⏱️  Cross-file validation took ${duration}ms`);

        if (!crossFileResult.valid) {
          this.validationStats.crossFileBlocked++;
          this.validationStats.reasons.push(
            `${implementation.filePath}: Breaking interface changes detected`
          );

          console.warn(`   ❌ Change REJECTED by cross-file validation`);
          console.warn(
            `   💡 This change would break ${crossFileResult.affectedFiles.length} dependent file(s)`
          );

          crossFileResult.suggestions.forEach(suggestion => {
            console.warn(`      • ${suggestion}`);
          });

          return null;
        }

        console.log(`   ✅ No breaking changes detected`);
      }

      // For safety, we'll create a backup
      if (oldContent) {
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, oldContent);
      }

      return {
        path: implementation.filePath,
        type: oldContent ? 'edit' : 'create',
        oldContent: oldContent || undefined,
        newContent: implementation.newCode,
        diff: this.createDiff(oldContent, implementation.newCode),
      };
    } catch (error) {
      console.error(`   ❌ Error implementing change: ${error}`);
      return null;
    }
  }

  private createDiff(oldContent: string, newContent: string): string {
    // Simple diff implementation
    if (!oldContent) {
      return `+++ NEW FILE +++\n${newContent}`;
    }

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = '';
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (oldLine) diff += `- ${oldLine}\n`;
        if (newLine) diff += `+ ${newLine}\n`;
      }
    }

    return diff || 'No changes';
  }
}
