/**
 * Z.AI Model Provider
 *
 * Supports Z.AI API-compatible models
 */

import { ModelProvider, CompletionRequest, CompletionResponse } from './ModelProvider.js';
import type { Screenshot, DesignSpec, EvaluationResult, ModelConfig } from '../core/types.js';

export class ZAIProvider extends ModelProvider {
  // Z.AI pricing (to be updated with actual pricing)
  private static PRICING: Record<string, { input: number; output: number }> = {
    'zai-default': { input: 1.0, output: 3.0 }
  };

  constructor(config: ModelConfig, apiKey: string, baseUrl?: string) {
    super(config, apiKey, baseUrl || 'https://api.z.ai/v1'); // Update with actual Z.AI endpoint
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Build request body
    const messages: any[] = [];

    // Add system message
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    // Build user message with images
    const userContent: any[] = [];

    // Add images if provided (assuming OpenAI-compatible format)
    if (request.images && request.images.length > 0) {
      for (const image of request.images) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${image}`
          }
        });
      }
    }

    // Add text prompt
    userContent.push({
      type: 'text',
      text: request.userPrompt
    });

    messages.push({
      role: 'user',
      content: userContent
    });

    // Make API request
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: request.maxTokens || this.config.maxTokens || 4096,
        temperature: request.temperature ?? this.config.temperature ?? 1.0
      })
    });

    if (!response.ok) {
      throw new Error(`Z.AI API error: ${response.statusText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
      content,
      thinking: undefined,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalCost: this.calculateCost({
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens
        })
      },
      model: data.model || this.config.model,
      provider: 'zai'
    };
  }

  async analyzeScreenshot(
    screenshot: Screenshot,
    memoryContext?: string,
    projectContext?: any
  ): Promise<DesignSpec> {
    const prompt = this.buildVisionPrompt(memoryContext, projectContext);

    const response = await this.complete({
      systemPrompt: 'You are an expert UI/UX designer and analyst.',
      userPrompt: prompt,
      images: [screenshot.data]
    });

    return this.parseDesignSpec(response.content);
  }

  async implementChanges(spec: DesignSpec, projectPath: string): Promise<any> {
    throw new Error('Not implemented - use implementation plugin');
  }

  async evaluateDesign(screenshot: Screenshot): Promise<EvaluationResult> {
    const prompt = this.buildEvaluationPrompt();

    const response = await this.complete({
      systemPrompt: 'You are an expert UI/UX evaluator.',
      userPrompt: prompt,
      images: [screenshot.data]
    });

    return this.parseEvaluation(response.content);
  }

  supportsVision(): boolean {
    // Assume Z.AI supports vision (to be confirmed with actual API docs)
    return true;
  }

  supportsExtendedThinking(): boolean {
    // Z.AI doesn't support extended thinking yet
    return false;
  }

  getCostPer1M(): { input: number; output: number } {
    return ZAIProvider.PRICING[this.config.model] || { input: 1.0, output: 3.0 };
  }

  // Helper methods

  private buildVisionPrompt(memoryContext?: string, projectContext?: any): string {
    let prompt = `Analyze this UI screenshot and provide a detailed design assessment.

Return a JSON object with the following structure:
{
  "currentScore": number (0-10),
  "currentIssues": [
    {
      "dimension": string,
      "severity": "critical" | "important" | "minor",
      "description": string,
      "location": string
    }
  ],
  "recommendations": [
    {
      "dimension": string,
      "title": string,
      "description": string,
      "impact": number (1-10),
      "effort": number (1-10)
    }
  ],
  "estimatedNewScore": number (0-10)
}`;

    if (memoryContext) {
      prompt += `\n\nPREVIOUS ITERATION MEMORY:\n${memoryContext}\n\nAvoid repeating failed recommendations.`;
    }

    if (projectContext) {
      prompt += `\n\nPROJECT CONTEXT:\n${JSON.stringify(projectContext, null, 2)}`;
    }

    return prompt;
  }

  private buildEvaluationPrompt(): string {
    return `Evaluate this UI design across 8 dimensions and provide detailed scores.

Return a JSON object with:
{
  "compositeScore": number (0-10),
  "scores": {
    "visual_hierarchy": number,
    "typography": number,
    "color_contrast": number,
    "spacing_layout": number,
    "component_design": number,
    "animation_interaction": number,
    "accessibility": number,
    "overall_aesthetic": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "summary": string
}`;
  }

  private parseDesignSpec(content: string): DesignSpec {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        iteration: 0,
        timestamp: new Date(),
        currentScore: parsed.currentScore || 0,
        currentIssues: parsed.currentIssues || [],
        recommendations: parsed.recommendations || [],
        prioritizedChanges: parsed.recommendations || [],
        estimatedNewScore: parsed.estimatedNewScore || 0
      };
    } catch (error) {
      console.error('Failed to parse design spec:', error);
      return {
        iteration: 0,
        timestamp: new Date(),
        currentScore: 5.0,
        currentIssues: [],
        recommendations: [],
        prioritizedChanges: [],
        estimatedNewScore: 5.0
      };
    }
  }

  private parseEvaluation(content: string): EvaluationResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        compositeScore: parsed.compositeScore || 0,
        targetScore: 8.5,
        targetReached: (parsed.compositeScore || 0) >= 8.5,
        scores: parsed.scores || {},
        dimensions: {},
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        summary: parsed.summary || '',
        priorityImprovements: []
      };
    } catch (error) {
      console.error('Failed to parse evaluation:', error);
      return {
        compositeScore: 5.0,
        targetScore: 8.5,
        targetReached: false,
        scores: {
          visual_hierarchy: 5,
          typography: 5,
          color_contrast: 5,
          spacing_layout: 5,
          component_design: 5,
          animation_interaction: 5,
          accessibility: 5,
          overall_aesthetic: 5
        },
        dimensions: {},
        strengths: [],
        weaknesses: [],
        summary: 'Failed to evaluate',
        priorityImprovements: []
      };
    }
  }
}
