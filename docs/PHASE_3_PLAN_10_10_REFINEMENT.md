# Phase 3: 10/10 Refinement Loop - Implementation Plan

**Status:** 📋 PLANNING
**Estimated Effort:** 6-8 hours
**Priority:** HIGH
**Dependencies:** Phase 1 ✅ Complete, Phase 2 ✅ Complete

---

## Problem Statement

**Current Behavior:**

- VIZTRTR stops when target score (default 8.5/10) is reached
- Good UI/UX is achieved, but not excellent
- No path to reach 10/10 "perfect" state
- Users want optional "continue to excellence" mode

**User Request:**
> "I think a human needs to be in the loop after iterations have been run and verified by Opus 4.1, iterations should be re run until the final visual model thinks its a 10/10."

---

## Solution Overview

Add **optional refinement loop** that continues iterating after target score is reached, aiming for 10/10 perfection.

### Key Features

1. **`continueToExcellence` config option** - Enable refinement mode
2. **Progressive score targeting** - 8.5 → 9.0 → 9.5 → 10.0
3. **ExpertReviewAgent** - Specialized agent for final polish
4. **Diminishing returns detection** - Stop if no improvement after N iterations
5. **Human approval for each refinement** - Review before applying polish changes

---

## Architecture

### Enhanced Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  VIZTRTR Iteration Loop                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Standard Loop (Target: 8.5)                                   │
│  ├─ Iteration 0-4                                              │
│  ├─ Score: 6.5 → 7.2 → 8.1 → 8.6 ✅                           │
│  └─ Target Reached!                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Refinement Loop (Target: 10.0) - NEW                    │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  IF continueToExcellence = true:                         │  │
│  │                                                           │  │
│  │  Iteration 5 (Target: 9.0)                               │  │
│  │  ├─ ExpertReviewAgent analyzes UI                        │  │
│  │  ├─ Identifies micro-improvements                        │  │
│  │  ├─ Human approval required                              │  │
│  │  └─ Score: 8.6 → 9.1 ✅                                  │  │
│  │                                                           │  │
│  │  Iteration 6 (Target: 9.5)                               │  │
│  │  ├─ Focus on weakest dimensions                          │  │
│  │  ├─ Pixel-perfect adjustments                            │  │
│  │  ├─ Human approval required                              │  │
│  │  └─ Score: 9.1 → 9.6 ✅                                  │  │
│  │                                                           │  │
│  │  Iteration 7 (Target: 10.0)                              │  │
│  │  ├─ Final polish                                         │  │
│  │  ├─ Animation refinement                                 │  │
│  │  ├─ Human approval required                              │  │
│  │  └─ Score: 9.6 → 9.9 (Diminishing returns detected)      │  │
│  │                                                           │  │
│  │  Stop Condition:                                         │  │
│  │  - Score >= 10.0 OR                                      │  │
│  │  - No improvement after 3 iterations OR                  │  │
│  │  - Max refinement iterations reached (default: 5)        │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### New Config Options

```typescript
export interface VIZTRTRConfig {
  // ... existing config ...

  // Phase 3: 10/10 Refinement Loop
  continueToExcellence?: {
    enabled: boolean;                  // Default: false
    targetScore: number;               // Default: 10.0
    maxRefinementIterations: number;   // Default: 5
    minImprovement: number;            // Default: 0.05 (stop if <0.05 improvement)
    plateauIterations: number;         // Default: 3 (stop after 3 iterations with no improvement)
    requireApproval: boolean;          // Default: true (human approval for refinements)
    focusDimensions?: string[];        // Optional: ['typography', 'spacing_layout']
  };
}
```

### Usage Examples

**Basic Refinement:**

```typescript
const config: VIZTRTRConfig = {
  // ... standard config ...
  targetScore: 8.5,
  continueToExcellence: {
    enabled: true,
    targetScore: 10.0,
    maxRefinementIterations: 5,
  }
};
```

**Advanced Refinement:**

