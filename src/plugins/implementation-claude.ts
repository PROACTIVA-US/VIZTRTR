/**
 * Claude Sonnet Implementation Agent
 *
 * Uses Claude with extended thinking and tool use to implement design changes
 */

import Anthropic from '@anthropic-ai/sdk';
import { DesignSpec, Changes, FileChange } from '../core/types';
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

**CRITICAL CONTEXT RULES - RESPECT UI BOUNDARIES:**

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
4. Follow existing code style and patterns

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
