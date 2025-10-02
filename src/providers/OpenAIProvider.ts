/**
 * OpenAI Model Provider
 *
 * Supports GPT-4o, GPT-4 Turbo, GPT-3.5 with vision capabilities
 */

import OpenAI from 'openai';
import { ModelProvider, CompletionRequest, CompletionResponse } from './ModelProvider.js';
import type { Screenshot, DesignSpec, EvaluationResult, ModelConfig } from '../core/types.js';

export class OpenAIProvider extends ModelProvider {
  private client: OpenAI;

  // Model pricing per 1M tokens (USD)
  private static PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
  };

  constructor(config: ModelConfig, apiKey: string, baseUrl?: string) {
    super(config, apiKey, baseUrl);
    this.client = new OpenAI({
      apiKey,
      ...(baseUrl && { baseURL: baseUrl })
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system message
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    // Build user message with images
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

    // Add images if provided
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

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
      temperature: request.temperature ?? this.config.temperature ?? 1.0
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
      content,
      thinking: undefined, // OpenAI doesn't support extended thinking
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalCost: this.calculateCost({
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens
        })
      },
      model: response.model,
      provider: 'openai'
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
    // GPT-4o, GPT-4 Turbo, GPT-4 support vision
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'].includes(this.config.model);
  }

  supportsExtendedThinking(): boolean {
    // OpenAI doesn't support extended thinking yet
    return false;
  }

  getCostPer1M(): { input: number; output: number } {
    return OpenAIProvider.PRICING[this.config.model] || { input: 2.5, output: 10.0 };
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
