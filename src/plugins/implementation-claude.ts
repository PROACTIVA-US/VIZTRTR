/**
 * Claude Sonnet Implementation Agent
 *
 * Uses Claude with extended thinking and tool use to implement design changes
 */

import Anthropic from '@anthropic-ai/sdk';
import { DesignSpec, Changes, FileChange } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ClaudeSonnetImplementationPlugin {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('   🤖 Using Claude Sonnet agent to implement changes...');

    const topChanges = spec.prioritizedChanges.slice(0, 3);
    const fileChanges: FileChange[] = [];

    for (const recommendation of topChanges) {
      console.log(`   - Implementing: ${recommendation.title}`);

      // Use Claude with extended thinking for complex code generation
      const implementation = await this.generateImplementation(recommendation, projectPath);

      if (implementation) {
        fileChanges.push(implementation);
      }
    }

    return {
      files: fileChanges,
      summary: `Implemented ${fileChanges.length} design improvements using Claude Sonnet agent`,
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

**Task:**
1. Identify which file(s) in the project need to be modified
2. Generate the specific code changes needed
3. Ensure changes follow best practices (TypeScript, React/Vue/etc.)
4. Maintain existing code style and patterns

**Project Path:** ${projectPath}

Please think through:
- What files are most likely affected?
- What specific code changes are needed?
- How to maintain consistency with existing patterns?

Return your response as JSON:
{
  "filePath": "relative/path/to/file",
  "changes": "description of changes",
  "newCode": "the actual code to implement"
}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
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

      // Try to parse JSON response
      const jsonMatch = implementationText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('   ⚠️  Could not parse implementation response');
        return null;
      }

      const implementation = JSON.parse(jsonMatch[0]);
      const fullPath = path.join(projectPath, implementation.filePath);

      // Read existing file if it exists
      let oldContent = '';
      try {
        oldContent = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        // File doesn't exist yet
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
