# Layered Defense Architecture + Human-in-the-Loop

**Status**: Design Phase
**Goal**: Prevent context failures through multiple defense layers + human oversight
**Target**: Phase 2.5 Enhancement

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ITERATION CYCLE                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Vision Prompt Enhancement (Prevention)            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Project context injection                        │    │
│  │ • Component exclusion from memory                  │    │
│  │ • Domain-specific guidance                         │    │
│  │ • Multi-region focus directives                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Vision Analysis Output
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Recommendation Filtering (Safety Net)             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Component target validation                      │    │
│  │ • Duplicate recommendation detection               │    │
│  │ • Impact/effort ratio validation                   │    │
│  │ • Auto-reject flagged components                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  Filtered Recommendations
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: Multi-Region Analysis (Targeted Execution)        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Region-based screenshot capture                  │    │
│  │ • Excluded zone masking                            │    │
│  │ • Progressive UI coverage tracking                 │    │
│  │ • Forced exploration of new areas                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  Implementation Planning
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: Human-in-the-Loop (Learning & Oversight)          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Approval gate for recommendations                │    │
│  │ • Prompt refinement interface                      │    │
│  │ • Context correction feedback                      │    │
│  │ • Memory annotation/curation                       │    │
│  │ • Cost/risk threshold alerts                       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      Implementation + Rollback
```

---

## Layer 1: Vision Prompt Enhancement

### Implementation Location
`src/plugins/vision-claude.ts` - `ClaudeOpusVisionPlugin.analyzeScreenshot()`

### Features

#### 1.1 Project Context Injection
```typescript
interface ProjectContext {
  name: string;
  type: 'web-builder' | 'teleprompter' | 'control-panel' | 'general';
  description: string;
  focusAreas: string[];
  avoidAreas: string[];
}

// In config
projectContext: {
  name: 'VIZTRTR Web UI Builder',
  type: 'web-builder',
  description: 'AI-powered development tool interface with prompt inputs, agent monitoring, and build status displays',
  focusAreas: ['Form inputs', 'Agent cards', 'Build monitors', 'Control panels'],
  avoidAreas: ['Teleprompter UI', 'Music charts', 'Performance displays']
}
```

#### 1.2 Component Exclusion
```typescript
function buildVisionPrompt(
  memoryContext: string,
  projectContext: ProjectContext,
  avoidedComponents: string[]
): string {
  return `
You are analyzing ${projectContext.name}.

PROJECT CONTEXT:
${projectContext.description}

FOCUS ON: ${projectContext.focusAreas.join(', ')}
DO NOT RECOMMEND CHANGES FOR: ${projectContext.avoidAreas.join(', ')}

MEMORY CONTEXT:
${memoryContext}

EXCLUDED COMPONENTS (DO NOT GENERATE RECOMMENDATIONS FOR):
${avoidedComponents.map(c => `- ${c}`).join('\n')}

INSTEAD, focus on these alternative components:
${suggestAlternativeComponents(avoidedComponents).join('\n')}

Generate recommendations ONLY for components NOT in the excluded list.
`;
}
```

#### 1.3 Region-Specific Analysis
```typescript
interface UIRegion {
  name: string;
  selector: string;
  priority: number;
  explored: boolean;
}

const uiRegions: UIRegion[] = [
  { name: 'Header', selector: 'header', priority: 1, explored: false },
  { name: 'PromptInput', selector: '.prompt-input', priority: 2, explored: true },
  { name: 'AgentCards', selector: '.agent-card', priority: 1, explored: false },
  { name: 'BuildStatus', selector: '.build-status', priority: 1, explored: false }
];

// Vision prompt includes current target region
const targetRegion = uiRegions.filter(r => !r.explored && !isAvoided(r.name))[0];
```

---

## Layer 2: Recommendation Filtering

### Implementation Location
`src/agents/RecommendationFilterAgent.ts` (new file)

### Features

#### 2.1 Component Target Validation
```typescript
class RecommendationFilterAgent {
  filterRecommendations(
    recommendations: Recommendation[],
    memoryContext: IterationMemory,
    config: VIZTRTRConfig
  ): FilteredRecommendations {
    const avoidedComponents = memoryContext.getAvoidedComponents();

    return {
      approved: recommendations.filter(r =>
        !this.targetsAvoidedComponent(r, avoidedComponents)
      ),
      rejected: recommendations.filter(r =>
        this.targetsAvoidedComponent(r, avoidedComponents)
      )
    };
  }