```typescript
const config: VIZTRTRConfig = {
  // ... standard config ...
  targetScore: 8.5,
  continueToExcellence: {
    enabled: true,
    targetScore: 10.0,
    maxRefinementIterations: 10,
    minImprovement: 0.1,
    plateauIterations: 2,
    requireApproval: true,
    focusDimensions: ['typography', 'color_contrast', 'accessibility'],
  }
};
```

**Autonomous Refinement (No Approval):**

```typescript
const config: VIZTRTRConfig = {
  // ... standard config ...
  targetScore: 8.5,
  continueToExcellence: {
    enabled: true,
    requireApproval: false,  // Auto-approve refinements
  }
};
```

---

## Implementation Tasks

### Task 1: Add Config Types (30 min)

**File:** `src/core/types.ts`

```typescript
export interface RefinementConfig {
  enabled: boolean;
  targetScore: number;
  maxRefinementIterations: number;
  minImprovement: number;
  plateauIterations: number;
  requireApproval: boolean;
  focusDimensions?: string[];
}

export interface VIZTRTRConfig {
  // ... existing ...
  continueToExcellence?: RefinementConfig;
}
```

**Tests:**

- [ ] Type definitions compile
- [ ] Config validates correctly
- [ ] Default values work

### Task 2: Create ExpertReviewAgent (2 hours)

**File:** `src/agents/ExpertReviewAgent.ts`

**Responsibilities:**

- Analyze UI at near-perfect score (8.5-9.5)
- Identify micro-improvements (spacing, alignment, polish)
- Focus on weakest dimensions
- Generate highly specific recommendations

**Key Methods:**

```typescript
class ExpertReviewAgent {
  async analyzePerfection(
    screenshot: Screenshot,
    currentScore: number,
    dimensionScores: Record<string, number>,
    focusDimensions?: string[]
  ): Promise<RefinementRecommendations>;

  private identifyMicroImprovements(
    weakestDimensions: string[]
  ): Promise<Recommendation[]>;

  private generatePixelPerfectChanges(
    screenshot: Screenshot
  ): Promise<Recommendation[]>;
}
```

**Prompt Template:**

```typescript
const expertPrompt = `
You are an expert UI/UX designer reviewing a near-perfect interface (current score: ${currentScore}/10).

Your goal: Identify micro-improvements to reach 10/10 perfection.

Focus areas:
${focusDimensions.join(', ')}

Current weakest dimensions:
${weakestDimensions.map(d => `- ${d.name}: ${d.score}/10`).join('\n')}

For each improvement:
1. Must be highly specific (exact pixel values, color codes)
2. Must target measurable quality improvement
3. Must not introduce regressions
4. Focus on polish, not major changes

Return 1-3 high-impact micro-improvements only.
`;
```

**Tests:**

- [ ] Agent identifies valid micro-improvements
- [ ] Recommendations are specific and actionable
- [ ] Agent respects focus dimensions
- [ ] Agent works with high scores (>8.5)

### Task 3: Modify Orchestrator for Refinement Loop (2 hours)

**File:** `src/core/orchestrator.ts`

**Changes:**

1. **Add refinement loop after target reached:**

```typescript
async run(): Promise<IterationReport> {
  // ... existing standard loop ...

  // Phase 3: Refinement loop (if enabled)
  if (this.config.continueToExcellence?.enabled && currentScore < this.config.continueToExcellence.targetScore) {
    console.log('\n🎨 Entering refinement mode...');
    await this.runRefinementLoop(currentScore);
  }

  return this.generateReport();
}
```

2. **Implement refinement loop:**

