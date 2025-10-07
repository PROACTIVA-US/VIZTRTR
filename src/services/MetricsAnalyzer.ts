/**
 * MetricsAnalyzer Service
 *
 * Analyzes real browser metrics from Chrome DevTools MCP
 * and converts them into actionable scores
 */

import {
  createChromeDevToolsClient,
  type ChromeDevToolsClientConfig,
} from './chromeDevToolsClient';

export interface MetricsScores {
  performance: number; // 0-10
  accessibility: number; // 0-10
  bestPractices: number; // 0-10
  composite: number; // 0-10 (weighted average)
  breakdown: {
    coreWebVitals: {
      lcp: { value: number; score: number; threshold: string };
      fid: { value: number; score: number; threshold: string };
      cls: { value: number; score: number; threshold: string };
    };
    accessibility: {
      violations: number;
      warnings: number;
      contrastIssues: number;
      score: number;
    };
    performance: {
      fcp: number;
      tti: number;
      tbt: number;
      score: number;
    };
  };
  insights: string[];
  recommendations: string[];
}

export class MetricsAnalyzer {
  private client: ReturnType<typeof createChromeDevToolsClient> | null = null;

  constructor(private config?: ChromeDevToolsClientConfig) {}

  /**
   * Initialize Chrome DevTools MCP client
   */
  private async getClient() {
    if (!this.client) {
      this.client = createChromeDevToolsClient(this.config || {});
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Analyze a URL and return metric-based scores
   */
  async analyze(url: string): Promise<MetricsScores> {
    const client = await this.getClient();

    // Capture all metrics
    const metrics = await client.captureAllMetrics(url);

    // Score Core Web Vitals (0-10 scale)
    const lcpScore = this.scoreLCP(metrics.performance.coreWebVitals.lcp);
    const fidScore = this.scoreFID(metrics.performance.coreWebVitals.fid || 0);
    const clsScore = this.scoreCLS(metrics.performance.coreWebVitals.cls);

    const performanceScore = (lcpScore + fidScore + clsScore) / 3;

    // Score Accessibility (0-10 scale)
    const a11yScore = this.scoreAccessibility(
      metrics.accessibility.violations.length,
      metrics.accessibility.warnings.length,
      metrics.accessibility.contrastIssues.length
    );

    // Score Best Practices (network, console errors, etc.)
    const bestPracticesScore = this.scoreBestPractices(metrics.network, metrics.console);

    // Weighted composite: Performance 40%, Accessibility 40%, Best Practices 20%
    const composite = performanceScore * 0.4 + a11yScore * 0.4 + bestPracticesScore * 0.2;

    // Generate insights and recommendations
    const insights = this.generateInsights(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      performance: performanceScore,
      accessibility: a11yScore,
      bestPractices: bestPracticesScore,
      composite,
      breakdown: {
        coreWebVitals: {
          lcp: {
            value: metrics.performance.coreWebVitals.lcp,
            score: lcpScore,
            threshold: this.getLCPThreshold(metrics.performance.coreWebVitals.lcp),
          },
          fid: {
            value: metrics.performance.coreWebVitals.fid || 0,
            score: fidScore,
            threshold: this.getFIDThreshold(metrics.performance.coreWebVitals.fid || 0),
          },
          cls: {
            value: metrics.performance.coreWebVitals.cls,
            score: clsScore,
            threshold: this.getCLSThreshold(metrics.performance.coreWebVitals.cls),
          },
        },
        accessibility: {
          violations: metrics.accessibility.violations.length,
          warnings: metrics.accessibility.warnings.length,
          contrastIssues: metrics.accessibility.contrastIssues.length,
          score: a11yScore,
        },
        performance: {
          fcp: metrics.performance.metrics.firstContentfulPaint,
          tti: metrics.performance.metrics.timeToInteractive,
          tbt: metrics.performance.metrics.totalBlockingTime,
          score: performanceScore,
        },
      },
      insights,
      recommendations,
    };
  }

  /**
   * Score LCP (Largest Contentful Paint)
   * Good: < 2500ms (10 points)
   * Needs Improvement: 2500-4000ms (5 points)
   * Poor: > 4000ms (0 points)
   */
  private scoreLCP(lcp: number): number {
    if (lcp === 0) return 5; // No data
    if (lcp < 2500) return 10;
    if (lcp < 4000) return 5 + ((4000 - lcp) / 1500) * 5;
    return Math.max(0, 5 - ((lcp - 4000) / 2000) * 5);
  }

  /**
   * Score FID (First Input Delay)
   * Good: < 100ms (10 points)
   * Needs Improvement: 100-300ms (5 points)
   * Poor: > 300ms (0 points)
   */
  private scoreFID(fid: number): number {
    if (fid === 0) return 10; // No interaction or good
    if (fid < 100) return 10;
    if (fid < 300) return 5 + ((300 - fid) / 200) * 5;
    return Math.max(0, 5 - ((fid - 300) / 200) * 5);
  }

  /**
   * Score CLS (Cumulative Layout Shift)
   * Good: < 0.1 (10 points)
   * Needs Improvement: 0.1-0.25 (5 points)
   * Poor: > 0.25 (0 points)
   */
  private scoreCLS(cls: number): number {
    if (cls < 0.1) return 10;
    if (cls < 0.25) return 5 + ((0.25 - cls) / 0.15) * 5;
    return Math.max(0, 5 - ((cls - 0.25) / 0.25) * 5);
  }

  /**
   * Score Accessibility
   */
  private scoreAccessibility(violations: number, warnings: number, contrastIssues: number): number {
    let score = 10;

    // Critical violations: -2 points each
    score -= violations * 2;

    // Warnings: -0.5 points each
    score -= warnings * 0.5;

    // Contrast issues: -1 point each
    score -= contrastIssues * 1;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Score Best Practices
   */
  private scoreBestPractices(network: any[], console: any[]): number {
    let score = 10;

    // Console errors: -1 point each
    const errors = console.filter(m => m.level === 'error');
    score -= errors.length * 1;

    // Large resources: -0.5 points each
    const largeResources = network.filter(r => r.size > 500000); // > 500KB
    score -= largeResources.length * 0.5;

    // Too many requests: -0.1 points per 10 requests over 50
    if (network.length > 50) {
      score -= ((network.length - 50) / 10) * 0.1;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Get LCP threshold category
   */
  private getLCPThreshold(lcp: number): string {
    if (lcp < 2500) return 'Good';
    if (lcp < 4000) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Get FID threshold category
   */
  private getFIDThreshold(fid: number): string {
    if (fid < 100) return 'Good';
    if (fid < 300) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Get CLS threshold category
   */
  private getCLSThreshold(cls: number): string {
    if (cls < 0.1) return 'Good';
    if (cls < 0.25) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(metrics: any): string[] {
    const insights: string[] = [];

    // Performance insights
    const lcp = metrics.performance.coreWebVitals.lcp;
    if (lcp > 0 && lcp < 2500) {
      insights.push('✓ Excellent loading performance (LCP < 2.5s)');
    } else if (lcp > 4000) {
      insights.push('⚠ Slow loading performance (LCP > 4s)');
    }

    // Accessibility insights
    const violations = metrics.accessibility.violations.length;
    if (violations === 0) {
      insights.push('✓ No critical accessibility violations detected');
    } else {
      insights.push(`⚠ ${violations} accessibility violations need attention`);
    }

    // Network insights
    const totalSize = metrics.network.reduce((sum: number, r: any) => sum + r.size, 0);
    if (totalSize > 3000000) {
      // > 3MB
      insights.push('⚠ Total page size exceeds 3MB');
    }

    return insights;
  }

  /**
   * Generate recommendations from metrics
   */
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const lcp = metrics.performance.coreWebVitals.lcp;
    if (lcp > 2500) {
      recommendations.push('Optimize largest content element loading (images, fonts)');
    }

    const cls = metrics.performance.coreWebVitals.cls;
    if (cls > 0.1) {
      recommendations.push('Add size attributes to images and reserve space for dynamic content');
    }

    // Accessibility recommendations
    const violations = metrics.accessibility.violations;
    if (violations.length > 0) {
      recommendations.push(
        `Fix ${violations.length} accessibility violations for WCAG 2.2 AA compliance`
      );
    }

    // Network recommendations
    const largeResources = metrics.network.filter((r: any) => r.size > 500000);
    if (largeResources.length > 0) {
      recommendations.push(`Optimize ${largeResources.length} large resources (> 500KB each)`);
    }

    return recommendations;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}
