/**
 * Reflection Agent
 *
 * Uses Claude Opus with extended thinking to reflect on:
 * - What was attempted
 * - What worked / didn't work
 * - Why scores changed (or didn't)
 * - What to try next
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ReflectionResult,
  VerificationResult,
  Changes,
  DesignSpec,
  IterationMemory,
} from '../core/types';

export class ReflectionAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Reflect on iteration results using extended thinking
   */
  async reflect(
    iteration: number,
    designSpec: DesignSpec,
    changes: Changes,
    verification: VerificationResult,
    beforeScore: number,
    afterScore: number,
    memory: IterationMemory
  ): Promise<ReflectionResult> {
    console.log(`   🤔 Reflecting on iteration ${iteration}...`);

    const reflectionPrompt = this.buildReflectionPrompt(
      iteration,
      designSpec,
      changes,
      verification,
      beforeScore,
      afterScore,
      memory
    );

    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 8192, // Must be > thinking.budget_tokens
        thinking: {
          type: 'enabled',
          budget_tokens: 3000, // Extended thinking budget
        },
        messages: [
          {
            role: 'user',
            content: reflectionPrompt,
          },
        ],
      });

      return this.parseReflectionResponse(response);
    } catch (error) {
      console.error('   ❌ Reflection failed:', error);
      return {
        shouldContinue: true,
        shouldRollback: false,
        reasoning: 'Reflection agent failed, continuing with caution',
        lessonsLearned: [],
        suggestedNextSteps: [],
      };
    }
  }

  private buildReflectionPrompt(
    iteration: number,
    designSpec: DesignSpec,
    changes: Changes,
    verification: VerificationResult,
    beforeScore: number,
    afterScore: number,
    memory: IterationMemory
  ): string {
    const scoreDelta = afterScore - beforeScore;
    const trend = memory.scoreHistory.length > 0 ? this.analyzeTrend(memory) : 'unknown';

    return `You are a REFLECTION AGENT for the VIZTRITR autonomous UI improvement system.

Your task is to **think deeply** about what just happened and provide strategic guidance for the next iteration.

---

## ITERATION ${iteration} RESULTS

**DESIGN PLAN:**
- UI Context: ${designSpec.detectedContext || 'unknown'}
- Attempted Changes: ${designSpec.prioritizedChanges.length}
- Top Recommendations:
${designSpec.prioritizedChanges
  .slice(0, 3)
  .map((r) => `  • ${r.title} (${r.dimension})`)
  .join('\n')}

**IMPLEMENTATION:**
- Files Modified: ${changes.files.length}
- Modified Files: ${changes.files.map((f) => f.path).join(', ')}
- Summary: ${changes.summary}

**VERIFICATION:**
- Build Succeeded: ${verification.buildSucceeded ? '✅' : '❌'}
- Files Modified: ${verification.filesModified ? '✅' : '❌'}
- Visual Changes: ${verification.visualChangesDetected ? '✅' : '❌'}
- Errors: ${verification.errors.length > 0 ? verification.errors.join('; ') : 'None'}

**SCORE IMPACT:**
- Before: ${beforeScore.toFixed(1)}/10
- After: ${afterScore.toFixed(1)}/10
- Delta: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)}
- Trend: ${trend}

**MEMORY CONTEXT:**
- Total Attempts: ${memory.attemptedRecommendations.length}
- Failed Attempts: ${memory.failedChanges.length}
- Plateau Count: ${memory.plateauCount}
- Frequently Modified: ${Object.entries(memory.contextAwareness.modificationCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([file, count]) => `${file}(${count}x)`)
      .join(', ')}

---

## YOUR REFLECTION TASK

**Think hard** about:

1. **What actually happened?**
   - Did the implementation match the intent?
   - Why did the score change (or not change)?
   - Were there unintended consequences?

2. **What worked / didn't work?**
   - Which changes were effective?
   - Which changes had no effect or negative effect?
   - Were we modifying the right UI context?

3. **What should we learn?**
   - What patterns are emerging?
   - What should we avoid in future iterations?
   - What new approaches should we try?

4. **What should happen next?**
   - Should we continue with this approach?
   - Should we rollback these changes?
   - Should we switch to a different UI context?
   - Should we try a completely different strategy?

---

Return your reflection as JSON:

\`\`\`json
{
  "shouldContinue": boolean,
  "shouldRollback": boolean,
  "reasoning": "Your extended thinking about what happened and why",
  "lessonsLearned": [
    "Specific insights about what worked or didn't work",
    "Patterns or anti-patterns observed",
    "Context-specific learnings"
  ],
  "suggestedNextSteps": [
    "Specific recommendations for next iteration",
    "Alternative approaches to try",
    "UI contexts to focus on or avoid"
  ]
}
\`\`\`

**Be honest and critical. Your insights will guide the next iteration.**`;
  }

  private parseReflectionResponse(response: Anthropic.Message): ReflectionResult {
    // Extract thinking blocks for logging
    const thinkingBlocks = response.content.filter((block) => block.type === 'thinking');
    if (thinkingBlocks.length > 0) {
      console.log('   💭 Agent thinking detected, processing insights...');
    }

    // Extract text content
    const textBlocks = response.content.filter((block) => block.type === 'text');
    const fullText = textBlocks.map((block) => (block as any).text).join('\n');

    // Try to extract JSON
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const result = JSON.parse(jsonText);

        console.log(`   ${result.shouldContinue ? '✅' : '⚠️ '} Continue: ${result.shouldContinue}`);
        console.log(`   ${result.shouldRollback ? '⚠️ ' : '✅'} Rollback: ${result.shouldRollback}`);
        console.log(`   📝 Lessons learned: ${result.lessonsLearned.length}`);

        return result;
      } catch (error) {
        console.error('   ❌ Failed to parse reflection JSON:', error);
      }
    }

    // Fallback
    return {
      shouldContinue: true,
      shouldRollback: false,
      reasoning: fullText || 'Failed to parse reflection',
      lessonsLearned: [],
      suggestedNextSteps: [],
    };
  }

  private analyzeTrend(memory: IterationMemory): string {
    if (memory.scoreHistory.length < 2) return 'unknown';

    const recent = memory.scoreHistory.slice(-3);
    const avgDelta = recent.reduce((sum, entry) => sum + entry.delta, 0) / recent.length;

    if (avgDelta > 0.2) return 'improving';
    if (avgDelta < -0.2) return 'declining';
    return 'plateau';
  }
}
