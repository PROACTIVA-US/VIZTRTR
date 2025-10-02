# VIZTRTR Agent Architecture - Deep Analysis & Improvement Plan

## Executive Summary

After extensive research into multi-agent AI systems, LLM-driven autonomous improvement frameworks, and Claude's extended thinking capabilities, combined with analysis of VIZTRTR's actual performance, I've identified **fundamental architectural weaknesses** that are preventing the system from achieving its goals.

**The Core Problem**: VIZTRTR is trying to do too much with too little structure.

---

## Current Architecture Weaknesses

### 1. **Single-Loop, No Feedback Architecture**

**Problem**: The current system is a simple loop:
```
Screenshot → Vision Analysis → Implementation → Wait → Screenshot → Repeat
```

**What's Missing**:
- No self-reflection after implementation
- No evaluation of WHAT was actually changed
- No comparison of intended vs. actual outcomes
- No learning from mistakes within iteration
- No meta-reasoning about why scores plateau

**Research Finding**: Best-in-class autonomous systems use **iterative refinement with LLM-driven feedback loops** (Multi-AI Agent System paper, 2024). After each action, the agent evaluates what happened and updates its strategy.

---

### 2. **Vision Agent Has No Memory or Context**

**Problem**: Each iteration, the vision agent analyzes a fresh screenshot with NO knowledge of:
- What was previously changed
- What recommendations were already attempted
- Why previous changes failed or succeeded
- The history of score progression

**Current Behavior**:
```
Iteration 0: Score 7.2 → Recommends "Increase lyrics contrast"
Iteration 1: Score 7.8 → Recommends "Increase lyrics text contrast" (SAME THING!)
Iteration 2: Score 7.2 → Recommends "Increase chord label contrast" (AGAIN!)
```

**Research Finding**: **Memory-Augmented Pattern** is essential for agents to recall past decisions and outputs across sessions. Without memory, agents repeat the same mistakes endlessly.

---

### 3. **Implementation Agent Lacks Extended Thinking Budget**

**Problem**: We allocated 2000 tokens for extended thinking, but the agent is given a **single-shot task**:
```
"Here's a recommendation. Implement it. Return JSON."
```

This doesn't leverage extended thinking properly!

**What Extended Thinking Should Do**:
- **Plan**: "Let me think about which files need modification..."
- **Reason**: "The recommendation says 'contrast' but which elements specifically?"
- **Reflect**: "Wait, this change might affect multiple components..."
- **Decide**: "I'll modify Header.tsx and avoid touching TeleprompterView.tsx"

**Research Finding**: Anthropic's multi-agent research system uses extended thinking for the **lead agent to plan its approach**, assess which tools fit the task, and define each subagent's role. We're not using this capability.

---

### 4. **No Specialized Agents (Despite Claiming Multi-Agent)**

**Problem**: We have ONE implementation agent that tries to handle:
- Settings Panel (desktop UI)
- Teleprompter View (stage UI)
- Blueprint View (editing UI)
- Header/Footer (navigation)

**What Happens**: The agent gets confused, applies wrong sizing, breaks context boundaries.

**Research Finding**: **Orchestrator-Worker Pattern** with **specialized subagents** is the gold standard. The lead agent coordinates while delegating to specialists who operate in parallel.

**What We Need**:
```
VisionAgent → DesignOrchestratorAgent → {
  ControlPanelAgent (Settings, Header)
  TeleprompterAgent (Stage performance view)
  BlueprintAgent (Structure editing)
}
```

---

### 5. **Scoring System Is Unreliable**

**Problem**: Vision agent scores are wildly inconsistent:
```
Iteration 0: 7.2 (before) → 7.8 (after) = +0.6 improvement
Iteration 1: 5.8 (before) → 7.2 (after) = score drops then recovers?
```

**Why**: Single-shot vision analysis with subjective 1-10 scoring.

**Research Finding**: **Perceptual diff tools** (Percy, Applitools) use AI to perform sophisticated visual comparisons that mimic human perception. We're relying on Claude Opus to give a number out of thin air.

**What We Need**:
- Objective metrics (contrast ratios from accessibility tools)
- Perceptual diffs (what pixels actually changed)
- Component-level scoring (not whole-app)
- Verification step (did the change work?)

---

### 6. **No Verification or Rollback**

**Problem**: Agent implements changes, we wait 3 seconds, assume it worked, move on.

**Reality**:
- TypeScript errors might have broken the build
- HMR might have failed
- Changes might have been ineffective
- Files might not exist

**Research Finding**: **Reflection and self-criticism** are core components of autonomous systems. The agent should evaluate its own actions and course-correct.

**What We Need**:
- Verify build succeeded
- Check for console errors
- Confirm files were actually modified
- Rollback if implementation failed

---

## Research-Backed Improvements

