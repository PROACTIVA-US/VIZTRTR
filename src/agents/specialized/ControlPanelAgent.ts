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
import { Recommendation, FileChange, ValidationResult } from '../../core/types';
import { validateFileChanges, formatValidationResult } from '../../core/validation';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ControlPanelAgent {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';
  private validationStats = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  // Known files this agent is responsible for
  private readonly MANAGED_FILES = [
    'src/components/Header.tsx',
    'src/components/PromptInput.tsx',
    'src/components/Footer.tsx',
    'src/components/AgentCard.tsx',
    'src/components/AgentOrchestration.tsx',
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
    this.validationStats = { total: 0, passed: 0, failed: 0 };

    for (const rec of recommendations) {
      const change = await this.implementRecommendation(rec, projectPath);
      if (change) {
        changes.push(change);
      }
    }

    // Log validation stats
    if (this.validationStats.total > 0) {
      console.log(`   📊 Validation: ${this.validationStats.passed}/${this.validationStats.total} passed`);
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

      // Normalize file path (remove leading slashes, normalize separators)
      const normalizedPath = implementation.filePath.replace(/^\/+/, '').replace(/\\/g, '/');

      // Validate file is in our managed set
      if (!this.MANAGED_FILES.includes(normalizedPath)) {
        console.warn(`   ⚠️  File not managed by ControlPanelAgent: ${normalizedPath}`);
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

      // VALIDATION: Check scope constraints
      this.validationStats.total++;

      const validationResult = validateFileChanges(
        oldContent,
        implementation.newCode,
        {
          maxLineDelta: 100,
          maxGrowthPercent: 0.5,
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
        this.validationStats.failed++;
        console.warn(`   ❌ Change REJECTED: ${validationResult.reason}`);
        console.warn(`   💡 Make smaller, more targeted changes`);
        return null;
      }

      this.validationStats.passed++;

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
- Normal desktop sizing: 32-48px buttons, 0.875-1.125rem text
- Modern web UI best practices
- Optimize for 1-2ft viewing distance (normal desktop use)
- Information density: Show data efficiently
- Precise interactions: Mouse and keyboard optimized

**CRITICAL CONSTRAINTS:**
🚨 MAKE SURGICAL CHANGES ONLY - DO NOT REWRITE FILES!

1. **Make SURGICAL changes only - modify specific lines, not entire files**
2. **PRESERVE all export statements exactly as they are**
3. **Maximum ${this.getMaxLinesForEffort(recommendation.effort)} lines changed (effort ${recommendation.effort})**
4. **Use targeted edits: find specific code blocks and replace them**
5. **Do NOT rewrite components from scratch**
6. **Focus on className changes for visual improvements**
7. **File can grow by max 50% (if 100 lines → max 150 lines)**

Examples of GOOD changes:
- Change className="text-sm" to className="text-base"
- Add shadow-md to a button's className
- Update padding from p-2 to p-4
- Change bg-gray-100 to bg-gray-50

Examples of BAD changes:
- Rewriting entire component
- Changing export statements
- Adding new components
- Removing imports

**YOUR TASK:**
1. **Think** about which of YOUR managed files needs modification
2. **Read** the existing code structure carefully
3. **Implement** MINIMAL, TARGETED changes (specific classNames, styles)
4. **Return** ONLY the file that needs modification with surgical edits

**IMPORTANT:**
- Do NOT create new components or files
- Stay within YOUR file boundaries
- Use existing Tailwind utility classes
- Maintain TypeScript type safety
- File paths MUST start with "src/components/"
- Make the SMALLEST possible change to achieve the goal

Return as JSON:
\`\`\`json
{
  "filePath": "src/components/Header.tsx",
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

  private getMaxLinesForEffort(effortScore: number): number {
    if (effortScore <= 2) return 20;
    if (effortScore <= 4) return 50;
    return 100;
  }

  /**
   * Check if this recommendation is relevant to control panel components
   */
  isRelevant(recommendation: Recommendation): boolean {
    // For a web builder UI, most UI improvements are relevant
    const relevantKeywords = [
      'visual',
      'hierarchy',
      'typography',
      'color',
      'contrast',
      'spacing',
      'layout',
      'component',
      'accessibility',
      'button',
      'form',
      'input',
      'header',
      'footer',
      'navigation',
      'shadow',
      'depth',
      'label',
      'semantic',
      'aria',
      'screen reader',
      'clickable',
    ];

    const text = `${recommendation.title} ${recommendation.description}`.toLowerCase();

    // Default to true for general web UI improvements
    // Only exclude if it's clearly not relevant
    return relevantKeywords.some((keyword) => text.includes(keyword)) ||
           recommendation.dimension !== 'animation'; // Most things relevant except pure animation
  }
}
