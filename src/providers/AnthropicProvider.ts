/**
 * Anthropic Model Provider
 *
 * Supports Claude Opus 4, Sonnet 4/4.5, Haiku 4 with vision and extended thinking
 */

import Anthropic from '@anthropic-ai/sdk';
import { ModelProvider, CompletionRequest, CompletionResponse } from './ModelProvider';
import type { Screenshot, DesignSpec, EvaluationResult, ModelConfig } from '../core/types';

export class AnthropicProvider extends ModelProvider {
  private client: Anthropic;

  // Model pricing per 1M tokens (USD)
  private static PRICING: Record<string, { input: number; output: number; thinking?: number }> = {
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-sonnet-4.5-20250402': { input: 3.0, output: 15.0, thinking: 3.0 },
    'claude-haiku-4-20250402': { input: 0.8, output: 4.0 },
  };

  constructor(config: ModelConfig, apiKey: string, baseUrl?: string) {
    super(config, apiKey, baseUrl);
    this.client = new Anthropic({
      apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messageContent: Anthropic.ContentBlockParam[] = [];

    // Add images if provided
    if (request.images && request.images.length > 0) {
      for (const image of request.images) {
        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: image,
          },
        } as Anthropic.ImageBlockParam);
      }
    }

    // Add text prompt
    messageContent.push({
      type: 'text',
      text: request.userPrompt,
    } as Anthropic.TextBlockParam);

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: messageContent,
      },
    ];

    // Build request parameters
    const params: Anthropic.MessageCreateParams = {
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
      temperature: request.temperature ?? this.config.temperature ?? 1.0,
      system: request.systemPrompt,
      messages,
    };

    // Add extended thinking if supported and requested
    if (this.supportsExtendedThinking() && request.thinkingBudget) {
      (params as any).thinking = {
        type: 'enabled',
        budget_tokens: request.thinkingBudget,
      };
    }

    const response = await this.client.messages.create(params);

    // Extract content and thinking
    let responseContent = '';
    let thinking = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        responseContent += block.text;
      } else if (block.type === 'thinking') {
        thinking += (block as any).thinking || '';
      }
    }

    return {
      content: responseContent,
      thinking: thinking || undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        thinkingTokens: (response.usage as any).thinking_tokens,
        totalCost: this.calculateCost({
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          thinkingTokens: (response.usage as any).thinking_tokens,
        }),
      },
      model: response.model,
      provider: 'anthropic',
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
      images: [screenshot.data],
    });

    return this.parseDesignSpec(response.content);
  }

  async implementChanges(spec: DesignSpec, projectPath: string): Promise<any> {
    // Implementation will be handled by the implementation plugin
    throw new Error('Not implemented - use implementation plugin');
  }

  async evaluateDesign(screenshot: Screenshot): Promise<EvaluationResult> {
    const prompt = this.buildEvaluationPrompt();

    const response = await this.complete({
      systemPrompt: 'You are an expert UI/UX evaluator.',
      userPrompt: prompt,
      images: [screenshot.data],
    });

    return this.parseEvaluation(response.content);
  }

  supportsVision(): boolean {
    // All Claude 4 models support vision
    return true;
  }

  supportsExtendedThinking(): boolean {
    // Only Sonnet 4.5 supports extended thinking
    return this.config.model === 'claude-sonnet-4.5-20250402';
  }

  getCostPer1M(): { input: number; output: number; thinking?: number } {
    return AnthropicProvider.PRICING[this.config.model] || { input: 3.0, output: 15.0 };
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
      // Extract JSON from response (may be wrapped in markdown)
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
        estimatedNewScore: parsed.estimatedNewScore || 0,
      };
    } catch (error) {
      console.error('Failed to parse design spec:', error);
      // Return fallback
      return {
        iteration: 0,
        timestamp: new Date(),
        currentScore: 5.0,
        currentIssues: [],
        recommendations: [],
        prioritizedChanges: [],
        estimatedNewScore: 5.0,
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
        priorityImprovements: [],
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
          overall_aesthetic: 5,
        },
        dimensions: {},
        strengths: [],
        weaknesses: [],
        summary: 'Failed to evaluate',
        priorityImprovements: [],
      };
    }
  }
}