  private targetsAvoidedComponent(
    rec: Recommendation,
    avoided: string[]
  ): boolean {
    // Check if recommendation targets avoided component
    return avoided.some(component =>
      rec.description.includes(component) ||
      rec.code?.includes(component)
    );
  }
}
```

#### 2.2 Duplicate Detection
```typescript
  filterDuplicates(
    recommendations: Recommendation[],
    memory: IterationMemory
  ): Recommendation[] {
    return recommendations.filter(rec =>
      !memory.wasAttempted(rec.title, rec.description)
    );
  }
```

#### 2.3 Impact/Effort Validation
```typescript
  validateImpactEffort(rec: Recommendation): ValidationResult {
    const ratio = rec.impact / rec.effort;

    if (ratio < 2.0) {
      return {
        valid: false,
        reason: `Low ROI (${ratio.toFixed(1)}:1). Prefer high-impact, low-effort changes.`
      };
    }

    return { valid: true };
  }
```

---

## Layer 3: Multi-Region Screenshot Analysis

### Implementation Location
`src/plugins/capture-puppeteer.ts` - enhanced screenshot capture
`src/core/types.ts` - new UIRegion types

### Features

#### 3.1 Region-Based Capture
```typescript
interface RegionScreenshotConfig {
  regions: UIRegion[];
  excludeAvoided: boolean;
  progressiveExploration: boolean;
}

class EnhancedPuppeteerCapture {
  async captureRegions(
    url: string,
    regions: UIRegion[],
    avoidedComponents: string[]
  ): Promise<RegionScreenshot[]> {
    const screenshots: RegionScreenshot[] = [];

    for (const region of regions) {
      if (this.shouldSkipRegion(region, avoidedComponents)) {
        continue;
      }

      const screenshot = await this.captureRegion(url, region.selector);
      screenshots.push({
        region: region.name,
        path: screenshot.path,
        priority: region.priority
      });
    }

    return screenshots;
  }
}
```

#### 3.2 Excluded Zone Masking
```typescript
  async captureWithMask(
    url: string,
    excludeSelectors: string[]
  ): Promise<Screenshot> {
    const page = await this.browser.newPage();

    // Hide excluded zones
    for (const selector of excludeSelectors) {
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.style.opacity = '0.1';
          element.style.pointerEvents = 'none';
        }
      }, selector);
    }

    return await this.capture(page);
  }
```

#### 3.3 Progressive Coverage Tracking
```typescript
interface CoverageTracker {
  regions: Map<string, RegionStatus>;
  totalRegions: number;
  exploredRegions: number;

  markExplored(regionName: string): void;
  getNextTarget(): UIRegion | null;
  getCoveragePercent(): number;
}
```

---

## Layer 4: Human-in-the-Loop System

### Implementation Location
`src/agents/HumanLoopAgent.ts` (new file)
`ui/frontend/src/components/ApprovalGate.tsx` (UI component)

### Features

#### 4.1 Approval Gate
```typescript
interface ApprovalRequest {
  iteration: number;
  recommendations: Recommendation[];
  estimatedImpact: 'low' | 'medium' | 'high';
  estimatedCost: number; // API cost in cents
  confidence: number; // 0-1
  requiresApproval: boolean;
}

class HumanLoopAgent {
  async requestApproval(
    recommendations: Recommendation[],
    context: IterationContext
  ): Promise<ApprovalResponse> {
    const risk = this.assessRisk(recommendations);

    if (risk === 'high' || context.iteration === 0) {
      // Show approval UI and wait for response
      return await this.showApprovalUI({
        recommendations,
        risk,
        estimatedCost: this.estimateCost(recommendations),
        memoryContext: context.memory.getContextSummary()
      });
    }

    return { approved: true, modifications: [] };
  }
}
```

#### 4.2 Prompt Refinement Interface
```typescript
interface PromptRefinement {
  agentType: 'vision' | 'orchestrator' | 'implementation';
  currentPrompt: string;
  suggestedChanges: string[];
  userModifications: string;
  appliedAt: Date;
}

class PromptRefinementSystem {
  async showRefinementUI(
    agentType: string,
    failureContext: FailureContext
  ): Promise<PromptRefinement> {
    // Display current prompt with issues highlighted
    // Allow user to edit and save
    // Store refinement in memory for future iterations
  }
}
```

#### 4.3 Context Correction Feedback
```typescript
interface ContextCorrection {
  incorrectAssumption: string;
  correctContext: string;
  affectedRecommendations: string[];
  savedToMemory: boolean;
}

