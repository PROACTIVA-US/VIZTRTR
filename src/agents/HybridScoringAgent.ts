/**
 * Hybrid Scoring Agent
 *
 * Combines AI vision analysis (60%) with real browser metrics (40%)
 * for more accurate and objective UI/UX scoring
 */

import { MetricsAnalyzer, type MetricsScores } from '../services/MetricsAnalyzer';
import type { EvaluationResult, Screenshot } from '../core/types';
import { ClaudeOpusVisionPlugin } from '../plugins/vision-claude';

export interface HybridScore {
  compositeScore: number; // 0-10 weighted combination
  visionScore: number; // 0-10 from AI analysis
  metricsScore: number; // 0-10 from real browser metrics
  confidence: number; // 0-1 how confident we are in this score
  breakdown: {
    vision: {
      score: number;
      weight: number;
      weightedScore: number;
      strengths: string[];
      weaknesses: string[];
    };
    metrics: {
      score: number;
      weight: number;
      weightedScore: number;
      performance: number;
      accessibility: number;
      bestPractices: number;
    };
  };
  insights: string[];
  recommendations: Array<{
    source: 'vision' | 'metrics' | 'hybrid';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: number; // 1-10
  }>;
  metrics?: MetricsScores;
}

export class HybridScoringAgent {
  private visionPlugin: ClaudeOpusVisionPlugin;
  private metricsAnalyzer: MetricsAnalyzer;
  private visionWeight: number;
  private metricsWeight: number;

  constructor(anthropicApiKey: string, visionWeight: number = 0.6, metricsWeight: number = 0.4) {
    this.visionPlugin = new ClaudeOpusVisionPlugin(anthropicApiKey);
    this.metricsAnalyzer = new MetricsAnalyzer();
    this.visionWeight = visionWeight;
    this.metricsWeight = metricsWeight;

    // Validate weights
    if (Math.abs(visionWeight + metricsWeight - 1.0) > 0.01) {
      throw new Error('Vision and metrics weights must sum to 1.0');
    }
  }

  /**
   * Score a UI using hybrid approach
   */
  async score(screenshot: Screenshot, url: string): Promise<HybridScore> {
    console.log('🔬 Starting hybrid scoring analysis...');

    // Parallel execution for speed
    const [visionAnalysis, metricsScores] = await Promise.all([
      this.getVisionScore(screenshot),
      this.getMetricsScore(url),
    ]);

    // Calculate weighted composite score
    const visionWeighted = visionAnalysis.score * this.visionWeight;
    const metricsWeighted = metricsScores.composite * this.metricsWeight;
    const compositeScore = visionWeighted + metricsWeighted;

    // Calculate confidence based on agreement between scores
    const confidence = this.calculateConfidence(visionAnalysis.score, metricsScores.composite);

    // Merge insights
    const insights = this.mergeInsights(visionAnalysis, metricsScores);

    // Generate hybrid recommendations
    const recommendations = this.generateRecommendations(visionAnalysis, metricsScores);

    console.log(
      `   Vision Score: ${visionAnalysis.score.toFixed(1)}/10 (${(this.visionWeight * 100).toFixed(0)}%)`
    );
    console.log(
      `   Metrics Score: ${metricsScores.composite.toFixed(1)}/10 (${(this.metricsWeight * 100).toFixed(0)}%)`
    );
    console.log(
      `   Composite: ${compositeScore.toFixed(1)}/10 (confidence: ${(confidence * 100).toFixed(0)}%)`
    );

    return {
      compositeScore,
      visionScore: visionAnalysis.score,
      metricsScore: metricsScores.composite,
      confidence,
      breakdown: {
        vision: {
          score: visionAnalysis.score,
          weight: this.visionWeight,
          weightedScore: visionWeighted,
          strengths: visionAnalysis.strengths,
          weaknesses: visionAnalysis.weaknesses,
        },
        metrics: {
          score: metricsScores.composite,
          weight: this.metricsWeight,
          weightedScore: metricsWeighted,
          performance: metricsScores.performance,
          accessibility: metricsScores.accessibility,
          bestPractices: metricsScores.bestPractices,
        },
      },
      insights,
      recommendations,
      metrics: metricsScores,
    };
  }

