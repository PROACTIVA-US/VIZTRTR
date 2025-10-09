/**
 * OrchestratorAgent - Strategic Coordinator for Multi-Agent System
 *
 * Uses Claude Opus with extended thinking to:
 * 1. Analyze design recommendations
 * 2. Determine which UI context each belongs to
 * 3. Route to appropriate specialist agents
 * 4. Coordinate parallel execution
 */

import Anthropic from '@anthropic-ai/sdk';
import { DesignSpec, Recommendation, Changes, FileChange } from '../core/types';
import { ControlPanelAgentV2 } from './specialized/ControlPanelAgentV2'; // V2: PRODUCTION READY ✅
import { DiscoveryAgent } from './specialized/DiscoveryAgent'; // Two-Phase Workflow ✅
import { UIConsistencyAgent } from './specialized/UIConsistencyAgent'; // Design System Validation ✅
// import { ControlPanelAgent } from './specialized/ControlPanelAgent'; // V1: DEPRECATED ❌
import { TeleprompterAgent } from './specialized/TeleprompterAgent';
import {
  discoverComponentFiles,
  summarizeDiscovery,
  DiscoveredFile,
} from '../utils/file-discovery';

interface RoutingDecision {
  agent: 'ControlPanelAgent' | 'TeleprompterAgent' | 'skip';
  recommendations: Recommendation[];
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface RoutingPlan {
  decisions: RoutingDecision[];
  strategy: string;
  expectedImpact: string;
}

export class OrchestratorAgent {
  private client: Anthropic;
  private model = 'claude-opus-4-20250514';

  private apiKey: string;
  private teleprompterAgent: TeleprompterAgent;
  private discoveryAgent: DiscoveryAgent;
  private uiConsistencyAgent: UIConsistencyAgent | null = null;
  private discoveredFiles: DiscoveredFile[] = [];
  private fileCache = new Map<string, DiscoveredFile[]>();

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.apiKey = apiKey;
    // Two-Phase Workflow: DiscoveryAgent + ControlPanelAgentV2
    this.discoveryAgent = new DiscoveryAgent(apiKey);
    // Note: ControlPanelAgentV2 is instantiated per-request with projectPath
    // Note: UIConsistencyAgent is instantiated per-request with projectPath
    this.teleprompterAgent = new TeleprompterAgent(apiKey);
  }

  /**
   * Orchestrate implementation across specialized agents
   */
  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('   🎯 OrchestratorAgent analyzing recommendations...');