class ContextCorrectionAgent {
  async collectFeedback(
    visionAnalysis: DesignSpec,
    actualContext: ProjectContext
  ): Promise<ContextCorrection | null> {
    // Detect mismatches between vision analysis and actual context
    const mismatch = this.detectMismatch(visionAnalysis, actualContext);

    if (mismatch) {
      return await this.showCorrectionUI(mismatch);
    }

    return null;
  }
}
```

#### 4.4 Memory Annotation
```typescript
interface MemoryAnnotation {
  recommendationId: string;
  userNotes: string;
  tags: string[];
  priority: 'must-try' | 'avoid' | 'low-priority';
  timestamp: Date;
}

class MemoryAnnotationSystem {
  async annotateRecommendation(
    rec: Recommendation,
    annotation: MemoryAnnotation
  ): Promise<void> {
    await this.memory.addAnnotation(rec, annotation);
  }

  async showAnnotationUI(
    iteration: IterationResult
  ): Promise<MemoryAnnotation[]> {
    // Allow user to add notes, tags, priority to attempts
    // Store in iteration memory for future reference
  }
}
```

#### 4.5 Cost/Risk Alerts
```typescript
interface RiskThresholds {
  maxCostPerIteration: number; // cents
  maxFilesModified: number;
  maxLinesChanged: number;
  requireApprovalAbove: 'low' | 'medium' | 'high';
}

class RiskAlertSystem {
  checkThresholds(
    changes: Changes,
    config: RiskThresholds
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    if (changes.estimatedCost > config.maxCostPerIteration) {
      alerts.push({
        type: 'cost',
        severity: 'high',
        message: `Estimated cost $${changes.estimatedCost/100} exceeds limit`
      });
    }

    return alerts;
  }
}
```

---

## Integration Points

### Orchestrator Flow (Updated)
```typescript
async runIteration(iteration: number): Promise<IterationResult> {
  // 1. Load memory
  const memory = await this.memory.load();

  // 2. LAYER 1: Enhanced vision analysis
  const avoidedComponents = memory.getAvoidedComponents();
  const projectContext = this.config.projectContext;
  const visionAnalysis = await this.visionPlugin.analyzeScreenshot(
    screenshot,
    memory.getContextSummary(),
    projectContext,
    avoidedComponents
  );

  // 3. LAYER 2: Filter recommendations
  const filterAgent = new RecommendationFilterAgent();
  const filtered = filterAgent.filterRecommendations(
    visionAnalysis.recommendations,
    memory,
    this.config
  );

  if (filtered.rejected.length > 0) {
    console.log(`⚠️  Rejected ${filtered.rejected.length} recommendations targeting avoided components`);
  }

  // 4. LAYER 4: Human approval gate
  const humanLoop = new HumanLoopAgent();
  const approval = await humanLoop.requestApproval(
    filtered.approved,
    { iteration, memory, config: this.config }
  );

  if (!approval.approved) {
    console.log('❌ User rejected recommendations, ending iteration');
    return this.createRejectedResult(iteration, approval.reason);
  }

  // 5. Orchestrator routing
  const changes = await this.orchestratorAgent.implementChanges(
    approval.recommendations,
    memory.getContextSummary()
  );

  // 6. Verification + Rollback (existing)
  // ...

  // 7. LAYER 4: Collect feedback
  const correction = await humanLoop.collectContextFeedback(visionAnalysis);
  if (correction) {
    await memory.addCorrection(correction);
  }

  return result;
}
```

---

## Configuration Updates

### New Config Fields
```typescript
interface VIZTRTRConfig {
  // ... existing fields

  // Layer 1: Project context
  projectContext: ProjectContext;

  // Layer 3: Region-based analysis
  uiRegions?: UIRegion[];
  enableRegionMasking?: boolean;

  // Layer 4: Human-in-the-loop
  humanLoop: {
    enabled: boolean;
    approvalRequired: 'always' | 'high-risk' | 'first-iteration' | 'never';
    costThreshold: number; // cents
    riskThreshold: 'low' | 'medium' | 'high';
    enablePromptRefinement: boolean;
    enableMemoryAnnotation: boolean;
  };
}
```

---

## UI Components for Human Loop

### ApprovalGate.tsx
```typescript
interface ApprovalGateProps {
  recommendations: Recommendation[];
  risk: RiskLevel;
  estimatedCost: number;
  memoryContext: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onModify: (modifications: Modification[]) => void;
}