```typescript
private async runRefinementLoop(startingScore: number): Promise<void> {
  const refinementConfig = this.config.continueToExcellence!;
  let currentScore = startingScore;
  let iteration = this.iterations.length;
  let plateauCount = 0;
  let lastScore = startingScore;

  while (
    iteration < this.iterations.length + refinementConfig.maxRefinementIterations &&
    currentScore < refinementConfig.targetScore &&
    plateauCount < refinementConfig.plateauIterations
  ) {
    console.log(`\n🔍 Refinement Iteration ${iteration}`);
    console.log(`   Current: ${currentScore.toFixed(2)}/10`);
    console.log(`   Target: ${refinementConfig.targetScore}/10`);

    // Run expert review
    const result = await this.runRefinementIteration(iteration);
    currentScore = result.evaluation.compositeScore;

    // Check for improvement
    const improvement = currentScore - lastScore;
    if (improvement < refinementConfig.minImprovement) {
      plateauCount++;
      console.log(`   ⚠️  Plateau detected (${plateauCount}/${refinementConfig.plateauIterations})`);
    } else {
      plateauCount = 0;
    }

    lastScore = currentScore;
    iteration++;

    // Check if target reached
    if (currentScore >= refinementConfig.targetScore) {
      console.log(`\n🎉 Perfection achieved! Score: ${currentScore}/10`);
      break;
    }
  }

  if (plateauCount >= refinementConfig.plateauIterations) {
    console.log(`\n⏸️  Refinement stopped: Diminishing returns detected`);
  }
}
```

3. **Implement refinement iteration:**

```typescript
private async runRefinementIteration(iterationNum: number): Promise<IterationResult> {
  const iterationDir = path.join(this.config.outputDir, `refinement_${iterationNum}`);
  await fs.mkdir(iterationDir, { recursive: true });

  // Capture current state
  const screenshot = await this.capturePlugin.captureScreenshot(
    this.config.frontendUrl,
    this.config.screenshotConfig
  );

  // Get current dimension scores
  const currentEval = await this.evaluate(screenshot);
  const dimensionScores = currentEval.scores;

  // Identify weakest dimensions
  const weakest = Object.entries(dimensionScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Expert review
  const expertAgent = new ExpertReviewAgent(this.config.anthropicApiKey!);
  const recommendations = await expertAgent.analyzePerfection(
    screenshot,
    currentEval.compositeScore,
    dimensionScores,
    this.config.continueToExcellence?.focusDimensions || weakest
  );

  // Human approval (if required)
  if (this.config.continueToExcellence?.requireApproval) {
    const approval = await this.requestRefinementApproval(recommendations);
    if (!approval.approved) {
      throw new Error('Refinement rejected by user');
    }
  }

  // Implement changes
  const changes = await this.implementChanges({
    ...currentEval,
    recommendations,
  });

  // Re-evaluate
  const afterScreenshot = await this.capturePlugin.captureScreenshot(
    this.config.frontendUrl,
    this.config.screenshotConfig
  );
  const newEval = await this.evaluate(afterScreenshot);

  return {
    iteration: iterationNum,
    timestamp: new Date(),
    beforeScreenshot: screenshot,
    afterScreenshot,
    designSpec: { ...currentEval, recommendations },
    changes,
    evaluation: newEval,
    scoreDelta: newEval.compositeScore - currentEval.compositeScore,
    targetReached: newEval.compositeScore >= this.config.continueToExcellence!.targetScore,
  };
}
```

**Tests:**

- [ ] Refinement loop starts after target reached
- [ ] Expert review agent is called
- [ ] Approval is requested (if enabled)
- [ ] Loop stops on plateau
- [ ] Loop stops at max iterations
- [ ] Loop stops at 10/10

### Task 4: Update Reporting (1 hour)

**File:** `src/core/orchestrator.ts`

**Changes:**

1. **Separate standard vs refinement iterations:**

```typescript
export interface IterationReport {
  // ... existing ...
  standardIterations: number;
  refinementIterations: number;
  refinementEnabled: boolean;
  perfectionReached: boolean;  // true if score >= 10.0
}
```

2. **Enhanced markdown report:**

