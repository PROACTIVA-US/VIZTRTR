# Constrained Tools Architecture

## Problem Statement

**Root Cause:** Claude Sonnet 4.5 cannot be constrained via prompt engineering alone. When asked to make "surgical changes" (e.g., "change 1-3 className attributes only"), the model consistently rewrites entire components (25-139 lines) instead.

**Evidence from Sprint Testing:**

- Sprint 1: 100% build success, 50% validation pass (40/80/150 limits)
- Sprint 2: 100% build success, 0% validation pass (10/25/50 limits + dynamic growth)
- Sprint 3: 0% build success, 20% validation pass (CSS-only mode)

**Conclusion:** Pre-implementation validation as gatekeeper leads to 0% success when agent ignores constraints. Need architectural solution, not prompt fixes.

## Architectural Solutions

### Solution 1: Constrained Tool Approach (Recommended)

**Concept:** Force micro-changes by limiting what the AI can do through restricted tool APIs.

**Implementation:**

```typescript
// Instead of giving full file write access, provide micro-change tools:

const tools = [
  {
    name: 'updateClassName',
    description: 'Update a single className attribute',
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        lineNumber: { type: 'number' },
        oldClassName: { type: 'string' },
        newClassName: { type: 'string' }
      }
    }
  },
  {
    name: 'updateStyleValue',
    description: 'Update a single CSS property value',
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        lineNumber: { type: 'number' },
        property: { type: 'string' },
        oldValue: { type: 'string' },
        newValue: { type: 'string' }
      }
    }
  },
  {
    name: 'updateTextContent',
    description: 'Update text content within an element',
    input_schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        lineNumber: { type: 'number' },
        oldText: { type: 'string' },
        newText: { type: 'string' }
      }
    }
  }
];

// Agent workflow:
// 1. Agent analyzes design recommendation
// 2. Agent chooses micro-change tool (updateClassName, updateStyleValue, etc.)
// 3. Tool executes ONLY the specific change requested
// 4. File changes are atomic and traceable
```

**Advantages:**

- ✅ Physically impossible for agent to rewrite entire files
- ✅ Every change is atomic and logged
- ✅ Easy rollback (each tool call is separate)
- ✅ Works with any LLM (not model-specific)
- ✅ Enforces surgical changes by design

**Challenges:**

- ❌ Requires building new tool system
- ❌ May limit agent creativity
- ❌ Complex changes require multiple tool calls
- ❌ Need to handle edge cases (multi-line changes)

### Solution 2: Multi-Agent Workflow

**Concept:** Separate planning from execution with specialized agents.

**Implementation:**

```typescript
// 1. Planner Agent - High-level strategy
const plannerAgent = {
  model: 'claude-opus-4',
  role: 'Analyze design and create micro-change plan',
  output: [
    { action: 'updateClassName', target: 'Header.tsx:42', from: 'text-sm', to: 'text-base' },
    { action: 'updateClassName', target: 'Header.tsx:45', from: 'py-2', to: 'py-3' }
  ]
};

// 2. Editor Agent - Execute individual changes
const editorAgent = {
  model: 'claude-sonnet-4',
  role: 'Execute single micro-change from plan',
  constraints: 'Can only modify 1 line at a time'
};

// 3. Validator Agent - Verify changes
const validatorAgent = {
  model: 'claude-sonnet-4',
  role: 'Check if change meets design goal',
  output: { valid: true, reasoning: '...' }
};
```

**Advantages:**

- ✅ Separation of concerns (planning vs execution)
- ✅ Each agent has clear, limited scope
- ✅ Planner can think broadly, editor executes narrowly
- ✅ Validator provides quality control

**Challenges:**

- ❌ More complex orchestration
- ❌ Higher API costs (3 agents per change)
- ❌ Latency (sequential agent calls)
- ❌ Editor agent may still ignore constraints

### Solution 3: Build-First Validation (Current Implementation)

**Concept:** Accept all changes that compile successfully, regardless of size.

**Implementation:**

```typescript
// Current state (as of this commit):
// 1. Agent generates code
// 2. Validation logs warnings but doesn't block
// 3. Changes applied to filesystem
// 4. Build system determines success/failure
// 5. If build fails, rollback; if succeeds, keep changes
```

**Advantages:**

- ✅ Simple to implement (already done)
- ✅ Build system is final arbiter
- ✅ No false rejections (validation warnings don't block)
- ✅ Works with existing codebase

**Challenges:**

- ❌ Large diffs still occur (agent rewrites files)
- ❌ Git history becomes noisy
- ❌ Hard to understand what changed (25-139 line diffs)
- ❌ Doesn't solve root problem (agent behavior)

## Recommendation

**Immediate (0-1 week):** Continue with build-first validation (Solution 3)

- Already implemented and working
- Provides baseline functionality
- Allows testing while designing better solution

**Short-term (1-2 weeks):** Implement constrained tools (Solution 1)

- Create `updateClassName`, `updateStyleValue`, `updateTextContent` tools
- Integrate with Claude Agent SDK tool use
- Test on Performia Living Chart
- Measure success rate vs current approach

**Long-term (1+ month):** Consider multi-agent workflow (Solution 2)

- If constrained tools prove limiting
- When need more sophisticated reasoning
- For complex multi-file refactors

## Implementation Plan: Constrained Tools

### Phase 1: Core Tools (Week 1)

1. Create `MicroChangeToolkit` class
2. Implement tools:
   - `updateClassName(filePath, selector, oldClass, newClass)`
   - `updateStyleValue(filePath, selector, property, oldValue, newValue)`
   - `updateTextContent(filePath, selector, oldText, newText)`
3. Add to Claude Agent SDK tool definitions
4. Test with simple CSS changes

### Phase 2: Integration (Week 2)

1. Update `ControlPanelAgent` to use constrained tools
2. Modify prompts to guide tool selection
3. Add tool-level validation (ensure single-line changes)
4. Test on Performia project

### Phase 3: Expansion (Week 3+)

1. Add more tools as needed:
   - `updatePropValue` - Modify single prop
   - `updateImport` - Change import path
   - `addAriaAttribute` - Add accessibility attributes
2. Gather metrics on success rates
3. Compare to build-first validation baseline

## Metrics to Track

**Validation Metrics:**

- Pre-validation pass rate (currently logging only)
- Build success rate (final arbiter)
- Average lines changed per modification
- Tool calls per recommendation (for constrained tools)

**Quality Metrics:**

- Design score improvement (8-dimension rubric)
- Iteration count to target score (8.5+/10)
- Git diff readability (lines changed, hunks)
- Rollback frequency (changes that break builds)

## Success Criteria

**Constrained Tools Success:**

- ✅ 80%+ of changes use ≤5 lines modified
- ✅ 90%+ build success rate
- ✅ 100% of changes are intentional (no accidental rewrites)
- ✅ Average 2-3 tool calls per recommendation

**Build-First Baseline (Current):**

- ❓ ~50% validation warnings (size limits exceeded)
- ❓ ~80% build success (if builds pass)
- ❌ Large diffs (25-139 lines common)
- ❌ Difficult to review changes in git

## References

- Sprint results: `SPRINT_2_3_RESULTS.md`
- Improvement plan: `IMPROVEMENT_PLAN.md`
- Validation system: `src/core/validation.ts`
- Agent implementation: `src/agents/specialized/ControlPanelAgent.ts`
