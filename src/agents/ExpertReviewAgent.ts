/**
 * ExpertReviewAgent - Specialized agent for refining near-perfect UIs (8.5+ → 10.0)
 *
 * Purpose: Analyze high-scoring interfaces and identify micro-improvements
 * that push quality from "good" to "perfect" (10/10).
 *
 * Key Responsibilities:
 * - Identify pixel-perfect spacing and alignment issues
 * - Suggest micro-refinements (subtle shadows, perfect contrast)
 * - Focus on weakest dimensions in otherwise strong UIs
 * - Generate highly specific, actionable recommendations
 */

import Anthropic from '@anthropic-ai/sdk';
import { Screenshot, Recommendation } from '../core/types';

export interface RefinementRecommendations {
  recommendations: Recommendation[];
  focusedDimensions: string[];
  refinementLevel: 'polish' | 'micro-adjustments' | 'pixel-perfect';
  estimatedScoreGain: number;
}

export class ExpertReviewAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Analyze a near-perfect UI and identify micro-improvements
   */
  async analyzePerfection(
    screenshot: Screenshot,
    currentScore: number,
    dimensionScores: Record<string, number>,
    focusDimensions?: string[]
  ): Promise<RefinementRecommendations> {
    console.log(`\n🔬 Expert Review Agent: Analyzing UI for perfection`);
    console.log(`   Current Score: ${currentScore.toFixed(2)}/10`);

    // Identify weakest dimensions (opportunities for improvement)
    const weakest = this.identifyWeakestDimensions(dimensionScores, focusDimensions);
    console.log(`   Focus Dimensions: ${weakest.join(', ')}`);

    // Generate expert prompt
    const prompt = this.buildExpertPrompt(currentScore, dimensionScores, weakest);

    // Call Claude Opus 4 for expert analysis
    const recommendations = await this.requestExpertAnalysis(screenshot, prompt);

    // Estimate score gain
    const estimatedGain = this.estimateScoreGain(recommendations, currentScore);

    return {
      recommendations,
      focusedDimensions: weakest,
      refinementLevel: this.determineRefinementLevel(currentScore),
      estimatedScoreGain: estimatedGain,
    };
  }

  /**
   * Identify the 2-3 weakest dimensions that need improvement
   */
  private identifyWeakestDimensions(
    dimensionScores: Record<string, number>,
    focusDimensions?: string[]
  ): string[] {
    // If focus dimensions specified, use those
    if (focusDimensions && focusDimensions.length > 0) {
      return focusDimensions;
    }

    // Otherwise, find weakest dimensions
    const sorted = Object.entries(dimensionScores)
      .sort((a, b) => a[1] - b[1]) // Sort by score ascending
      .slice(0, 3) // Top 3 weakest
      .map(([dimension]) => dimension);

    return sorted;
  }

  /**
   * Determine refinement level based on current score
   */
  private determineRefinementLevel(
    currentScore: number
  ): 'polish' | 'micro-adjustments' | 'pixel-perfect' {
    if (currentScore >= 9.5) return 'pixel-perfect';
    if (currentScore >= 9.0) return 'micro-adjustments';
    return 'polish';
  }

  /**
   * Build expert prompt for Claude Opus 4
   */
  private buildExpertPrompt(
    currentScore: number,
    dimensionScores: Record<string, number>,
    weakestDimensions: string[]
  ): string {
    const dimensionBreakdown = Object.entries(dimensionScores)
      .map(([name, score]) => `  - ${name}: ${score.toFixed(1)}/10`)
      .join('\n');

    const weakestBreakdown = weakestDimensions
      .map(dim => `  - ${dim}: ${dimensionScores[dim]?.toFixed(1) || 'N/A'}/10`)
      .join('\n');

    return `You are an expert UI/UX designer reviewing a near-perfect interface.

Current Quality Assessment:
- Overall Score: ${currentScore.toFixed(2)}/10
- Target: 10.0/10 (perfection)

Dimension Scores:
${dimensionBreakdown}

Focus Areas (Weakest Dimensions):
${weakestBreakdown}

Your Task:
Identify 1-3 micro-improvements that will push this UI from "${currentScore.toFixed(1)}/10" to closer to "10/10 perfection".

Requirements:
1. **Highly Specific**: Provide exact pixel values, color codes, or CSS properties
2. **Measurable Impact**: Each change must target a specific dimension score
3. **No Regressions**: Must not introduce new issues
4. **Polish, Not Rewrites**: Focus on subtle refinements, not major changes
5. **Prioritize Weakest**: Address the focus areas listed above

For Each Improvement:
- dimension: [one of: visual_hierarchy, typography, color_contrast, spacing_layout, component_design, animation_interaction, accessibility, overall_aesthetic]
- title: Brief, specific title (e.g., "Increase button padding for visual balance")
- description: Detailed, actionable description with exact values
  Example: "Increase button padding from 'px-4 py-2' to 'px-5 py-2.5' to create better visual weight and improve touch targets (44x44px minimum for accessibility)"
- impact: 7-10 (only high-impact changes for refinement)
- effort: 1-3 (refinements should be low effort)

Return ONLY 1-3 high-impact micro-improvements. Quality over quantity.`;
  }

  /**
   * Request expert analysis from Claude Opus 4
   */
  private async requestExpertAnalysis(
    screenshot: Screenshot,
    prompt: string
  ): Promise<Recommendation[]> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: `image/${screenshot.format}`,
                  data: screenshot.data,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const recommendations = this.parseRecommendations(content.text);
      console.log(`   ✅ Generated ${recommendations.length} refinement recommendations`);

      return recommendations;
    } catch (error) {
      console.error('❌ Expert analysis failed:', error);
      throw error;
    }
  }

  /**
   * Parse recommendations from Claude's response
   */
  private parseRecommendations(responseText: string): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Try to extract JSON if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.map(this.normalizeRecommendation);
        } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          return parsed.recommendations.map(this.normalizeRecommendation);
        }
      } catch (e) {
        // Fall through to text parsing
      }
    }

    // Fallback: Parse structured text
    const sections = responseText.split(/\n\s*\n/);
    for (const section of sections) {
      const recommendation = this.parseRecommendationFromText(section);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Parse a single recommendation from text
   */
  private parseRecommendationFromText(text: string): Recommendation | null {
    // Look for dimension, title, description, impact, effort
    const dimensionMatch = text.match(/dimension:\s*(\w+)/i);
    const titleMatch = text.match(/title:\s*(.+)/i);
    const descriptionMatch = text.match(/description:\s*(.+?)(?=\n\w+:|$)/is);
    const impactMatch = text.match(/impact:\s*(\d+)/i);
    const effortMatch = text.match(/effort:\s*(\d+)/i);

    if (!dimensionMatch || !titleMatch || !descriptionMatch) {
      return null;
    }

    return {
      dimension: dimensionMatch[1],
      title: titleMatch[1].trim(),
      description: descriptionMatch[1].trim(),
      impact: impactMatch ? parseInt(impactMatch[1]) : 8,
      effort: effortMatch ? parseInt(effortMatch[1]) : 2,
    };
  }

  /**
   * Normalize recommendation object
   */
  private normalizeRecommendation(rec: any): Recommendation {
    return {
      dimension: rec.dimension || 'overall_aesthetic',
      title: rec.title || 'Refinement',
      description: rec.description || '',
      impact: rec.impact || 8,
      effort: rec.effort || 2,
      code: rec.code,
    };
  }

  /**
   * Estimate score gain from recommendations
   */
  private estimateScoreGain(recommendations: Recommendation[], currentScore: number): number {
    // Diminishing returns as score approaches 10
    const maxPossibleGain = 10 - currentScore;

    // Each high-impact recommendation contributes ~0.1-0.3 points
    const avgGainPerRecommendation = recommendations.reduce((sum, rec) => {
      return sum + (rec.impact / 10) * 0.2; // Scale by impact
    }, 0);

    // Cap at realistic gain (max 0.5 per refinement iteration)
    return Math.min(avgGainPerRecommendation, maxPossibleGain, 0.5);
  }
}
