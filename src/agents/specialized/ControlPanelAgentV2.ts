/**
 * ControlPanelAgent V2 - Constrained Tools Integration
 *
 * Uses MicroChangeToolkit to enforce surgical, atomic changes.
 * Prevents file rewrites by using tool-based change API.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Recommendation, FileChange } from '../../core/types';
import { MicroChangeToolkit, MicroChangeResult } from '../../tools/MicroChangeToolkit';
import { getMicroChangeTools, isMicroChangeTool } from '../../tools/micro-change-tools';
import {
  discoverComponentFiles,
  DiscoveredFile,
  summarizeDiscovery,
} from '../../utils/file-discovery';
import { generateLineHintsForRecommendation } from '../../utils/line-hint-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ControlPanelAgentV2 {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';
  private toolkit: MicroChangeToolkit;
  private discoveredFiles: DiscoveredFile[] = [];

  constructor(apiKey: string, projectPath: string) {
    this.client = new Anthropic({ apiKey });
    this.toolkit = new MicroChangeToolkit(projectPath);
  }

  /**
   * Implement changes using constrained tools
   */
  async implement(recommendations: Recommendation[], projectPath: string): Promise<FileChange[]> {
    console.log(
      `   🎛️  ControlPanelAgentV2 (Constrained Tools) processing ${recommendations.length} recommendations...`
    );

    // Discover component files
    console.log(`   🔍 Discovering component files in: ${projectPath}`);
    this.discoveredFiles = await discoverComponentFiles(projectPath, {
      maxFileSize: 50 * 1024,
      includeContent: false,
    });

    console.log(summarizeDiscovery(this.discoveredFiles));

    if (this.discoveredFiles.length === 0) {
      console.warn(`   ⚠️  No component files found in ${projectPath}`);
      return [];
    }

    const changes: FileChange[] = [];

    for (const rec of recommendations) {
      const change = await this.implementRecommendation(rec, projectPath);
      if (change) {
        changes.push(change);
      }
    }

    // Print statistics
    const stats = this.toolkit.getStats();
    console.log(`\n   📊 Micro-Change Statistics:`);
    console.log(`      Total Changes: ${stats.totalChanges}`);
    console.log(`      Successful: ${stats.successfulChanges}`);
    console.log(`      Failed: ${stats.failedChanges}`);
    console.log(`      By Type:`, stats.changesByType);

    return changes;
  }

  private async implementRecommendation(
    recommendation: Recommendation,
    projectPath: string
  ): Promise<FileChange | null> {
    try {
      console.log(`\n   🎨 Implementing: ${recommendation.title}`);

      // Build prompt for tool-based implementation (with line hints optimization)
      const prompt = await this.buildToolPrompt(recommendation, projectPath);

      // Initial request with tools
      let messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      let response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
          budget_tokens: 1500,
        },
        tools: getMicroChangeTools(),
        messages,
      });

      console.log(`   📊 Response Stop Reason: ${response.stop_reason}`);

      const allChanges: MicroChangeResult[] = [];

      // Process tool calls in a loop
      while (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        console.log(`   🔨 Processing ${toolUses.length} tool call(s)...`);

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUses) {
          if (!isMicroChangeTool(toolUse.name)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({
                success: false,
                error: `Unknown tool: ${toolUse.name}`,
              }),
            });
            continue;
          }

          console.log(`      ⚙️  Tool: ${toolUse.name}`);
          console.log(`         Input:`, JSON.stringify(toolUse.input, null, 2));

          let result: MicroChangeResult;
          switch (toolUse.name) {
            case 'updateClassName':
              result = await this.toolkit.updateClassName(toolUse.input as any);
              break;
            case 'updateStyleValue':
              result = await this.toolkit.updateStyleValue(toolUse.input as any);
              break;
            case 'updateTextContent':
              result = await this.toolkit.updateTextContent(toolUse.input as any);
              break;
            case 'appendToClassName':
              result = await this.toolkit.appendToClassName(toolUse.input as any);
              break;
            default:
              result = {
                success: false,
                filePath: '',
                changeType: 'unknown',
                before: '',
                after: '',
                error: 'Unknown tool',
              };
          }

          console.log(
            `         ${result.success ? '✅' : '❌'} Result: ${result.success ? 'Success' : result.error}`
          );
          if (result.success) {
            console.log(`            Before: ${result.before.trim()}`);
            console.log(`            After:  ${result.after.trim()}`);
            allChanges.push(result);
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        // Continue conversation with tool results
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          thinking: {
            type: 'enabled',
            budget_tokens: 1500,
          },
          tools: getMicroChangeTools(),
          messages,
        });

        console.log(`   📊 Response Stop Reason: ${response.stop_reason}`);
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      if (textBlocks.length > 0) {
        console.log(`\n   💬 Agent Summary:`);
        console.log(`      ${textBlocks.map(b => b.text).join('\n      ')}`);
      }

      // If no changes were made, return null
      if (allChanges.length === 0) {
        console.warn(`   ⚠️  No changes were made for: ${recommendation.title}`);
        return null;
      }

      // Create FileChange from all micro-changes
      // Group changes by file (for now, assume all changes are to the same file)
      const primaryFile = allChanges[0].filePath;
      const fullPath = path.resolve(projectPath, primaryFile);

      // Read the updated file content
      const newContent = await fs.readFile(fullPath, 'utf-8');

      // Read backup or reconstruct old content from changes
      const oldContent = await this.reconstructOldContent(allChanges, newContent);

      // Wait for file stabilization
      console.log(`   ⏳ Waiting 3s for file stabilization (HMR, linters)...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      return {
        path: primaryFile,
        type: 'edit',
        oldContent,
        newContent,
        diff: this.createDiff(allChanges),
      };
    } catch (error) {
      console.error(`   ❌ Error implementing change:`, error);
      return null;
    }
  }

  private async buildToolPrompt(
    recommendation: Recommendation,
    projectPath: string
  ): Promise<string> {
    // Group files by directory
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
        const fileStr = files.slice(0, 10).join(', ');
        const more = files.length > 10 ? ` (+${files.length - 10} more)` : '';
        return `- ${dir}/ → ${fileStr}${more}`;
      })
      .join('\n');

    // Generate line hints for all discovered files (OPTIMIZATION)
    let lineHints = '';
    for (const file of this.discoveredFiles.slice(0, 5)) {
      // Limit to first 5 files for performance
      const hints = await generateLineHintsForRecommendation(
        file.absolutePath,
        recommendation.dimension,
        recommendation.description
      );
      if (hints) {
        lineHints += hints;
        break; // Stop after first file with matches
      }
    }

    return `You are a specialist CONTROL PANEL AGENT with access to MICRO-CHANGE TOOLS.

**🔧 CONSTRAINED TOOLS MODE ACTIVATED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST use the provided micro-change tools to make changes.
You CANNOT rewrite entire files or make large structural changes.

**AVAILABLE TOOLS:**
1. **updateClassName** - Change a single className on one line
   - Example: Change "text-sm" to "text-base" on line 42

2. **updateStyleValue** - Change a single CSS property value
   - Example: Change fontSize from "14px" to "16px" on line 15

3. **updateTextContent** - Change text content on one line
   - Example: Change "Submit" to "Save" on line 8

4. **appendToClassName** - Add new classes to existing className
   - Example: Add "focus-visible:ring-2 focus-visible:ring-blue-500" to line 24

**IMPORTANT CONSTRAINTS:**
- Each tool call modifies EXACTLY ONE thing on ONE line
- You must specify exact line numbers (1-indexed)
- You must provide exact old values to match
- Multiple changes require multiple tool calls
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**DESIGN RECOMMENDATION:**
- Dimension: ${recommendation.dimension}
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}/10
- Effort: ${recommendation.effort}/10