### Phase 1: Feedback Loops & Memory (CRITICAL)

#### 1.1 **Add Memory Layer**

Create `IterationMemory` that tracks:
```typescript
interface IterationMemory {
  attemptedRecommendations: Recommendation[];
  successfulChanges: FileChange[];
  failedChanges: { recommendation: Recommendation; reason: string }[];
  scoreHistory: { iteration: number; score: number; delta: number }[];
  plateauCount: number;
  contextAwareness: {
    lastModifiedContext: 'teleprompter' | 'settings' | 'blueprint';
    componentsModified: string[];
  };
}
```

**Pass this to EVERY agent** so they know what's already been tried.

#### 1.2 **Add Reflection Step**

After implementation, before next screenshot:
```
ImplementationAgent → ReflectionAgent → {
  - Did the build succeed?
  - Were the intended files modified?
  - Does the diff match expectations?
  - Should we rollback or proceed?
}
```

#### 1.3 **Update Vision Prompt with Memory**

```typescript
const visionPrompt = `
You are analyzing iteration ${iteration}.

PREVIOUS ATTEMPTS:
${memory.attemptedRecommendations.map(r => `- ${r.title}: ${r.status}`).join('\n')}

SCORE HISTORY:
${memory.scoreHistory.map(s => `Iteration ${s.iteration}: ${s.score} (${s.delta})`).join('\n')}

DO NOT recommend changes that have already been attempted without success.
FOCUS on new approaches or different UI contexts.
`
```

---

### Phase 2: Specialized Agents (HIGH PRIORITY)

#### 2.1 **Create Agent Hierarchy**

```
OrchestratorAgent (Claude Opus with extended thinking)
├─ Uses vision analysis to identify UI context
├─ Routes to appropriate specialist
│
├─ ControlPanelAgent (Claude Sonnet)
│  ├─ Files: SettingsPanel.tsx, Header.tsx, LibraryView.tsx
│  ├─ Criteria: Desktop sizing (32-36px buttons, 0.875-1rem text)
│  └─ Budget: 1500 thinking tokens
│
├─ TeleprompterAgent (Claude Sonnet)
│  ├─ Files: TeleprompterView.tsx, Lyric components
│  ├─ Criteria: Stage sizing (3-4.5rem text, 7:1 contrast)
│  └─ Budget: 1500 thinking tokens
│
└─ BlueprintAgent (Claude Sonnet)
   ├─ Files: BlueprintView.tsx, Section components
   ├─ Criteria: Information architecture
   └─ Budget: 1500 thinking tokens
```

#### 2.2 **Orchestrator Agent Prompt**

```typescript
const orchestratorPrompt = `
You are the DESIGN ORCHESTRATOR for VIZTRTR.

ANALYSIS RESULTS:
- Current Score: ${analysis.currentScore}
- UI Context Detected: ${detectedContext}
- Top Issues: ${topIssues}

YOUR TASK:
1. **Think** about which UI context these issues belong to
2. **Route** recommendations to the appropriate specialist agent
3. **Coordinate** if multiple contexts need changes

AVAILABLE SPECIALISTS:
- ControlPanelAgent: Settings, Header (desktop UI)
- TeleprompterAgent: Lyrics, chords (stage UI)
- BlueprintAgent: Song structure (editing UI)

Return routing decisions as JSON:
{
  "routing": [
    {
      "agent": "ControlPanelAgent",
      "recommendations": [/* issues specific to settings panel */],
      "priority": "high"
    },
    ...
  ],
  "reasoning": "Your extended thinking about why you made these routing decisions"
}
`
```

---

### Phase 3: Objective Metrics & Verification

#### 3.1 **Add Accessibility Tool Integration**

Use `@axe-core/puppeteer` to get REAL metrics:
```typescript
const axe = require('@axe-core/puppeteer').default;
const results = await axe(page);

// Extract objective scores:
- Contrast ratio violations
- Missing ARIA labels
- Touch target sizes
- Keyboard navigation issues
```

#### 3.2 **Perceptual Diff Analysis**

Use Pixelmatch or similar:
```typescript
import pixelmatch from 'pixelmatch';

const diff = pixelmatch(beforeImage, afterImage, diffImage, width, height, {
  threshold: 0.1
});

// Verify actual visual changes occurred
if (diff === 0) {
  console.warn("No visual changes detected - implementation may have failed");
}
```

#### 3.3 **Build Verification**

```typescript
async function verifyImplementation(changes: Changes): Promise<VerificationResult> {
  // 1. Run build
  const buildResult = await runBuild();
  if (!buildResult.success) {
    return { success: false, reason: "Build failed", errors: buildResult.errors };
  }

  // 2. Check for console errors
  const consoleErrors = await checkConsoleErrors(page);
  if (consoleErrors.length > 0) {
    return { success: false, reason: "Runtime errors", errors: consoleErrors };
  }

  // 3. Verify files modified
  const filesModified = await verifyFilesChanged(changes.files);
  if (!filesModified) {
    return { success: false, reason: "Files not modified" };
  }

  return { success: true };
}
```