// Shows:
// - List of recommendations with impact/effort
// - Risk assessment
// - Estimated API cost
// - Memory context summary
// - Approve/Reject/Modify buttons
```

### PromptEditor.tsx
```typescript
interface PromptEditorProps {
  agentType: string;
  currentPrompt: string;
  failureContext: FailureContext;
  onSave: (newPrompt: string) => void;
  onCancel: () => void;
}

// Shows:
// - Current prompt with syntax highlighting
// - Failure context (what went wrong)
// - Suggested improvements
// - Live preview of changes
// - Save/Cancel buttons
```

### MemoryViewer.tsx
```typescript
interface MemoryViewerProps {
  memory: IterationMemory;
  onAnnotate: (rec: Recommendation, annotation: MemoryAnnotation) => void;
  onExport: () => void;
}

// Shows:
// - All attempted recommendations
// - Success/failure rates
// - Component modification frequency
// - User annotations
// - Export memory button
```

---

## Implementation Priority

### Phase 2.5 (Immediate)
1. ✅ **Layer 1.1**: Project context injection (2 hours)
2. ✅ **Layer 1.2**: Component exclusion (2 hours)
3. ✅ **Layer 2.1**: Basic recommendation filtering (3 hours)
4. ✅ **Layer 4.1**: Simple approval gate (CLI version) (2 hours)

**Total**: ~9 hours, high impact

### Phase 2.6 (Near-term)
5. **Layer 3.1**: Region-based capture (4 hours)
6. **Layer 2.2**: Duplicate detection (1 hour)
7. **Layer 4.2**: Prompt refinement UI (6 hours)

**Total**: ~11 hours

### Phase 2.7 (Medium-term)
8. **Layer 3.2**: Excluded zone masking (3 hours)
9. **Layer 4.3**: Context correction feedback (4 hours)
10. **Layer 4.4**: Memory annotation system (5 hours)

**Total**: ~12 hours

---

## Success Metrics

| Layer | Metric | Target | Measurement |
|-------|--------|--------|-------------|
| L1 | Vision accuracy | >90% correct project context | Manual review |
| L1 | Component exclusion | 0 recommendations for avoided components | Automated |
| L2 | Filter effectiveness | >95% invalid recommendations caught | Automated |
| L3 | UI coverage | >80% regions explored in 5 iterations | Automated |
| L4 | User intervention | <20% recommendations require modification | User feedback |
| L4 | Prompt refinements | >50% reduction in repeat failures | Memory analysis |

---

## Testing Plan

### Unit Tests
- `RecommendationFilterAgent.test.ts` - Filter logic
- `ProjectContext.test.ts` - Context injection
- `RegionCapture.test.ts` - Multi-region screenshots

### Integration Tests
- End-to-end with all layers active
- Measure reduction in failed attempts
- Verify component exclusion works
- Test approval gate flow

### User Acceptance Tests
- Prompt refinement workflow
- Memory annotation usability
- Approval gate response time

---

## Expected Outcomes

### After Layer 1+2 (Phase 2.5)
- ✅ Vision agent respects avoided components
- ✅ No more teleprompter recommendations for web builder
- ✅ Automatic filtering of invalid recommendations
- ✅ Basic human approval before high-risk changes

### After Layer 3 (Phase 2.6)
- ✅ Systematic exploration of all UI regions
- ✅ No repeated attempts on same problematic component
- ✅ 80%+ UI coverage within 5 iterations

### After Layer 4 (Phase 2.7)
- ✅ Users can correct AI misunderstandings
- ✅ Prompt quality improves over time
- ✅ Memory becomes curated knowledge base
- ✅ Safe, supervised autonomous iteration

---

## Rollout Strategy

1. **Week 1**: Implement Phase 2.5 (Layers 1.1, 1.2, 2.1, 4.1)
2. **Week 1**: Test with iteration 3 on VIZTRTR UI
3. **Week 2**: Implement Phase 2.6 (Layers 3.1, 2.2, 4.2)
4. **Week 2**: Test with full 5-iteration cycle
5. **Week 3**: Implement Phase 2.7 (Layers 3.2, 4.3, 4.4)
6. **Week 3**: Production readiness review

---

*Designed for VIZTRTR Phase 2.5-2.7 - October 2025*