**AVAILABLE FILES IN PROJECT:**
${fileList}
${lineHints}

**YOUR TASK:**
1. Analyze the recommendation and identify which file needs modification
2. ${lineHints ? 'USE THE LINE HINTS ABOVE - exact line numbers are provided!' : 'Identify the specific lines that need to change'}
3. Use the micro-change tools to make surgical edits
4. Make 1-3 tool calls maximum (keep changes minimal)
5. ${lineHints ? 'IMPORTANT: Start with the exact line numbers from the hints to minimize search attempts' : ''}

**DESIGN CRITERIA FOR CONTROL PANELS:**
- Desktop sizing: 32-48px buttons, 0.875-1.125rem text
- Optimize for 1-2ft viewing distance
- Use Tailwind CSS classes for styling

**WORKFLOW:**
1. First, tell me which file you'll modify and why
2. Then, make tool calls for each specific change
3. Finally, summarize what was changed

Begin by analyzing the recommendation and planning your micro-changes.

**Project Path:** ${projectPath}`;
  }

  private async reconstructOldContent(
    changes: MicroChangeResult[],
    currentContent: string
  ): Promise<string> {
    // Reconstruct old content by reversing changes
    let oldContent = currentContent;

    // Apply changes in reverse order
    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];
      if (change.success) {
        oldContent = oldContent.replace(change.after, change.before);
      }
    }

    return oldContent;
  }

  private createDiff(changes: MicroChangeResult[]): string {
    return changes
      .filter(c => c.success)
      .map(c => {
        const lineInfo = c.lineNumber ? `:${c.lineNumber}` : '';
        return `--- ${c.filePath}${lineInfo}\n- ${c.before}\n+ ${c.after}`;
      })
      .join('\n\n');
  }

  /**
   * Get toolkit for external access (testing, etc.)
   */
  getToolkit(): MicroChangeToolkit {
    return this.toolkit;
  }
}
