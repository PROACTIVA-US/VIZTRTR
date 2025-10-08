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
import {
  discoverComponentFiles,
  DiscoveredFile,
  summarizeDiscovery,
} from '../../utils/file-discovery';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ControlPanelAgent {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';
  private validationStats = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  // Discovered files (populated dynamically)
  private discoveredFiles: DiscoveredFile[] = [];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Check if this recommendation should use CSS-only mode
   */
  private shouldUseCSSOnlyMode(recommendation: Recommendation): boolean {
    // Use CSS-only for low-effort, high-impact visual changes
    const cssOnlyDimensions = [
      'color & contrast',
      'color_contrast',
      'typography',
      'visual hierarchy',
      'visual_hierarchy',
      'spacing & layout',
      'spacing_layout',
      'component design',
      'component_design',
    ];

    return recommendation.effort <= 2 && cssOnlyDimensions.includes(recommendation.dimension);
  }

  /**
   * Implement changes for control panel components
   */
  async implement(recommendations: Recommendation[], projectPath: string): Promise<FileChange[]> {
    console.log(`   🎛️  ControlPanelAgent processing ${recommendations.length} recommendations...`);

    // Discover component files in the project
    console.log(`   🔍 Discovering component files in: ${projectPath}`);
    this.discoveredFiles = await discoverComponentFiles(projectPath, {
      maxFileSize: 50 * 1024, // 50KB max
      includeContent: false,
    });

    console.log(summarizeDiscovery(this.discoveredFiles));

    if (this.discoveredFiles.length === 0) {
      console.warn(`   ⚠️  No component files found in ${projectPath}`);
      return [];
    }

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
      console.log(
        `   📊 Validation: ${this.validationStats.passed}/${this.validationStats.total} passed`
      );
    }

    return changes;
  }

  private async implementRecommendation(
    recommendation: Recommendation,
    projectPath: string
  ): Promise<FileChange | null> {
    try {
      const useCSSOnly = this.shouldUseCSSOnlyMode(recommendation);
      if (useCSSOnly) {
        console.log(`   🎨 Using CSS-only mode for: ${recommendation.title}`);
      }
      const prompt = this.buildImplementationPrompt(recommendation, projectPath, useCSSOnly);

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
      const textBlocks = response.content.filter(block => block.type === 'text');
      const fullText = textBlocks.map(block => (block as any).text).join('\n');

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

      // Validate file is in our discovered set
      const discoveredFile = this.discoveredFiles.find(f => f.path === normalizedPath);
      if (!discoveredFile) {
        console.warn(`   ⚠️  File not found in discovered files: ${normalizedPath}`);
        console.warn(
          `   💡 Available files: ${this.discoveredFiles
            .slice(0, 5)
            .map(f => f.path)
            .join(', ')}...`
        );
        return null;
      }

      const fullPath = discoveredFile.absolutePath;

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

      // VALIDATION: Log info only (build-first strategy)
      this.validationStats.total++;

      const validationResult = validateFileChanges(
        oldContent,
        implementation.newCode,
        {
          // Use default constraints from validation.ts
          // Allows effort-based line limits: 40/80/150 for low/medium/high
        },
        recommendation.effort
      );

      console.log('\n' + formatValidationResult(validationResult));

      if (!validationResult.valid) {
        console.warn(`   ⚠️  Change exceeds size limits but will attempt (build-first strategy)`);
        console.warn(`   💡 Reason: ${validationResult.reason}`);
      } else {
        this.validationStats.passed++;
      }

      // Create backup
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, oldContent);

      // Write new content
      await fs.writeFile(fullPath, implementation.newCode);

      // Wait for file to stabilize (Vite HMR, linters, formatters)
      console.log(`   ⏳ Waiting 3s for file stabilization (HMR, linters)...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

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
    projectPath: string,
    cssOnlyMode = false
  ): string {
    // Group files by directory for better organization
    const filesByDir = this.discoveredFiles.reduce(
      (acc, file) => {
        const dir = path.dirname(file.path);
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(file.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    const fileList = Object.entries(filesByDir)
      .map(([dir, files]) => {
        const fileStr = files.slice(0, 10).join(', '); // Show first 10 files per dir
        const more = files.length > 10 ? ` (+${files.length - 10} more)` : '';
        return `- ${dir}/ → ${fileStr}${more}`;
      })
      .join('\n');

    const cssOnlyHeader = cssOnlyMode
      ? `
**🎨 CSS-ONLY MODE ACTIVATED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Make ONLY className/style changes. NO structural changes.

ALLOWED:
✅ Change className values (e.g., "text-sm" → "text-base")
✅ Modify Tailwind classes (e.g., "bg-gray-500" → "bg-gray-300")
✅ Update inline styles (if already present)

FORBIDDEN:
❌ Add/remove JSX elements (no <div>, <span>, etc.)
❌ Change JSX structure or hierarchy
❌ Add/remove props (except className/style)
❌ Modify imports/exports
❌ Add event handlers or logic
❌ Change function signatures

TARGET: Change 1-3 className attributes ONLY, nothing more.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : '';

    return `You are a specialist CONTROL PANEL AGENT for desktop UI components.
${cssOnlyHeader}
**DESIGN RECOMMENDATION:**
- Dimension: ${recommendation.dimension}
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Effort: ${recommendation.effort}/10

**AVAILABLE FILES IN PROJECT:**
${fileList}

**YOUR RESPONSIBILITIES:**
- Analyze the recommendation and determine which file(s) need modification
- You can ONLY modify files from the list above
- Choose the most relevant file for this specific change

**DESIGN CRITERIA FOR CONTROL PANELS:**
- Normal desktop sizing: 32-48px buttons, 0.875-1.125rem text
- Modern web UI best practices
- Optimize for 1-2ft viewing distance (normal desktop use)
- Information density: Show data efficiently
- Precise interactions: Mouse and keyboard optimized

**REACT/JSX RULES:**
🚨 CRITICAL: This project uses React 17+ with the new JSX transform.
- DO NOT add "import React from 'react'" to ANY file
- React import is NOT needed for JSX to work
- Only import specific hooks/utilities: "import { useState } from 'react'"
- If a file doesn't have "import React", DO NOT add it

**DEPENDENCY RULES:**
🚨 CRITICAL: DO NOT add new external libraries.
- DO NOT import from '@mui/material', 'antd', 'bootstrap', or any UI library
- Only use what's already imported in the existing file
- This project uses Tailwind CSS for styling (className changes only)
- DO NOT add new npm packages or imports

Examples:
✅ CORRECT:
   import { useState, useEffect } from 'react';

❌ WRONG (will cause build error):
   import React from 'react';
   import { useState } from 'react';
   import { Button } from '@mui/material';

**CRITICAL CONSTRAINTS:**
🚨 MAKE SURGICAL CHANGES ONLY - DO NOT REWRITE FILES!

1. **Make SURGICAL changes only - modify specific lines, not entire files**
2. **PRESERVE all export statements exactly as they are**
3. **Maximum ${this.getMaxLinesForEffort(recommendation.effort)} lines changed (effort ${recommendation.effort})**
4. **Use targeted edits: find specific code blocks and replace them**
5. **Do NOT rewrite components from scratch**
6. **Focus on className changes for visual improvements**
7. **File can grow by max 50% (if 100 lines → max 150 lines)**

**SIZE CONSTRAINTS - STRICTLY ENFORCED:**
🚨 Your change will be REJECTED if it violates ANY of these:

1. **Maximum ${this.getMaxLinesForEffort(recommendation.effort)} lines changed** (for effort ${recommendation.effort})
2. **File growth limits (dynamic based on file size):**
   - Files < 30 lines: max 100% growth (can double in size)
   - Files 30-50 lines: max 75% growth
   - Files 50-100 lines: max 50% growth
   - Files > 100 lines: max 30% growth
3. **Focus on 1-3 specific changes only**

**MICRO-CHANGE STRATEGY:**
✅ DO: Find ONE className and modify it
✅ DO: Add ONE style property
✅ DO: Change ONE value (px, color, spacing)

❌ DON'T: Rewrite entire components
❌ DON'T: Change multiple sections
❌ DON'T: Add new imports (unless absolutely required)

**EXAMPLE OF ACCEPTABLE CHANGE:**
Before:
  <button className="bg-gray-500 text-sm px-3">Click</button>

After:
  <button className="bg-gray-300 text-base px-4">Click</button>

Only 3 values changed in 1 line. THIS IS THE TARGET SIZE.

Examples of GOOD changes:
- Change className="text-sm" to className="text-base"
- Add shadow-md to a button's className
- Update padding from p-2 to p-4
- Change bg-gray-100 to bg-gray-50

Examples of BAD changes:
- Rewriting entire component
- Changing export statements
- Adding new components
- Adding "import React from 'react'"

**YOUR TASK:**
1. **Think** about which of YOUR managed files needs modification
2. **Read** the existing code structure carefully
3. **Implement** MINIMAL, TARGETED changes (specific classNames, styles)
4. **Return** ONLY the file that needs modification with surgical edits

**IMPORTANT:**
- Do NOT create new components or files
- Choose a file from the AVAILABLE FILES list above
- Use existing utility classes (Tailwind, Material-UI, etc.)
- Maintain TypeScript type safety
- File paths must match EXACTLY what's in the available files list
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
    if (effortScore <= 2) return 10; // REDUCED from 20 to match validation.ts
    if (effortScore <= 4) return 25; // REDUCED from 50 to match validation.ts
    return 50; // REDUCED from 100 to match validation.ts
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
    return (
      relevantKeywords.some(keyword => text.includes(keyword)) ||
      recommendation.dimension !== 'animation'
    ); // Most things relevant except pure animation
  }
}
