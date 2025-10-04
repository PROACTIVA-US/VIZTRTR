/**
 * Unified Model Provider Interface
 *
 * Abstract base class for all AI model providers (Anthropic, OpenAI, Google, Z.AI)
 * Provides a consistent interface for vision, implementation, and evaluation tasks
 */

import type { Screenshot, DesignSpec, EvaluationResult, ModelConfig } from '../core/types';

export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  images?: string[]; // Base64 encoded images
  temperature?: number;
  maxTokens?: number;
  thinkingBudget?: number; // For extended thinking models
}

export interface CompletionResponse {
  content: string;
  thinking?: string; // Extended thinking output if available
  usage: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    totalCost: number; // Cost in USD
  };
  model: string;
  provider: string;
}

/**
 * Abstract base class for model providers
 */
export abstract class ModelProvider {
  protected config: ModelConfig;
  protected apiKey: string;
  protected baseUrl?: string;

  constructor(config: ModelConfig, apiKey: string, baseUrl?: string) {
    this.config = config;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Make a completion request to the model
   */
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Vision analysis: Analyze a screenshot and return design spec
   */
  abstract analyzeScreenshot(
    screenshot: Screenshot,
    memoryContext?: string,
    projectContext?: any
  ): Promise<DesignSpec>;

  /**
   * Implementation: Generate code changes from design spec
   */
  abstract implementChanges(
    spec: DesignSpec,
    projectPath: string
  ): Promise<any>;

  /**
   * Evaluation: Score a design
   */
  abstract evaluateDesign(screenshot: Screenshot): Promise<EvaluationResult>;

  /**
   * Check if the provider supports vision (image inputs)
   */
  abstract supportsVision(): boolean;

  /**
   * Check if the provider supports extended thinking
   */
  abstract supportsExtendedThinking(): boolean;

  /**
   * Get cost per 1M tokens (input/output)
   */
  abstract getCostPer1M(): { input: number; output: number; thinking?: number };

  /**
   * Calculate cost for a completion
   */
  calculateCost(usage: { inputTokens: number; outputTokens: number; thinkingTokens?: number }): number {
    const costs = this.getCostPer1M();
    let total = 0;
    total += (usage.inputTokens / 1_000_000) * costs.input;
    total += (usage.outputTokens / 1_000_000) * costs.output;
    if (usage.thinkingTokens && costs.thinking) {
      total += (usage.thinkingTokens / 1_000_000) * costs.thinking;
    }
    return total;
  }

  /**
   * Get model display name
   */
  getDisplayName(): string {
    return `${this.config.provider}/${this.config.model}`;
  }
}

/**
 * Provider factory
 */
export class ModelProviderFactory {
  static create(
    config: ModelConfig,
    credentials: { apiKey: string; baseUrl?: string }
  ): ModelProvider {
    switch (config.provider) {
      case 'anthropic':
        return new (require('./AnthropicProvider').AnthropicProvider)(
          config,
          credentials.apiKey,
          credentials.baseUrl
        );
      case 'openai':
        return new (require('./OpenAIProvider').OpenAIProvider)(
          config,
          credentials.apiKey,
          credentials.baseUrl
        );
      case 'google':
        return new (require('./GoogleProvider').GoogleProvider)(
          config,
          credentials.apiKey,
          credentials.baseUrl
        );
      case 'zai':
        return new (require('./ZAIProvider').ZAIProvider)(
          config,
          credentials.apiKey,
          credentials.baseUrl
        );
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}
