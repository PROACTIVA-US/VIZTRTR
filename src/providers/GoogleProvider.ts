/**
 * Google Gemini Model Provider
 *
 * Supports Gemini 2.0, 1.5 Pro, 1.5 Flash with multimodal capabilities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelProvider, CompletionRequest, CompletionResponse } from './ModelProvider';
import type { Screenshot, DesignSpec, EvaluationResult, ModelConfig } from '../core/types';

export class GoogleProvider extends ModelProvider {
  private client: GoogleGenerativeAI;

  // Model pricing per 1M tokens (USD) - as of Jan 2025
  private static PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free during preview
    'gemini-1.5-pro': { input: 1.25, output: 5.0 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'gemini-1.0-pro': { input: 0.5, output: 1.5 }
  };

  constructor(config: ModelConfig, apiKey: string, baseUrl?: string) {
    super(config, apiKey, baseUrl);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = this.client.getGenerativeModel({
      model: this.config.model
    });

    // Build content parts
    const parts: any[] = [];

    // Add images if provided
    if (request.images && request.images.length > 0) {
      for (const image of request.images) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: image
          }
        });
      }
    }

    // Add text prompt (system + user combined for Gemini)
    const fullPrompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.userPrompt}`
      : request.userPrompt;

    parts.push({ text: fullPrompt });

    // Generate response
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: request.temperature ?? this.config.temperature ?? 1.0,
        maxOutputTokens: request.maxTokens || this.config.maxTokens || 4096
      }
    });

    const response = result.response;
    const content = response.text();

    // Extract usage (Gemini doesn't always provide detailed usage)
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0
    };

    return {
      content,
      thinking: undefined, // Gemini doesn't support extended thinking
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalCost: this.calculateCost(usage)
      },
      model: this.config.model,
      provider: 'google'
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
    // All Gemini models support multimodal
    return true;
  }

  supportsExtendedThinking(): boolean {
    // Gemini doesn't support extended thinking yet
    return false;
  }

  getCostPer1M(): { input: number; output: number } {
    return GoogleProvider.PRICING[this.config.model] || { input: 1.25, output: 5.0 };
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
