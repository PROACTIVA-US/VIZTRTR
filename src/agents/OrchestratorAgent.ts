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
import { ControlPanelAgent } from './specialized/ControlPanelAgent';
import { TeleprompterAgent } from './specialized/TeleprompterAgent';

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

  private controlPanelAgent: ControlPanelAgent;
  private teleprompterAgent: TeleprompterAgent;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.controlPanelAgent = new ControlPanelAgent(apiKey);
    this.teleprompterAgent = new TeleprompterAgent(apiKey);
  }

  /**
   * Orchestrate implementation across specialized agents
   */
  async implementChanges(spec: DesignSpec, projectPath: string): Promise<Changes> {
    console.log('   🎯 OrchestratorAgent analyzing recommendations...');

    // Step 1: Create routing plan using extended thinking
    const routingPlan = await this.createRoutingPlan(spec);

    console.log(`   📋 Routing Plan:`);
    console.log(`      Strategy: ${routingPlan.strategy}`);
    routingPlan.decisions.forEach((decision) => {
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
        tasks.push(this.controlPanelAgent.implement(decision.recommendations, projectPath));
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
      const thinkingBlocks = response.content.filter((block) => block.type === 'thinking');
      if (thinkingBlocks.length > 0) {
        console.log('   💭 Orchestrator is thinking strategically...');
      }

      // Extract text content
      const textBlocks = response.content.filter((block) => block.type === 'text');
      const fullText = textBlocks.map((block) => (block as any).text).join('\n');

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
    return `You are the ORCHESTRATOR AGENT for VIZTRTR's multi-agent UI improvement system.

**YOUR ROLE:**
Analyze design recommendations and route them to the appropriate specialist agent.

**AVAILABLE SPECIALIST AGENTS:**

1. **ControlPanelAgent**
   - Manages: All standard web UI components
   - Files: Header.tsx, PromptInput.tsx, Footer.tsx, AgentCard.tsx, AgentOrchestration.tsx
   - Expertise: Modern web UI (buttons, forms, layouts, navigation)
   - Design: Standard web sizing (32-48px buttons, 0.875-1.125rem text)
   - Viewing Distance: 1-2 feet (normal desktop/laptop use)

2. **TeleprompterAgent**
   - Manages: Stage performance teleprompter views (if present)
   - Files: None in this project
   - Expertise: Large-scale performance UI
   - Design: Extra-large text (3-4.5rem), very high contrast
   - Viewing Distance: 3-10 feet (stage use)
   - **NOTE:** This project appears to be a web builder UI, not a teleprompter app

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
1. This appears to be a web builder UI - most changes should go to ControlPanelAgent
2. Which recommendations can be implemented vs should be skipped?
3. What's the priority order?

Return a routing plan as JSON:

\`\`\`json
{
  "decisions": [
    {
      "agent": "ControlPanelAgent",
      "recommendations": [
        /* Include recommendations that improve the web UI */
      ],
      "reasoning": "Why these belong to this agent",
      "priority": "high"
    }
  ],
  "strategy": "Overall strategy explanation",
  "expectedImpact": "What improvements we expect"
}
\`\`\`

**IMPORTANT:**
- Most recommendations should go to ControlPanelAgent for this project
- Skip recommendations that require new files or major refactoring
- Focus on actionable improvements to existing components
- TeleprompterAgent will likely have no work (wrong project type)

Think carefully about which changes are feasible, then provide your routing plan.`;
  }

  /**
   * Fallback routing plan if AI routing fails
   */
  private createFallbackRoutingPlan(spec: DesignSpec): RoutingPlan {
    const controlPanelRecs: Recommendation[] = [];
    const teleprompterRecs: Recommendation[] = [];

    for (const rec of spec.prioritizedChanges) {
      if (this.controlPanelAgent.isRelevant(rec)) {
        controlPanelRecs.push(rec);
      } else if (this.teleprompterAgent.isRelevant(rec)) {
        teleprompterRecs.push(rec);
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
