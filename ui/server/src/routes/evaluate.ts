/**
 * Prompt Evaluation API routes
 * Uses Claude to analyze user prompts and determine appropriate agents
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

// Request validation schema
const EvaluatePromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['prompt', 'prd']).default('prompt')
});

// Response types
export interface AgentTask {
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestedAgent {
  id: string;
  type: 'architect' | 'designer' | 'engineer' | 'tester' | 'viztritr';
  name: string;
  description: string;
  tasks: AgentTask[];
}

export interface PromptEvaluation {
  suggestedAgents: SuggestedAgent[];
  projectType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedDuration: string;
  keyFeatures: string[];
  technicalRequirements: string[];
}

// System prompt for Claude to analyze prompts
const EVALUATION_SYSTEM_PROMPT = `You are an expert project analyzer for VIZTRTR, an autonomous UI/UX improvement system. Your role is to analyze user prompts and determine the optimal agent configuration needed to complete the project.

## Available Agent Types:

1. **Architect Agent** (type: "architect")
   - Plans project structure and technical architecture
   - Defines component hierarchies and data flow
   - Creates technical specifications
   - Use for: Complex projects, new features, major refactors

2. **Designer Agent** (type: "designer")
   - Analyzes UI/UX quality and aesthetics
   - Creates design recommendations
   - Ensures visual consistency
   - Use for: All projects with visual components

3. **Engineer Agent** (type: "engineer")
   - Implements code changes
   - Applies design recommendations
   - Handles technical implementation
   - Use for: All projects requiring code changes

4. **Tester Agent** (type: "tester")
   - Validates functionality
   - Tests edge cases and accessibility
   - Ensures quality standards
   - Use for: Complex projects, critical features, refactors

5. **VIZTRTR Agent** (type: "viztritr")
   - Final quality evaluation
   - Scores UI across 8 dimensions
   - Iterates until quality threshold met
   - Use for: ALL projects (mandatory final step)

## Decision Guidelines:

**Simple Projects** (single component, minor UI changes):
- Designer → Engineer → VIZTRTR
- Duration: 2-3 iterations

**Moderate Projects** (new features, multiple components):
- Architect → Designer → Engineer → VIZTRTR
- Duration: 4-6 iterations

**Complex Projects** (major features, multiple systems, integrations):
- Architect → Designer → Engineer → Tester → VIZTRTR
- Duration: 7-10 iterations

## Response Format:

Return a JSON object with this exact structure:

{
  "suggestedAgents": [
    {
      "id": "architect-1",
      "type": "architect",
      "name": "System Architect",
      "description": "Plans the technical architecture and component structure",
      "tasks": [
        {
          "description": "Define component hierarchy",
          "priority": "high"
        }
      ]
    }
  ],
  "projectType": "Interactive Dashboard",
  "complexity": "moderate",
  "estimatedDuration": "4-6 iterations",
  "keyFeatures": ["Real-time data visualization", "User authentication"],
  "technicalRequirements": ["React", "D3.js", "WebSocket API"]
}

**IMPORTANT**:
- Always include the VIZTRTR agent as the final agent
- Agent IDs must be unique and follow pattern: {type}-{number}
- Complexity must be one of: "simple", "moderate", "complex"
- Each agent must have at least one task
- Task priorities must be: "high", "medium", or "low"
- Return ONLY valid JSON, no markdown or additional text`;

export function createEvaluateRouter(anthropicApiKey: string): Router {
  const router = Router();
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  router.post('/evaluate-prompt', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const data = EvaluatePromptSchema.parse(req.body);
      const { prompt, type } = data;

      console.log(`Evaluating ${type}: ${prompt.substring(0, 100)}...`);

      // Prepare user prompt based on type
      const userPrompt = type === 'prd'
        ? `Analyze this Product Requirements Document (PRD) and determine the agent configuration:\n\n${prompt}`
        : `Analyze this user prompt and determine the agent configuration:\n\n"${prompt}"`;

      // Call Claude API with Sonnet 4
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent structured output
        system: EVALUATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Extract text content from response
      const responseText = message.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n');

      console.log('Claude response:', responseText.substring(0, 200) + '...');

      // Parse JSON response
      let evaluation: PromptEvaluation;
      try {
        // Try to extract JSON from response (in case Claude adds markdown formatting)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        evaluation = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', responseText);
        return res.status(500).json({
          error: 'Failed to parse AI response',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
          rawResponse: responseText
        });
      }

      // Validate response structure
      if (!evaluation.suggestedAgents || !Array.isArray(evaluation.suggestedAgents)) {
        return res.status(500).json({
          error: 'Invalid response structure: missing suggestedAgents array'
        });
      }

      if (!evaluation.projectType || !evaluation.complexity || !evaluation.estimatedDuration) {
        return res.status(500).json({
          error: 'Invalid response structure: missing required fields'
        });
      }

      // Validate agent types
      const validAgentTypes = ['architect', 'designer', 'engineer', 'tester', 'viztritr'];
      const invalidAgents = evaluation.suggestedAgents.filter(
        agent => !validAgentTypes.includes(agent.type)
      );
      if (invalidAgents.length > 0) {
        return res.status(500).json({
          error: 'Invalid agent types in response',
          invalidAgents: invalidAgents.map(a => a.type)
        });
      }

      // Validate complexity
      const validComplexities = ['simple', 'moderate', 'complex'];
      if (!validComplexities.includes(evaluation.complexity)) {
        return res.status(500).json({
          error: 'Invalid complexity value',
          received: evaluation.complexity,
          expected: validComplexities
        });
      }

      // Ensure VIZTRTR agent is present
      const hasViztritr = evaluation.suggestedAgents.some(agent => agent.type === 'viztritr');
      if (!hasViztritr) {
        console.warn('VIZTRTR agent missing, adding it automatically');
        evaluation.suggestedAgents.push({
          id: 'viztritr-1',
          type: 'viztritr',
          name: 'VIZTRTR Quality Evaluator',
          description: 'Evaluates UI quality and iterates until target score is reached',
          tasks: [
            {
              description: 'Evaluate UI across 8 quality dimensions',
              priority: 'high'
            },
            {
              description: 'Iterate improvements until 8.5+ score achieved',
              priority: 'high'
            }
          ]
        });
      }

      // Log successful evaluation
      console.log(`✓ Evaluation complete: ${evaluation.projectType} (${evaluation.complexity})`);
      console.log(`  Agents: ${evaluation.suggestedAgents.map(a => a.type).join(', ')}`);
      console.log(`  Duration: ${evaluation.estimatedDuration}`);

      // Return evaluation
      res.json(evaluation);

    } catch (error) {
      console.error('Evaluation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request',
          details: error.errors
        });
      }

      if (error instanceof Anthropic.APIError) {
        return res.status(500).json({
          error: 'Anthropic API error',
          details: error.message,
          status: error.status
        });
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to evaluate prompt'
      });
    }
  });

  return router;
}