    // Step 1: Discover files in the project (with caching)
    try {
      if (this.fileCache.has(projectPath)) {
        this.discoveredFiles = this.fileCache.get(projectPath)!;
        console.log(`   📦 Using cached discovery: ${this.discoveredFiles.length} component files`);
      } else {
        this.discoveredFiles = await discoverComponentFiles(projectPath, {
          maxFileSize: 50 * 1024,
          includeContent: false,
        });
        this.fileCache.set(projectPath, this.discoveredFiles);
        console.log(`   🔍 Discovered ${this.discoveredFiles.length} component files in project`);
      }

      if (this.discoveredFiles.length === 0) {
        console.warn('   ⚠️  No component files discovered in project');
        return {
          files: [],
          summary: 'No component files found in project for modification',
          buildCommand: 'npm run build',
          testCommand: 'npm test',
        };
      }
    } catch (error) {
      console.error('   ❌ File discovery failed:', error);
      throw new Error(
        `Failed to discover project files: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Step 2: Create routing plan using extended thinking
    const routingPlan = await this.createRoutingPlan(spec);

    console.log(`   📋 Routing Plan:`);
    console.log(`      Strategy: ${routingPlan.strategy}`);
    routingPlan.decisions.forEach(decision => {
      if (decision.agent !== 'skip') {
        console.log(
          `      → ${decision.agent}: ${decision.recommendations.length} items (${decision.priority} priority)`
        );
      }
    });

    // Step 2: Execute specialists in parallel
    const allChanges: FileChange[] = [];

    const tasks: Promise<FileChange[]>[] = [];

    for (const decision of routingPlan.decisions) {
      if (decision.agent === 'ControlPanelAgent' && decision.recommendations.length > 0) {
        // Two-Phase Workflow: Discovery → Execution
        tasks.push(this.executeTwoPhaseWorkflow(decision.recommendations, projectPath));
      } else if (decision.agent === 'TeleprompterAgent' && decision.recommendations.length > 0) {
        tasks.push(this.teleprompterAgent.implement(decision.recommendations, projectPath));
      }
    }

    // Execute all specialist agents in parallel
    console.log(`   ⚡ Executing ${tasks.length} specialist agents in parallel...`);
    const results = await Promise.all(tasks);

    // Combine results
    for (const changes of results) {
      allChanges.push(...changes);
    }

    return {
      files: allChanges,
      summary: `Orchestrated ${allChanges.length} file changes across ${tasks.length} specialist agents`,
      buildCommand: 'npm run build',
      testCommand: 'npm test',
    };
  }

  /**
   * Execute two-phase workflow for Control Panel recommendations
   * Phase 1: DiscoveryAgent creates precise change plans
   * Phase 2: ControlPanelAgentV2 executes plans with constrained tools
   */
  private async executeTwoPhaseWorkflow(
    recommendations: Recommendation[],
    projectPath: string
  ): Promise<FileChange[]> {
    console.log(`\n   🔄 Enhanced Two-Phase Workflow: ${recommendations.length} recommendations`);
    console.log(`      Phase 0: UI Consistency Validation (design system checks)`);
    console.log(`      Phase 1: Discovery (analyzing files, creating change plans)`);
    console.log(`      Phase 2: Execution (applying changes with constrained tools)`);

    const changes: FileChange[] = [];
    const controlPanelAgentV2 = new ControlPanelAgentV2(this.apiKey, projectPath);

    // Initialize UIConsistencyAgent for this project
    if (!this.uiConsistencyAgent) {
      this.uiConsistencyAgent = new UIConsistencyAgent(this.apiKey, projectPath);
    }

    for (const rec of recommendations) {
      try {
        // Phase 1: Discovery - Create change plan
        console.log(`\n   📍 Phase 1: DiscoveryAgent analyzing "${rec.title}"...`);
        const changePlan = await this.discoveryAgent.createChangePlan(rec, projectPath);

        if (!changePlan || changePlan.changes.length === 0) {
          console.warn(`   ⚠️  No change plan created for: ${rec.title}`);
          continue;
        }

        console.log(`   ✅ Change plan created with ${changePlan.changes.length} changes`);

        // Phase 1.5: UI Consistency Validation - Validate changes before execution
        console.log(`   🎨 Phase 1.5: UIConsistencyAgent validating design system compliance...`);
        const changesToValidate = changePlan.changes.map(change => {
          let oldClassName = '';
          let newClassName = '';

          // Extract className values based on tool type
          if (change.tool === 'updateClassName' && 'oldClassName' in change.params && 'newClassName' in change.params) {
            oldClassName = change.params.oldClassName;
            newClassName = change.params.newClassName;
          } else if (change.tool === 'appendToClassName' && 'classesToAdd' in change.params) {
            // For append, validate the new classes being added
            oldClassName = '';
            newClassName = change.params.classesToAdd.join(' ');
          }

          return {
            file: change.filePath,
            lineNumber: change.lineNumber,
            oldClassName,
            newClassName,
            changeType: change.tool === 'updateClassName' || change.tool === 'appendToClassName'
              ? 'className' as const
              : change.tool === 'updateStyleValue'
              ? 'styleValue' as const
              : 'textContent' as const,
          };
        });

        const validation = await this.uiConsistencyAgent.validateChanges(changesToValidate);

        if (!validation.isValid) {
          console.error(`   ❌ Design system validation failed: ${validation.summary}`);
          console.error(`   Violations:`);
          validation.violations.forEach(v => {
            console.error(`      - ${v.type} (${v.severity}): ${v.reason}`);
            if (v.suggestion) {
              console.error(`        Suggestion: ${v.suggestion}`);
            }
          });
          console.warn(`   ⏭️  Skipping "${rec.title}" due to design system violations`);
          continue;
        }

        console.log(`   ✅ Design system validation passed: ${validation.summary}`);
        if (validation.suggestions.length > 0) {
          console.log(`   💡 Suggestions:`);
          validation.suggestions.forEach(s => console.log(`      - ${s}`));
        }

        // Phase 2: Execution - Execute change plan
        console.log(`   📍 Phase 2: ControlPanelAgentV2 executing change plan...`);
        const fileChange = await controlPanelAgentV2.executeChangePlan(changePlan, projectPath);

        if (fileChange) {
          changes.push(fileChange);
          console.log(`   ✅ Changes applied successfully`);
        } else {
          console.warn(`   ⚠️  Change plan execution failed`);
        }
      } catch (error) {
        console.error(`   ❌ Two-phase workflow error for "${rec.title}":`, error);
      }
    }

    console.log(
      `\n   🎯 Enhanced Workflow Complete: ${changes.length}/${recommendations.length} recommendations implemented`
    );
    return changes;
  }

  /**
   * Create routing plan using extended thinking
   */
  private async createRoutingPlan(spec: DesignSpec): Promise<RoutingPlan> {
    const prompt = this.buildRoutingPrompt(spec);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
          budget_tokens: 2000, // Extended thinking for strategic planning
        },
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract thinking blocks
      const thinkingBlocks = response.content.filter(block => block.type === 'thinking');
      if (thinkingBlocks.length > 0) {
        console.log('   💭 Orchestrator is thinking strategically...');
      }

      // Extract text content
      const textBlocks = response.content.filter(block => block.type === 'text');
      const fullText = textBlocks.map(block => (block as any).text).join('\n');

      // Parse JSON
      const jsonMatch =
        fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      // Fallback to simple routing
      return this.createFallbackRoutingPlan(spec);
    } catch (error) {
      console.error('   ❌ Routing plan failed, using fallback:', error);
      return this.createFallbackRoutingPlan(spec);
    }
  }

  private buildRoutingPrompt(spec: DesignSpec): string {
    // Group files by directory for better readability
    const filesByDir = new Map<string, string[]>();
    this.discoveredFiles.forEach(file => {
      const dir = file.path.substring(0, file.path.lastIndexOf('/')) || 'root';
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, []);
      }
      filesByDir.get(dir)!.push(file.name);
    });

    const fileList = Array.from(filesByDir.entries())
      .map(
        ([dir, files]) =>
          `   ${dir}/: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (+ ${files.length - 5} more)` : ''}`
      )
      .join('\n');

    return `You are the ORCHESTRATOR AGENT for VIZTRTR's multi-agent UI improvement system.

**YOUR ROLE:**
Analyze design recommendations and route them to the appropriate specialist agent.

**DISCOVERED PROJECT FILES (${this.discoveredFiles.length} components):**
${fileList}

**AVAILABLE SPECIALIST AGENTS:**

1. **ControlPanelAgent**
   - Manages: All web UI components discovered above
   - Expertise: Modern web UI (buttons, forms, layouts, navigation)
   - Will dynamically discover and modify relevant files in the project

2. **TeleprompterAgent**
   - Manages: Stage performance teleprompter views (if present)
   - Expertise: Large-scale performance UI with extra-large text
   - Will dynamically discover and modify relevant files in the project

**CURRENT DESIGN SPEC:**
- UI Context Detected: ${spec.detectedContext || 'Modern web application builder UI'}
- Current Score: ${spec.currentScore}/10
- Issues Found: ${spec.currentIssues.length}

**RECOMMENDATIONS TO ROUTE:**
${spec.prioritizedChanges
  .map(
    (rec, idx) => `
${idx + 1}. **${rec.title}** (${rec.dimension})
   Description: ${rec.description}
   Impact: ${rec.impact}/10
   Effort: ${rec.effort}/10
`
  )
  .join('')}

**YOUR TASK:**
Think strategically about:
1. Analyze the DISCOVERED PROJECT FILES above to understand the project type
2. Route recommendations to the agent best suited for the discovered files
3. Which recommendations can be implemented vs should be skipped?
4. What's the priority order?

Return a routing plan as JSON:

\`\`\`json
{
  "decisions": [
    {
      "agent": "ControlPanelAgent" | "TeleprompterAgent",
      "recommendations": [
        /* Include recommendations that match this agent's expertise */
      ],
      "reasoning": "Why these belong to this agent based on discovered files",
      "priority": "high"
    }
  ],
  "strategy": "Overall strategy explanation based on discovered files",
  "expectedImpact": "What improvements we expect"
}
\`\`\`

**IMPORTANT:**
- Route based on the ACTUAL files discovered, not assumptions
- Skip recommendations that require new files or major refactoring
- Focus on actionable improvements to existing components
- Both agents will dynamically find and modify the right files

Think carefully about which changes are feasible, then provide your routing plan.`;
  }

  /**
   * Fallback routing plan if AI routing fails
   */
  private createFallbackRoutingPlan(spec: DesignSpec): RoutingPlan {
    const controlPanelRecs: Recommendation[] = [];
    const teleprompterRecs: Recommendation[] = [];

    for (const rec of spec.prioritizedChanges) {
      // V2: All web UI recommendations go to ControlPanelAgentV2
      if (this.teleprompterAgent.isRelevant(rec)) {
        teleprompterRecs.push(rec);
      } else {
        // Default to ControlPanelAgentV2 for general UI improvements
        controlPanelRecs.push(rec);
      }
    }

    return {
      decisions: [
        {
          agent: 'TeleprompterAgent',
          recommendations: teleprompterRecs,
          reasoning: 'Keyword-based routing (fallback)',
          priority: 'high',
        },
        {
          agent: 'ControlPanelAgent',
          recommendations: controlPanelRecs,
          reasoning: 'Keyword-based routing (fallback)',
          priority: 'medium',
        },
      ],
      strategy: 'Fallback keyword-based routing',
      expectedImpact: 'Basic improvements based on keyword matching',
    };
  }
}