```markdown
# VIZTRTR Report

## Summary

- **Starting Score:** 6.5/10
- **Target Score:** 8.5/10
- **Final Score:** 9.8/10
- **Standard Iterations:** 5
- **Refinement Iterations:** 3
- **Perfection Reached:** ❌ (stopped at diminishing returns)

## Standard Iterations (0-4)

[... existing report ...]

## Refinement Iterations (5-7)

### Refinement 5
- **Target:** 9.0/10
- **Score:** 8.6 → 9.1 (+0.5)
- **Focus:** Typography, Spacing
- **Changes:** 2 micro-adjustments

### Refinement 6
- **Target:** 9.5/10
- **Score:** 9.1 → 9.6 (+0.5)
- **Focus:** Color contrast, Accessibility
- **Changes:** 3 pixel-perfect tweaks

### Refinement 7
- **Target:** 10.0/10
- **Score:** 9.6 → 9.8 (+0.2)
- **Status:** ⚠️ Diminishing returns - stopped
```

**Tests:**

- [ ] Report separates standard vs refinement
- [ ] Markdown formatting correct
- [ ] JSON report includes all data

### Task 5: UI Integration (1.5 hours)

**File:** `ui/frontend/src/components/RefinementControls.tsx`

**New Component:**

```typescript
export const RefinementControls: React.FC<{
  enabled: boolean;
  currentScore: number;
  targetScore: number;
  onToggle: (enabled: boolean) => void;
  onConfigure: (config: RefinementConfig) => void;
}> = ({ enabled, currentScore, targetScore, onToggle, onConfigure }) => {
  return (
    <div className="card border-purple-500">
      <h3 className="text-lg font-semibold mb-3">🎨 Excellence Mode</h3>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400">
            Continue refining after {targetScore}/10 to reach perfection
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Current: {currentScore.toFixed(1)}/10
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {enabled && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-400 hover:text-white">
            Configure Refinement
          </summary>
          <div className="mt-3 space-y-3">
            {/* Configuration form */}
          </div>
        </details>
      )}
    </div>
  );
};
```

**Files to Update:**

- `ui/frontend/src/pages/ProjectPage.tsx` - Add refinement controls
- `ui/frontend/src/pages/RunPage.tsx` - Show refinement status
- `ui/frontend/src/components/IterationReview.tsx` - Indicate refinement mode

**Tests:**

- [ ] Refinement toggle works
- [ ] Configuration form submits correctly
- [ ] Run page shows refinement status
- [ ] Approval modal indicates refinement iteration

### Task 6: Documentation (1 hour)

**Files to Create:**

1. **`docs/PHASE_3_REFINEMENT_LOOP.md`** - Complete guide
2. **`docs/EXCELLENCE_MODE_USER_GUIDE.md`** - User-facing docs

**Update:**

- `README.md` - Add Phase 3 to features
- `CLAUDE.md` - Document refinement config

---

## Testing Strategy

### Unit Tests

```typescript
describe('ExpertReviewAgent', () => {
  it('should identify micro-improvements', async () => {
    const recommendations = await expertAgent.analyzePerfection(
      screenshot,
      9.2,
      { typography: 8.5, spacing: 9.0 },
      ['typography']
    );

    expect(recommendations).toHaveLength(1-3);
    expect(recommendations[0].dimension).toBe('typography');
    expect(recommendations[0].impact).toBeGreaterThan(7);
  });

  it('should focus on weakest dimensions', async () => {
    const recommendations = await expertAgent.analyzePerfection(
      screenshot,
      9.0,
      { typography: 10, spacing: 7.5 },  // spacing is weakest
      undefined  // auto-detect
    );

    expect(recommendations[0].dimension).toBe('spacing_layout');
  });
});

describe('Refinement Loop', () => {
  it('should stop at diminishing returns', async () => {
    const config = {
      continueToExcellence: {
        enabled: true,
        plateauIterations: 2,
        minImprovement: 0.1,
      }
    };

    const report = await orchestrator.run(config);

    expect(report.refinementIterations).toBeLessThan(10);
    // Should stop before max iterations due to plateau
  });

  it('should reach 10/10 if possible', async () => {
    const config = {
      continueToExcellence: {
        enabled: true,
        targetScore: 10.0,
      }
    };

    const report = await orchestrator.run(config);

    expect(report.perfectionReached).toBe(true);
    expect(report.finalScore).toBeGreaterThanOrEqual(10.0);
  });
});
```

