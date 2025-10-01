/**
 * ControlPanelAgent - Specialized Agent for Settings & Navigation
 *
 * Responsibilities:
 * - Settings Panel (desktop controls, sliders, tabs)
 * - Header (navigation, buttons)
 * - Library View (song selection)
 *
 * Design Criteria:
 * - Normal desktop sizing (32-36px buttons, 0.875-1rem text)
 * - Information density optimized for 1-2ft viewing distance
 * - Precise interactions (desktop mouse/keyboard)
 */

import Anthropic from '@anthropic-ai/sdk';
import { Recommendation, FileChange } from '../../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ControlPanelAgent {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  // Known files this agent is responsible for
  private readonly MANAGED_FILES = [
    'components/SettingsPanel.tsx',
    'components/Header.tsx',
    'components/LibraryView.tsx',
  ];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Implement changes for control panel components
   */
  async implement(
    recommendations: Recommendation[],
    projectPath: string
  ): Promise<FileChange[]> {
    console.log(`   🎛️  ControlPanelAgent processing ${recommendations.length} recommendations...`);

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
      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*?\n\}/);

      if (!jsonMatch) {
        console.warn('   ⚠️  Could not parse implementation response');
        return null;
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const implementation = JSON.parse(jsonText);

      // Validate file is in our managed set
      if (!this.MANAGED_FILES.includes(implementation.filePath)) {
        console.warn(`   ⚠️  File not managed by ControlPanelAgent: ${implementation.filePath}`);
        return null;
      }

      const fullPath = path.join(projectPath, implementation.filePath);

      // Read existing content
      let oldContent = '';
      try {
        oldContent = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        console.error(`   ❌ File not found: ${fullPath}`);
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

  private buildImplementationPrompt(recommendation: Recommendation, projectPath: string): string {
    return `You are a specialist CONTROL PANEL AGENT for desktop UI components.

**DESIGN RECOMMENDATION:**
- Dimension: ${recommendation.dimension}
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Effort: ${recommendation.effort}/10

**YOUR RESPONSIBILITIES:**
You ONLY modify these files:
${this.MANAGED_FILES.map((f) => `- ${f}`).join('\n')}

**DESIGN CRITERIA FOR CONTROL PANELS:**
- Normal desktop sizing: 32-36px buttons, 0.875-1rem text
- NOT stage-friendly (that's TeleprompterAgent's job)
- Optimize for 1-2ft viewing distance (normal desktop use)
- Information density: Show more data efficiently
- Precise interactions: Mouse and keyboard optimized

**YOUR TASK:**
1. **Think** about which of YOUR managed files needs modification
2. **Read** the existing code structure carefully
3. **Implement** the change following React/TypeScript/Tailwind best practices
4. **Return** ONLY the file that needs modification

**IMPORTANT:**
- Do NOT create new components or files
- Do NOT modify TeleprompterView or Blueprint components
- Stay within YOUR file boundaries
- Use existing Tailwind utility classes
- Maintain TypeScript type safety

Return as JSON:
\`\`\`json
{
  "filePath": "components/SettingsPanel.tsx",
  "changes": "Brief description of what changed",
  "newCode": "/* Complete file contents with your changes */"
}
\`\`\`

**Project Path:** ${projectPath}

Think carefully about which file needs modification, then implement the change.`;
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
   * Check if this recommendation is relevant to control panel components
   */
  isRelevant(recommendation: Recommendation): boolean {
    const relevantKeywords = [
      'settings',
      'header',
      'button',
      'icon',
      'navigation',
      'library',
      'panel',
      'control',
      'upload',
      'menu',
    ];

    const text = `${recommendation.title} ${recommendation.description}`.toLowerCase();
    return relevantKeywords.some((keyword) => text.includes(keyword));
  }
}
