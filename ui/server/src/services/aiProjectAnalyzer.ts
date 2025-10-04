/**
 * AI-Powered Project Analysis
 * Uses Claude to deeply understand project structure, purpose, and components
 */
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import type { ProjectAnalysis } from '../types';

export class AIProjectAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Validate project path is safe and accessible
   */
  private validateProjectPath(projectPath: string): void {
    // Resolve to absolute path
    const absolutePath = path.resolve(projectPath);

    // Check for directory traversal attempts
    if (absolutePath.includes('..')) {
      throw new Error('Invalid project path: directory traversal not allowed');
    }

    // Check path exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Project path does not exist: ${absolutePath}`);
    }

    // Check it's a directory
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      throw new Error(`Project path is not a directory: ${absolutePath}`);
    }

    // Prevent access to sensitive directories
    const sensitivePatterns = ['/etc', '/System', '/usr/bin', '/bin', '/.ssh', '/private'];
    for (const pattern of sensitivePatterns) {
      if (absolutePath.startsWith(pattern)) {
        throw new Error(`Access to sensitive directory not allowed: ${absolutePath}`);
      }
    }
  }

  /**
   * Analyze project with AI understanding
   */
  async analyzeProject(
    projectPath: string,
    userProvidedPRD?: string
  ): Promise<ProjectAnalysis> {
    console.log(`🧠 AI analyzing project: ${projectPath}`);

    // Validate path security
    this.validateProjectPath(projectPath);

    // Gather project information
    const projectInfo = await this.gatherProjectInfo(projectPath);

    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(projectInfo, userProvidedPRD);

    try {
      // Use Claude to analyze
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent analysis
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      // Parse JSON response
      const analysis = this.parseAnalysisResponse(textContent);

      console.log(`✅ Analysis complete: ${analysis.projectType}`);
      console.log(`   Detected ${analysis.components.length} components`);
      console.log(`   Suggested agents: ${analysis.suggestedAgents.join(', ')}`);

      return analysis;
    } catch (error) {
      console.error('❌ AI analysis failed, using fallback:', error);
      return this.fallbackAnalysis(projectInfo);
    }
  }

  /**
   * Gather project information for analysis
   */
  private async gatherProjectInfo(projectPath: string): Promise<{
    components: string[];
    packageJson: any;
    dependencies: string[];
    readme?: string;
    structure: string;
  }> {
    const components = this.findComponents(projectPath);
    const packageJson = this.readPackageJson(projectPath);
    const dependencies = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    });
    const readme = this.readReadme(projectPath);
    const structure = this.getProjectStructure(projectPath);

    return {
      components,
      packageJson,
      dependencies,
      readme,
      structure,
    };
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(
    projectInfo: {
      components: string[];
      dependencies: string[];
      readme?: string;
      structure: string;
    },
    userProvidedPRD?: string
  ): string {
    return `You are an expert at analyzing web application projects. Analyze this project and provide a comprehensive understanding.

**PROJECT STRUCTURE:**
${projectInfo.structure}

**COMPONENTS FOUND:**
${projectInfo.components.join(', ')}

**DEPENDENCIES:**
${projectInfo.dependencies.slice(0, 20).join(', ')}${projectInfo.dependencies.length > 20 ? ` (+${projectInfo.dependencies.length - 20} more)` : ''}

${userProvidedPRD ? `**USER-PROVIDED PRD:**\n${userProvidedPRD}\n` : ''}

${projectInfo.readme ? `**README:**\n${projectInfo.readme.slice(0, 2000)}\n` : ''}

**YOUR TASK:**
1. Determine the **true purpose** of this project (not just one component type)
2. Analyze each component and categorize it by UI context
3. Write a synthesized PRD that captures the project's vision
4. Recommend which VIZTRTR specialist agents should work on this project

**AVAILABLE AGENT TYPES:**
- TeleprompterAgent: Large-scale performance UI (stage views, lyrics, chords)
- ControlPanelAgent: Standard web UI (settings, forms, navigation, buttons)
- LibraryAgent: Content management and browsing
- PlayerAgent: Media playback controls

**RESPOND IN THIS JSON FORMAT:**
\`\`\`json
{
  "projectType": "Short descriptive name (e.g., 'Music Performance Platform')",
  "components": [
    {
      "name": "ComponentName",
      "purpose": "What this component does",
      "uiContext": "teleprompter|control-panel|library|player|general"
    }
  ],
  "suggestedAgents": ["TeleprompterAgent", "ControlPanelAgent"],
  "synthesizedPRD": "A comprehensive 2-3 paragraph PRD that captures:\n- Project purpose and target users\n- Key features and functionality\n- Design priorities and constraints\n- Technical stack and architecture\n\nThis PRD should be detailed enough to guide UI improvements.",
  "confidence": 0.95,
  "analysisMethod": "full"
}
\`\`\`

Be thorough and accurate. The synthesized PRD will be saved and used to guide all future UI improvements.`;
  }

  /**
   * Parse AI response
   */
  private parseAnalysisResponse(text: string): ProjectAnalysis {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonText);
  }

  /**
   * Fallback analysis if AI fails
   */
  private fallbackAnalysis(projectInfo: any): ProjectAnalysis {
    const components = projectInfo.components.map((name: string) => ({
      name,
      purpose: 'Component purpose unknown',
      uiContext: 'general' as const,
    }));

    return {
      projectType: 'Web Application',
      components,
      suggestedAgents: ['ControlPanelAgent'],
      synthesizedPRD: `This project contains ${components.length} components. No detailed PRD available. Manual configuration recommended.`,
      confidence: 0.3,
      analysisMethod: 'fallback',
    };
  }

  /**
   * Find all component files
   */
  private findComponents(projectPath: string): string[] {
    const components: string[] = [];
    const searchPaths = [
      path.join(projectPath, 'components'),
      path.join(projectPath, 'src/components'),
      path.join(projectPath, 'src'),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        this.scanDirectory(searchPath, components);
      }
    }

    return components.map((c) => path.basename(c, path.extname(c)));
  }

  /**
   * Recursively scan directory for components
   */
  private scanDirectory(
    dir: string,
    components: string[],
    depth: number = 0,
    maxDepth: number = 5
  ): void {
    if (depth > maxDepth) {
      return; // Prevent excessive recursion on large projects
    }

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          this.scanDirectory(fullPath, components, depth + 1, maxDepth);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          components.push(file);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Get project structure summary
   */
  private getProjectStructure(projectPath: string): string {
    const structure: string[] = [];

    try {
      const items = fs.readdirSync(projectPath);

      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;

        const fullPath = path.join(projectPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const subItems = fs.readdirSync(fullPath).length;
          structure.push(`${item}/ (${subItems} items)`);
        } else {
          structure.push(item);
        }
      }
    } catch (e) {
      return 'Unable to read project structure';
    }

    return structure.join('\n');
  }

  /**
   * Read package.json
   */
  private readPackageJson(projectPath: string): any {
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      }
    } catch (e) {
      // Ignore
    }
    return {};
  }

  /**
   * Read README
   */
  private readReadme(projectPath: string): string | undefined {
    const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'PRD.md'];

    for (const filename of readmeFiles) {
      try {
        const filePath = path.join(projectPath, filename);
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf-8').slice(0, 3000); // First 3000 chars
        }
      } catch (e) {
        // Continue
      }
    }

    return undefined;
  }
}