### Integration Tests

1. **End-to-End Refinement**
   - Start with 8.5/10 UI
   - Enable refinement mode
   - Run full workflow
   - Verify score improves
   - Verify stops at plateau or 10/10

2. **Human Approval in Refinement**
   - Enable `requireApproval: true`
   - Verify approval modal shows for refinement iterations
   - Verify modal indicates "Refinement Mode"

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Refinement loop activates | 100% | When enabled and target reached |
| Score improvement per refinement | +0.2-0.5 | Average delta across refinements |
| Plateau detection accuracy | >90% | Stops within 1 iteration of actual plateau |
| Perfection rate (10/10) | 20-40% | Percentage of runs reaching 10/10 |
| User approval rate | >80% | Approved refinements / Total refinements |

---

## Risks & Mitigations

### Risk 1: Infinite Loop

**Scenario:** Refinement never reaches 10/10, keeps iterating

**Mitigation:**

- Hard limit: `maxRefinementIterations` (default: 5)
- Plateau detection: Stop after N iterations with <0.05 improvement
- User can cancel run anytime via UI

### Risk 2: Over-Polishing

**Scenario:** Too many micro-changes make UI worse

**Mitigation:**

- Human approval required by default
- Each refinement shows before/after comparison
- Rollback capability built-in

### Risk 3: Cost Explosion

**Scenario:** Refinements consume too many API tokens

**Mitigation:**

- Default max 5 refinement iterations
- Cost tracking and warnings
- User can disable or configure limits

### Risk 4: Diminishing Returns Not Detected

**Scenario:** System keeps trying despite no improvement

**Mitigation:**

- Multiple plateau detection thresholds
- Score delta tracking per iteration
- Automatic stop after 3 consecutive plateaus

---

## Timeline

### Week 1 (8 hours)

- [x] Phase 3 planning (this document) - 1 hour
- [ ] Task 1: Config types - 30 min
- [ ] Task 2: ExpertReviewAgent - 2 hours
- [ ] Task 3: Orchestrator refinement loop - 2 hours
- [ ] Task 4: Enhanced reporting - 1 hour
- [ ] Task 5: UI integration - 1.5 hours

### Week 2 (4 hours)

- [ ] Task 6: Documentation - 1 hour
- [ ] Testing & debugging - 2 hours
- [ ] PR review & merge - 1 hour

**Total:** 12 hours (estimated 6-8 hours of active development)

---

## Future Enhancements (Phase 4+)

1. **Dimension-Specific Refinement:**
   - Focus on single dimension (e.g., "perfect typography")
   - Dimension isolation mode

2. **AI-Learned Excellence Patterns:**
   - Learn what makes 10/10 from approved refinements
   - Auto-suggest common perfection patterns

3. **Comparative Excellence:**
   - Compare to "best in class" examples
   - Industry standard benchmarking

4. **Collaborative Refinement:**
   - Multiple reviewers vote on changes
   - Designer + developer approval workflow

---

## Conclusion

Phase 3 adds the final piece to VIZTRTR's workflow: **the pursuit of perfection**.

**Key Benefits:**

- Optional, non-breaking feature
- Human oversight ensures quality
- Plateau detection prevents waste
- Achieves 10/10 when possible

**Integration Points:**

- ✅ Works with Phase 1 (UI Consistency)
- ✅ Works with Phase 2 (Human Approval)
- ✅ Extends existing orchestrator workflow

**Production Readiness:** Can be built and shipped in ~8 hours

---

**Status:** 📋 Ready for implementation
**Blocked By:** Phase 1 & 2 testing complete
**Next Step:** Begin Task 1 (Config types)
