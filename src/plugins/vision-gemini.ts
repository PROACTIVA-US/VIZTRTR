/**
 * Gemini Vision Plugin
 * Uses Google Gemini models for UI/UX analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  Screenshot,
  DesignSpec,
  Issue,
  Recommendation,
  ProjectContext,
  VIZTRTRPlugin,
} from '../core/types';

export class GeminiVisionPlugin implements VIZTRTRPlugin {
  name = 'vision-gemini';
  version = '1.0.0';
  type = 'vision' as const;

  private model: any;
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName = 'gemini-2.0-flash-exp') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.modelName = modelName;

    if (!this.apiKey) {
      throw new Error(
        'Gemini API key required. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.'
      );
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: this.modelName });

    console.log(`✅ Gemini Vision plugin initialized (${this.modelName})`);
  }

  /**
   * Analyze screenshot using Gemini vision
   */
  async analyzeScreenshot(
    screenshot: Screenshot,
    memoryContext?: string,
    projectContext?: ProjectContext,
    avoidedComponents?: string[]
  ): Promise<DesignSpec> {
    console.log('\n👁️  Gemini Vision: Analyzing UI...');

    const prompt = this.buildAnalysisPrompt(memoryContext, projectContext, avoidedComponents);

    try {
      // Convert screenshot to format Gemini expects
      const imagePart = {
        inlineData: {
          mimeType: this.getMimeType(screenshot.format),
          data: screenshot.data,
        },
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const analysisData = this.parseAnalysisResponse(text);

      return {
        iteration: 0, // Will be set by orchestrator
        timestamp: new Date(),
        currentScore: analysisData.currentScore,
        currentIssues: analysisData.issues,
        recommendations: analysisData.recommendations,
        prioritizedChanges: this.prioritizeRecommendations(analysisData.recommendations),
        estimatedNewScore: analysisData.estimatedNewScore || analysisData.currentScore + 0.5,
        detectedContext: projectContext?.type as any,
      };
    } catch (error) {
      console.error('❌ Gemini vision analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(
    memoryContext?: string,
    projectContext?: ProjectContext,
    avoidedComponents?: string[]
  ): string {
    let prompt = `You are an expert UI/UX designer analyzing a web interface screenshot.

SCORING DIMENSIONS (out of 10):
1. Visual Hierarchy (weight: 1.2×) - How well the design guides user attention
2. Typography (weight: 1.0×) - Font choices, sizes, readability
3. Color & Contrast (weight: 1.0×) - Color palette, accessibility
4. Spacing & Layout (weight: 1.1×) - Whitespace, alignment, balance
5. Component Design (weight: 1.0×) - Quality of UI elements
6. Animation & Interaction (weight: 0.9×) - Visual feedback, micro-interactions
7. Accessibility (weight: 1.3×) - WCAG compliance, keyboard navigation
8. Overall Aesthetic (weight: 1.0×) - Polish, consistency, professionalism

`;

    if (projectContext) {
      prompt += `\nPROJECT CONTEXT:\n`;
      prompt += `- Type: ${projectContext.type}\n`;
      prompt += `- Description: ${projectContext.description}\n`;
      prompt += `- Focus areas: ${projectContext.focusAreas.join(', ')}\n`;
      if (projectContext.avoidAreas.length > 0) {
        prompt += `- Avoid modifying: ${projectContext.avoidAreas.join(', ')}\n`;
      }
    }

    if (memoryContext) {
      prompt += `\nMEMORY CONTEXT (previous iterations):\n${memoryContext}\n`;
    }

    if (avoidedComponents && avoidedComponents.length > 0) {
      prompt += `\n⚠️  DO NOT recommend changes to these components (already modified):\n`;
      prompt += avoidedComponents.map(c => `- ${c}`).join('\n') + '\n';
    }

    prompt += `
TASK:
1. Analyze the screenshot across all 8 dimensions
2. Score each dimension (0-10)
3. Calculate weighted composite score
4. Identify specific issues (critical, important, minor)
5. Provide 3-5 actionable recommendations ranked by impact

Provide your response in JSON format:
{
  "currentScore": 7.5,
  "estimatedNewScore": 8.2,
  "dimensionScores": {
    "visual_hierarchy": 7.0,
    "typography": 8.0,
    "color_contrast": 7.5,
    "spacing_layout": 7.0,
    "component_design": 8.0,
    "animation_interaction": 7.0,
    "accessibility": 6.5,
    "overall_aesthetic": 7.5
  },
  "issues": [
    {
      "dimension": "accessibility",
      "severity": "critical",
      "description": "Insufficient color contrast in primary buttons (3.2:1, needs 4.5:1)",
      "location": "Header navigation buttons"
    }
  ],
  "recommendations": [
    {
      "dimension": "accessibility",
      "title": "Improve button color contrast",
      "description": "Increase contrast ratio to 4.5:1 for WCAG AA compliance",
      "impact": 8,
      "effort": 3,
      "code": "Update button background: #2563eb → #1e40af"
    }
  ]
}

IMPORTANT:
- Be specific with locations (use component names, CSS selectors)
- Prioritize high-impact, low-effort changes
- Focus on measurable improvements
- Avoid vague suggestions
`;

    return prompt;
  }

  /**
   * Parse analysis response from Gemini
   */
  private parseAnalysisResponse(text: string): any {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Failed to extract JSON from Gemini response:', text.substring(0, 500));
      throw new Error('Invalid response format from Gemini');
    }

    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      throw new Error('Failed to parse Gemini analysis');
    }
  }

  /**
   * Prioritize recommendations by impact/effort ratio
   */
  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return [...recommendations].sort((a, b) => {
      const ratioA = a.impact / Math.max(a.effort, 1);
      const ratioB = b.impact / Math.max(b.effort, 1);
      return ratioB - ratioA; // Descending
    });
  }

  /**
   * Get MIME type for screenshot format
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      webp: 'image/webp',
    };
    return mimeTypes[format.toLowerCase()] || 'image/png';
  }
}

/**
 * Factory function for plugin instantiation
 */
export function createGeminiVisionPlugin(apiKey?: string, modelName?: string): VIZTRTRPlugin {
  return new GeminiVisionPlugin(apiKey, modelName);
}
