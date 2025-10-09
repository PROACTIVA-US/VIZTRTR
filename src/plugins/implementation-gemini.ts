/**
 * Gemini 2.5 Computer Use Implementation Plugin
 * Uses Gemini Computer Use Preview to implement design changes through browser automation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DesignSpec, Changes, FileChange, VIZTRTRPlugin } from '../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface GeminiAction {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'edit_file';
  selector?: string;
  text?: string;
  url?: string;
  x?: number;
  y?: number;
  duration?: number;
  filePath?: string;
  content?: string;
  description: string;
}

interface GeminiPlan {
  steps: GeminiAction[];
  reasoning: string;
  filesAffected: string[];
}

export class GeminiImplementationPlugin implements VIZTRTRPlugin {
  name = 'implementation-gemini';
  version = '1.0.0';
  type = 'implementation' as const;

  private model: any;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'Gemini API key required. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.'
      );
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-computer-use-preview-10-2025',
    });

    console.log('✅ Gemini 2.5 Computer Use plugin initialized');
  }

  /**
   * Implement design changes using Gemini Computer Use
   */
  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('\n🤖 Gemini Computer Use: Planning implementation...');

    try {
      // Extract top recommendation
      const recommendation = spec.prioritizedChanges[0];
      if (!recommendation) {
        throw new Error('No recommendations to implement');
      }

      // Generate implementation plan with Gemini
      const plan = await this.generateImplementationPlan(spec, projectPath, recommendation);

      // Execute file changes
      const fileChanges = await this.executeFileChanges(plan, projectPath);

      return {
        files: fileChanges,
        summary: this.generateChangeSummary(fileChanges, recommendation),
        buildCommand: 'npm run build',
        testCommand: 'npm test',
      };
    } catch (error) {
      console.error('❌ Gemini implementation failed:', error);
      throw error;
    }
  }

  /**
   * Generate implementation plan using Gemini vision + reasoning
   */
  private async generateImplementationPlan(
    spec: DesignSpec,
    projectPath: string,
    recommendation: any
  ): Promise<GeminiPlan> {
    const prompt = `You are an expert frontend developer implementing UI/UX improvements.

PROJECT CONTEXT:
- Project path: ${projectPath}
- Current score: ${spec.currentScore}/10
- Target improvement: ${recommendation.title}

RECOMMENDATION:
${JSON.stringify(recommendation, null, 2)}

TASK:
Analyze this UI improvement recommendation and generate a precise implementation plan.
Focus on file changes (CSS, React components, HTML) rather than browser interactions.

Provide your response in JSON format:
{
  "reasoning": "Explain your implementation approach",
  "filesAffected": ["src/components/Example.tsx", "src/styles/main.css"],
  "steps": [
    {
      "type": "edit_file",
      "filePath": "src/components/Example.tsx",
      "description": "Update button styling",
      "changes": [
        {
          "action": "replace",
          "find": "className=\\"btn\\"",
          "replace": "className=\\"btn btn-primary\\"",
          "line": 42
        }
      ]
    }
  ]
}

IMPORTANT:
- Prefer surgical, minimal changes
- Use file edits over browser automation
- Target specific lines when possible
- Explain impact of each change
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON plan from Gemini response');
      }

      const planData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      console.log('📋 Implementation plan generated:', planData.filesAffected.length, 'files');

      return planData;
    } catch (error) {
      console.error('Failed to generate plan:', error);
      throw error;
    }
  }

  /**
   * Execute file changes from the plan
   */
  private async executeFileChanges(plan: GeminiPlan, projectPath: string): Promise<FileChange[]> {
    const changes: FileChange[] = [];

    for (const step of plan.steps) {
      if (step.type !== 'edit_file' || !step.filePath) continue;

      const fullPath = path.isAbsolute(step.filePath)
        ? step.filePath
        : path.join(projectPath, step.filePath);

      try {
        // Validate file is within project
        if (!this.isPathSafe(fullPath, projectPath)) {
          console.warn(`⚠️  Skipping file outside project: ${step.filePath}`);
          continue;
        }

        // Read existing content
        let oldContent = '';
        let exists = false;

        try {
          oldContent = await fs.readFile(fullPath, 'utf-8');
          exists = true;
        } catch (err) {
          // File doesn't exist - will create it
          exists = false;
        }

        // Apply changes (simplified for now - could use detailed change instructions)
        const newContent = step.content || oldContent;

        if (newContent !== oldContent) {
          // Create backup
          if (exists) {
            const backupPath = `${fullPath}.backup-${Date.now()}`;
            await fs.writeFile(backupPath, oldContent);
          }

          // Write new content
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, newContent);

          // Generate diff
          const diff = this.generateDiff(oldContent, newContent, step.filePath);

          changes.push({
            path: step.filePath,
            type: exists ? 'edit' : 'create',
            oldContent: exists ? oldContent : undefined,
            newContent,
            diff,
          });

          console.log(`✅ ${exists ? 'Modified' : 'Created'}: ${step.filePath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${step.filePath}:`, error);
      }
    }

    return changes;
  }

  /**
   * Validate file path is within project (security)
   */
  private isPathSafe(filePath: string, projectPath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedProject = path.resolve(projectPath);
    return resolvedPath.startsWith(resolvedProject);
  }

  /**
   * Generate simple diff between old and new content
   */
  private generateDiff(oldContent: string, newContent: string, filePath: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const diff: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`, ''];

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i]) diff.push(`- ${oldLines[i]}`);
        if (newLines[i]) diff.push(`+ ${newLines[i]}`);
      }
    }

    return diff.join('\n');
  }

  /**
   * Generate human-readable summary
   */
  private generateChangeSummary(changes: FileChange[], recommendation: any): string {
    const fileCount = changes.length;
    const creates = changes.filter(c => c.type === 'create').length;
    const edits = changes.filter(c => c.type === 'edit').length;

    return `Implemented "${recommendation.title}": ${edits} files edited, ${creates} files created (total: ${fileCount} changes)`;
  }
}

/**
 * Factory function for plugin instantiation
 */
export function createGeminiImplementationPlugin(apiKey?: string): VIZTRTRPlugin {
  return new GeminiImplementationPlugin(apiKey);
}
