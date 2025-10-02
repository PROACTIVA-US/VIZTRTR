/**
 * TeleprompterAgent - Specialized Agent for Stage Performance View
 *
 * Responsibilities:
 * - TeleprompterView component
 * - Lyrics display
 * - Chord display
 * - Performance-critical UI
 *
 * Design Criteria:
 * - LARGE sizing for distance viewing (3-10ft)
 * - Typography: 3-4.5rem base text
 * - Contrast: Very high (7:1 minimum for lyrics)
 * - Stage-friendly: Optimize for performers reading while playing
 */

import Anthropic from '@anthropic-ai/sdk';
import { Recommendation, FileChange } from '../../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TeleprompterAgent {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  // Known files this agent is responsible for
  // Note: This project doesn't have a teleprompter view - it's a VIZTRTR UI builder
  // This agent should skip recommendations unless they're truly performance-critical
  private readonly MANAGED_FILES: string[] = [];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Implement changes for teleprompter components
   */
  async implement(
    recommendations: Recommendation[],
    projectPath: string
  ): Promise<FileChange[]> {
    console.log(
      `   🎤 TeleprompterAgent processing ${recommendations.length} recommendations...`
    );

    const changes: FileChange[] = [];

    for (const rec of recommendations) {
      const change = await this.implementRecommendation(rec, projectPath);
      if (change) {
        changes.push(change);
      }
    }

    return changes;
  }

  private async implementRecommendation(
    recommendation: Recommendation,
    projectPath: string
  ): Promise<FileChange | null> {
    try {
      const prompt = this.buildImplementationPrompt(recommendation, projectPath);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
          budget_tokens: 1500, // Extended thinking for code generation
        },
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract implementation
      const textBlocks = response.content.filter((block) => block.type === 'text');
      const fullText = textBlocks.map((block) => (block as any).text).join('\n');

      // Parse JSON response
      const jsonMatch =
        fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*?\n\}/);

      if (!jsonMatch) {
        console.warn('   ⚠️  Could not parse implementation response');
        return null;
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const implementation = JSON.parse(jsonText);

      // Normalize file path (remove leading slashes, normalize separators)
      const normalizedPath = implementation.filePath.replace(/^\/+/, '').replace(/\\/g, '/');

      // Skip if no managed files (this project may not have teleprompter components)
      if (this.MANAGED_FILES.length === 0) {
        console.warn(`   ⚠️  TeleprompterAgent has no managed files for this project`);
        return null;
      }

      // Validate file is in our managed set
      if (!this.MANAGED_FILES.includes(normalizedPath)) {
        console.warn(
          `   ⚠️  File not managed by TeleprompterAgent: ${normalizedPath}`
        );
        console.warn(`   📋 Managed files: ${this.MANAGED_FILES.join(', ')}`);
        return null;
      }

      const fullPath = path.join(projectPath, normalizedPath);

      // Check file exists before attempting to read
      try {
        await fs.access(fullPath);
      } catch (e) {
        console.error(`   ❌ File not found: ${fullPath}`);
        console.error(`   💡 Project path: ${projectPath}`);
        console.error(`   💡 Attempted file: ${normalizedPath}`);
        return null;
      }

      // Read existing content
      let oldContent = '';
      try {
        oldContent = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        console.error(`   ❌ Error reading file: ${fullPath}`, e);
        return null;
      }

      // Create backup
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, oldContent);

      // Write new content
      await fs.writeFile(fullPath, implementation.newCode);

      console.log(`   ✅ Modified: ${implementation.filePath}`);

      return {
        path: implementation.filePath,
        type: 'edit',
        oldContent,
        newContent: implementation.newCode,
        diff: this.createDiff(oldContent, implementation.newCode),
      };
    } catch (error) {
      console.error(`   ❌ Error implementing change:`, error);
      return null;
    }
  }

  private buildImplementationPrompt(
    recommendation: Recommendation,
    projectPath: string
  ): string {
    return `You are a specialist TELEPROMPTER AGENT for stage performance UI.

**DESIGN RECOMMENDATION:**
- Dimension: ${recommendation.dimension}
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Effort: ${recommendation.effort}/10

**YOUR RESPONSIBILITIES:**
You ONLY modify these files:
${this.MANAGED_FILES.map((f) => `- ${f}`).join('\n')}

**DESIGN CRITERIA FOR STAGE PERFORMANCE:**
- LARGE typography: 3-4.5rem base text (NOT normal web sizing!)
- VERY HIGH contrast: 7:1 minimum for lyrics on dark background
- Viewing distance: 3-10 feet (performers reading while playing)
- Readability at distance is CRITICAL
- Generous line spacing: 1.8-2.0 line-height
- Clear visual hierarchy between chords and lyrics

**YOUR TASK:**
1. **Think** about how this improves stage performance readability
2. **Read** the existing TeleprompterView.tsx structure carefully
3. **Implement** changes that optimize for DISTANCE VIEWING
4. **Return** the complete modified file

**IMPORTANT:**
- Do NOT reduce text sizes below 3rem for lyrics
- Do NOT use normal web sizing (0.875-1rem) - that's for Settings!
- Focus on contrast, readability, and distance visibility
- Use existing Tailwind utility classes where possible
- Maintain TypeScript type safety
- Keep existing component structure

Return as JSON:
\`\`\`json
{
  "filePath": "components/TeleprompterView.tsx",
  "changes": "Brief description of what changed for stage performance",
  "newCode": "/* Complete file contents with your changes */"
}
\`\`\`

**Project Path:** ${projectPath}

Think carefully about stage performance needs, then implement the change.`;
  }

  private createDiff(oldContent: string, newContent: string): string {
    // Simple line-based diff
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = '';
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i]) diff += `- ${oldLines[i]}\n`;
        if (newLines[i]) diff += `+ ${newLines[i]}\n`;
      }
    }

    return diff;
  }

  /**
   * Check if this recommendation is relevant to teleprompter
   */
  isRelevant(recommendation: Recommendation): boolean {
    const relevantKeywords = [
      'teleprompter',
      'lyrics',
      'chord',
      'performance',
      'stage',
      'readability',
      'contrast',
      'typography',
      'distance',
      'viewing',
    ];

    const text = `${recommendation.title} ${recommendation.description}`.toLowerCase();
    return relevantKeywords.some((keyword) => text.includes(keyword));
  }
}
