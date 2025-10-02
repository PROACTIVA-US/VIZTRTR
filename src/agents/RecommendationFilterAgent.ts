/**
 * Recommendation Filter Agent (Layer 2)
 *
 * Filters recommendations to prevent targeting avoided components
 * and validates quality before implementation.
 */

import { Recommendation, FilteredRecommendations } from '../core/types';
import { IterationMemoryManager } from '../memory/IterationMemoryManager';

export class RecommendationFilterAgent {
  /**
   * Filter recommendations based on memory context and quality criteria
   */
  filterRecommendations(
    recommendations: Recommendation[],
    memory: IterationMemoryManager
  ): FilteredRecommendations {
    const approved: Recommendation[] = [];
    const rejected: Array<{ recommendation: Recommendation; reason: string }> = [];

    const avoidedComponents = memory.getAvoidedComponents();

    for (const rec of recommendations) {
      // Check 1: Component targeting validation
      const componentCheck = this.validateComponentTarget(rec, avoidedComponents);
      if (!componentCheck.valid) {
        rejected.push({
          recommendation: rec,
          reason: componentCheck.reason!,
        });
        continue;
      }

      // Check 2: Duplicate detection
      const duplicateCheck = this.checkDuplicate(rec, memory);
      if (!duplicateCheck.valid) {
        rejected.push({
          recommendation: rec,
          reason: duplicateCheck.reason!,
        });
        continue;
      }

      // Check 3: Impact/effort ratio validation
      const ratioCheck = this.validateImpactEffort(rec);
      if (!ratioCheck.valid) {
        rejected.push({
          recommendation: rec,
          reason: ratioCheck.reason!,
        });
        continue;
      }

      // Passed all checks
      approved.push(rec);
    }

    return { approved, rejected };
  }

  /**
   * Check if recommendation targets an avoided component
   */
  private validateComponentTarget(
    rec: Recommendation,
    avoidedComponents: string[]
  ): { valid: boolean; reason?: string } {
    if (avoidedComponents.length === 0) {
      return { valid: true };
    }

    // Check description and code for component references
    const textToCheck = `${rec.title} ${rec.description} ${rec.code || ''}`.toLowerCase();

    for (const component of avoidedComponents) {
      const componentName = component.toLowerCase();
      const simpleFileName = component.split('/').pop()?.replace('.tsx', '').toLowerCase() || '';

      if (textToCheck.includes(componentName) || textToCheck.includes(simpleFileName)) {
        return {
          valid: false,
          reason: `Targets avoided component: ${component}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if this recommendation was already attempted
   */
  private checkDuplicate(
    rec: Recommendation,
    memory: IterationMemoryManager
  ): { valid: boolean; reason?: string } {
    if (memory.wasAttempted(rec)) {
      return {
        valid: false,
        reason: `Already attempted in previous iteration`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate impact/effort ratio meets minimum threshold
   */
  private validateImpactEffort(rec: Recommendation): { valid: boolean; reason?: string } {
    const ratio = rec.impact / rec.effort;
    const minRatio = 1.5; // Minimum 1.5:1 ratio

    if (ratio < minRatio) {
      return {
        valid: false,
        reason: `Low ROI (${ratio.toFixed(1)}:1, minimum ${minRatio}:1). Prefer high-impact, low-effort changes.`,
      };
    }

    return { valid: true };
  }

  /**
   * Log filtering results
   */
  logResults(filtered: FilteredRecommendations): void {
    if (filtered.rejected.length > 0) {
      console.log(`\n⚠️  Filtered Recommendations:`);
      console.log(`   ✅ Approved: ${filtered.approved.length}`);
      console.log(`   ❌ Rejected: ${filtered.rejected.length}`);

      console.log(`\n   Rejection Reasons:`);
      for (const { recommendation, reason } of filtered.rejected) {
        console.log(`   - "${recommendation.title}": ${reason}`);
      }
    }
  }
}