  /**
   * Get vision-based score from AI analysis
   */
  private async getVisionScore(screenshot: Screenshot): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
  }> {
    console.log('   🎨 Analyzing with AI vision...');
    const designSpec = await this.visionPlugin.analyzeScreenshot(screenshot);

    return {
      score: designSpec.currentScore,
      strengths: designSpec.currentIssues
        .filter(i => i.severity !== 'critical')
        .map(i => `${i.dimension}: No critical issues`),
      weaknesses: designSpec.currentIssues
        .filter(i => i.severity === 'critical')
        .map(i => `${i.dimension}: ${i.description}`),
    };
  }

  /**
   * Get metrics-based score from real browser data
   */
  private async getMetricsScore(url: string): Promise<MetricsScores> {
    console.log('   📊 Capturing real browser metrics...');
    return await this.metricsAnalyzer.analyze(url);
  }

  /**
   * Calculate confidence in the score
   * Higher confidence when vision and metrics agree
   */
  private calculateConfidence(visionScore: number, metricsScore: number): number {
    const difference = Math.abs(visionScore - metricsScore);

    // Perfect agreement: 100% confidence
    if (difference === 0) return 1.0;

    // Each point of difference reduces confidence by 10%
    // Max difference of 10 points = 0% confidence
    const confidence = Math.max(0, 1.0 - difference / 10);

    return confidence;
  }

  /**
   * Merge insights from both sources
   */
  private mergeInsights(
    vision: { strengths: string[]; weaknesses: string[] },
    metrics: MetricsScores
  ): string[] {
    const insights: string[] = [];

    // Vision insights
    if (vision.strengths.length > 0) {
      insights.push(`Visual Design: ${vision.strengths.length} areas of excellence`);
    }
    if (vision.weaknesses.length > 0) {
      insights.push(`Visual Issues: ${vision.weaknesses.length} areas needing improvement`);
    }

    // Metrics insights
    insights.push(...metrics.insights);

    // Performance summary
    const perfScore = metrics.performance;
    if (perfScore >= 8) {
      insights.push('✓ Excellent performance metrics');
    } else if (perfScore < 5) {
      insights.push('⚠ Performance optimization needed');
    }

    // Accessibility summary
    const a11yScore = metrics.accessibility;
    if (a11yScore >= 9) {
      insights.push('✓ Strong accessibility compliance');
    } else if (a11yScore < 7) {
      insights.push('⚠ Accessibility improvements required');
    }

    return insights;
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(
    vision: { weaknesses: string[] },
    metrics: MetricsScores
  ): Array<{
    source: 'vision' | 'metrics' | 'hybrid';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: number;
  }> {
    const recommendations: Array<{
      source: 'vision' | 'metrics' | 'hybrid';
      priority: 'high' | 'medium' | 'low';
      description: string;
      impact: number;
    }> = [];

    // Vision-based recommendations
    vision.weaknesses.forEach(weakness => {
      recommendations.push({
        source: 'vision',
        priority: 'high',
        description: weakness,
        impact: 8,
      });
    });

    // Metrics-based recommendations
    metrics.recommendations.forEach(rec => {
      recommendations.push({
        source: 'metrics',
        priority: this.categorizePriority(rec),
        description: rec,
        impact: this.estimateImpact(rec),
      });
    });

    // Hybrid recommendations (when both sources agree)
    if (metrics.breakdown.accessibility.violations > 0 && vision.weaknesses.length > 0) {
      const hasA11yWeakness = vision.weaknesses.some(
        w => w.toLowerCase().includes('accessibility') || w.toLowerCase().includes('contrast')
      );
      if (hasA11yWeakness) {
        recommendations.push({
          source: 'hybrid',
          priority: 'high',
          description:
            'Critical accessibility issues confirmed by both visual and technical analysis',
          impact: 10,
        });
      }
    }

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact - a.impact;
    });

    return recommendations;
  }

  /**
   * Categorize recommendation priority
   */
  private categorizePriority(recommendation: string): 'high' | 'medium' | 'low' {
    const highPriorityKeywords = ['critical', 'violations', 'accessibility', 'wcag', 'error'];
    const mediumPriorityKeywords = ['optimize', 'improve', 'enhance'];

    const lowerRec = recommendation.toLowerCase();

    if (highPriorityKeywords.some(kw => lowerRec.includes(kw))) {
      return 'high';
    }
    if (mediumPriorityKeywords.some(kw => lowerRec.includes(kw))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Estimate impact of recommendation
   */
  private estimateImpact(recommendation: string): number {
    const lowerRec = recommendation.toLowerCase();

    if (lowerRec.includes('accessibility') || lowerRec.includes('wcag')) return 10;
    if (lowerRec.includes('performance') || lowerRec.includes('loading')) return 9;
    if (lowerRec.includes('contrast')) return 8;
    if (lowerRec.includes('optimize')) return 7;
    if (lowerRec.includes('image') || lowerRec.includes('resource')) return 6;

    return 5; // Default medium impact
  }

  /**
   * Cleanup
   */
  async dispose() {
    await this.metricsAnalyzer.disconnect();
  }
}