---

### Phase 4: Parallel Execution & Efficiency

#### 4.1 **Run Specialist Agents in Parallel**

```typescript
// Current (SLOW):
for (const recommendation of recommendations) {
  await implementationAgent.implementChanges(recommendation);
}

// Improved (FAST):
const tasks = routingDecisions.map(async (route) => {
  const agent = getSpecialistAgent(route.agent);
  return await agent.implementChanges(route.recommendations);
});

const results = await Promise.all(tasks);
```

**Research Finding**: Anthropic's research system spins up **3-5 subagents in parallel** rather than serially. The subagents use **3+ tools in parallel**.

#### 4.2 **Batch Screenshot Analysis**

Instead of one whole-page screenshot, capture:
- Settings panel region
- Teleprompter content region
- Header region

Analyze in parallel, get context-specific scores.

---

## Revised Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ITERATION ORCHESTRATOR                    │
│  (Main loop with memory, plateau detection, rollback)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   CAPTURE SCREENSHOTS   │
         │  (Parallel: Settings,   │
         │   Teleprompter, Header) │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   VISION AGENT (Opus)   │
         │ + Extended Thinking     │
         │ + Memory Context        │
         │ → Context Detection     │
         │ → Issue Identification  │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │ ORCHESTRATOR AGENT (Opus)│
         │ + Extended Thinking     │
         │ → Route to specialists  │
         │ → Coordinate changes    │
         └────────────┬────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Control │ │Teleprmp │ │Blueprint│
    │  Panel  │ │  Agent  │ │  Agent  │
    │  Agent  │ │ (Sonnet)│ │ (Sonnet)│
    │(Sonnet) │ │         │ │         │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │  VERIFICATION AGENT     │
         │  → Build check          │
         │  → Error detection      │
         │  → Perceptual diff      │
         │  → Accessibility audit  │
         └────────────┬────────────┘
                      │
              ┌───────┴───────┐
              │               │
          SUCCESS?         FAILURE?
              │               │
              ▼               ▼
         [Continue]      [Rollback]
                             │
                   [Update Memory: Failed]
```

---

## Implementation Priority

### Immediate (This Week):
1. ✅ Add iteration memory system
2. ✅ Update vision prompt with memory context
3. ✅ Add reflection step after implementation
4. ✅ Add build verification

### High Priority (Next Week):
5. ⬜ Create specialist agents (ControlPanel, Teleprompter, Blueprint)
6. ⬜ Implement orchestrator agent with routing
7. ⬜ Add parallel execution for specialists

### Medium Priority (Week 3):
8. ⬜ Integrate @axe-core/puppeteer for objective metrics
9. ⬜ Add perceptual diff analysis
10. ⬜ Implement component-level screenshot capture

### Future Enhancements:
11. ⬜ Self-supervised learning (agent learns from successful patterns)
12. ⬜ Emergent orchestration through message passing
13. ⬜ Consensus building between specialist agents

---

## Expected Improvements

### Before (Current):
- **Plateau after 1-2 iterations**
- **Repeats same recommendations**
- **Breaks UI context boundaries**
- **No verification of success**
- **Scores are unreliable**

### After (Improved):
- **Continuous improvement through reflection**
- **No repeated attempts (memory-aware)**
- **Respects UI context boundaries (specialized agents)**
- **Verifies every change (build + diff + accessibility)**
- **Objective metrics + subjective scoring**
- **3-5x faster (parallel execution)**

---

## Key Insights from Research

1. **Extended Thinking ≠ Better Prompts**: You need to structure tasks to REQUIRE thinking, not just enable it. Single-shot JSON responses waste the thinking budget.

2. **Memory is Non-Negotiable**: Without memory, autonomous systems are just fancy RNG generators. Every iteration must build on previous knowledge.

3. **Specialization > Generalization**: One agent trying to do everything will always lose to a team of specialists coordinated by a skilled orchestrator.

4. **Verification > Assumption**: Never assume an LLM action succeeded. Always verify with objective tools.

5. **Feedback Loops > Linear Pipelines**: The difference between "automated" and "autonomous" is whether the system can learn from its mistakes mid-execution.

---

## Conclusion

VIZTRTR has good bones, but it's architecturally stuck in a **2022 mindset** when current best practices (2025) demand:
- Memory-augmented agents
- Orchestrator-worker patterns
- Parallel execution
- Self-reflection
- Objective verification

The path forward is clear. We need to rebuild the orchestration layer with these principles, NOT just tweak prompts.

**This will transform VIZTRTR from a "one-shot improver" to a "true autonomous design system."**
