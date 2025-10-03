# Critical Issues & Solutions for VIZTRTR

**Date**: October 2, 2025
**Status**: 🔴 CRITICAL - Implementation Agent Not Working

## Summary of Problems

After running a test on Performia, we discovered several critical issues:

1. **❌ NO CHANGES IMPLEMENTED** - Vision agent identifies issues correctly, but implementation agent makes ZERO file changes
2. **❌ NO CHROME DEVTOOLS** - Hybrid scoring not being used (no browser automation visible)
3. **❌ SINGLE PAGE ONLY** - Only testing one route/view, not comprehensive
4. **❌ MISSING CHANGE DESCRIPTIONS** - No clear explanation in UI of what was attempted/changed
5. **❌ NO PRD VALIDATION** - Not checking against product spec before making changes

---

## Issue #1: Implementation Agent Returns Empty Changes

### Evidence
```json
// changes.json shows:
{
  "files": [],
  "summary": "Orchestrated 0 file changes across 1 specialist agents"
}
```

Despite having 5 good recommendations from vision agent:
- Increase chord label contrast (impact: 9, effort: 1)
- Brighten lyrics text (impact: 9, effort: 1)
- Increase line height (impact: 7, effort: 1)
- Increase font size (impact: 10, effort: 2)
- Add high contrast mode toggle (impact: 8, effort: 3)

### Root Cause
`OrchestratorAgent.ts:85` shows `allChanges.length = 0`, meaning specialist agents returned no file modifications.

### Solutions

#### Option A: Debug Current Implementation
1. Add verbose logging to OrchestratorAgent to see what tasks it creates
2. Add logging to specialist agents to see why they return empty
3. Check if file paths are being resolved correctly
4. Verify specialist agents are being called at all

#### Option B: Use Direct Implementation Plugin
Bypass OrchestratorAgent and call implementation plugin directly:
```typescript
// In orchestrator run loop:
const changes = await this.implementationPlugin.implementChanges(
  designSpec.prioritizedChanges[0], // Take top recommendation
  { projectPath, files: detectedFiles }
);
```

#### Option C: Switch to Claude Sonnet 4.5 Direct Mode
Use extended thinking mode with file editing tools directly instead of multi-agent orchestration.

**RECOMMENDATION**: Start with Option A (debugging), fall back to Option B if agents are fundamentally broken.

---

## Issue #2: Chrome DevTools Not Used (Hybrid Scoring)

### Current State
- Only using AI vision scoring
- Missing 40% of hybrid score (real browser metrics)
- No Chrome browser window opens during runs

### What Should Happen
From PHASE_4_COMPLETE.md:
- Chrome DevTools MCP should connect
- Measure real metrics: Core Web Vitals, Lighthouse scores, actual contrast ratios
- Combine: 60% AI vision + 40% real metrics = 95% accuracy

### Solution
```typescript
// In orchestrator config:
{
  hybridScoring: {
    enabled: true,
    aiWeight: 0.6,
    metricsWeight: 0.4,
    chromeExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
}
```

Add Chrome DevTools MCP integration:
1. Install `@modelcontextprotocol/server-chrome-devtools`
2. Configure in orchestrator initialization
3. Call metrics collection after each iteration
4. Blend scores according to weights

---

## Issue #3: Single Page Testing Only

### Current Limitation
- Only captures screenshot of initial route (e.g., `/`)
- Teleprompter apps have multiple views: Song List, Teleprompter View, Settings, etc.
- Performia has: Living Chart, Control Panel, Config, etc.

### Proposed Solution: Multi-Route Testing

```typescript
interface RouteConfig {
  path: string;
  label: string;
  setupActions?: Array<{
    type: 'click' | 'type' | 'wait';
    selector?: string;
    value?: string;
    delay?: number;
  }>;
  priority: 'high' | 'medium' | 'low';
}

const performiaRoutes: RouteConfig[] = [
  {
    path: '/',
    label: 'Living Chart (Main View)',
    priority: 'high'
  },
  {
    path: '/control',
    label: 'Control Panel',
    setupActions: [
      { type: 'click', selector: '#toggle-controls' }
    ],
    priority: 'high'
  },
  {
    path: '/config',
    label: 'Configuration',
    priority: 'medium'
  }
];

// In orchestrator:
for (const route of routes.filter(r => r.priority === 'high')) {
  await page.goto(`${frontendUrl}${route.path}`);

  if (route.setupActions) {
    for (const action of route.setupActions) {
      // Execute action
    }
  }

  const screenshot = await capturePlugin.captureScreenshot();
  const analysis = await visionPlugin.analyzeScreenshot(screenshot, {
    context: `Route: ${route.label}`
  });

  // Collect all analyses, prioritize cross-route consistency
}
```

### User Configuration
Add to UI:
```tsx
// In ProjectsPage or SettingsPage
<RouteConfiguration projectId={project.id}>
  <RouteInput path="/" label="Main View" priority="high" />
  <RouteInput path="/teleprompter" label="Performance View" priority="high" />
  <RouteInput path="/settings" label="Settings" priority="low" />
</RouteConfiguration>
```

---

## Issue #4: Missing Change Descriptions

### Current State
Results show before/after screenshots and scores, but:
- No clear description of what files were changed
- No explanation of what code was modified
- No reasoning for why changes were made

### Solution: Enhanced Results Display

Update `RunPage.tsx` to show:

```tsx
{/* Change Details */}
{iter.changes?.files && iter.changes.files.length > 0 && (
  <div className="mt-3 space-y-2">
    <h4 className="text-sm font-semibold text-slate-300">Changes Made:</h4>
    {iter.changes.files.map((file: any, idx: number) => (
      <div key={idx} className="bg-slate-900/50 p-3 rounded">
        <div className="flex items-start justify-between mb-2">
          <code className="text-xs text-blue-400">{file.path}</code>
          <span className="text-xs text-slate-500">
            +{file.additions || 0} -{file.deletions || 0}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-2">{file.reasoning}</p>

        {/* Code Diff */}
        <details>
          <summary className="text-xs cursor-pointer text-slate-500">
            View Diff
          </summary>
          <pre className="mt-2 text-xs bg-black p-2 rounded overflow-auto">
            {file.diff}
          </pre>
        </details>
      </div>
    ))}
  </div>
)}

{/* If No Changes */}
{(!iter.changes?.files || iter.changes.files.length === 0) && (
  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
    <p className="text-xs text-yellow-400">
      ⚠️ No changes were implemented in this iteration
    </p>
  </div>
)}
```

---

## Issue #5: No PRD Validation

### Current State
- Recommendations are made without checking product spec
- Might suggest features not in PRD
- Might remove features that ARE in PRD
- No permission workflow for out-of-scope changes

### Proposed Solution: PRD-Aware Validation

```typescript
interface PRDValidationResult {
  inScope: boolean;
  reasoning: string;
  prdSection?: string;
  requiresPermission: boolean;
}

class PRDValidator {
  async validateChange(
    change: Recommendation,
    productSpec: ProductSpec
  ): Promise<PRDValidationResult> {
    // Use Claude to analyze if change aligns with PRD
    const prompt = `
Given this product specification:
${JSON.stringify(productSpec, null, 2)}

Is this proposed change in scope?
Change: ${change.title} - ${change.description}

Respond with:
1. IN_SCOPE if change improves existing PRD features
2. ENHANCEMENT if change adds value beyond PRD (needs permission)
3. OUT_OF_SCOPE if change conflicts with PRD
4. REMOVAL if change removes PRD feature (needs permission)
`;

    const result = await analyzeWithClaude(prompt);

    return {
      inScope: result.verdict === 'IN_SCOPE',
      reasoning: result.reasoning,
      prdSection: result.relatedSection,
      requiresPermission: ['ENHANCEMENT', 'REMOVAL'].includes(result.verdict)
    };
  }
}

// In orchestrator:
for (const change of designSpec.prioritizedChanges) {
  const validation = await prdValidator.validateChange(change, productSpec);

  if (!validation.inScope) {
    if (validation.requiresPermission) {
      // Store for human review
      await saveForHumanReview(change, validation);
      continue;
    } else {
      // Skip out-of-scope changes
      continue;
    }
  }

  // Proceed with implementation
  await implementChange(change);
}
```

### UI for Human Review

Add "Pending Approvals" section:
```tsx
// In RunPage or dedicated ApprovalPage
<PendingApprovals runId={runId}>
  {pendingChanges.map(change => (
    <ApprovalCard
      key={change.id}
      change={change}
      reasoning={change.validation.reasoning}
      onApprove={() => handleApprove(change.id)}
      onReject={() => handleReject(change.id)}
    />
  ))}
</PendingApprovals>
```

---

## Recommended Implementation Order

### Phase 1: Fix Core Functionality (CRITICAL)
1. **Debug Implementation Agent** - Get actual file changes working
2. **Add Change Descriptions to UI** - Show what was attempted even if it failed
3. **Add verbose logging** - Understand what's happening at each step

### Phase 2: Quality Improvements (HIGH PRIORITY)
4. **Chrome DevTools Integration** - Real hybrid scoring
5. **PRD Validation** - Ensure changes align with product spec

### Phase 3: Enhanced Testing (MEDIUM PRIORITY)
6. **Multi-Route Testing** - Test all sections of the app
7. **Human Review Workflow** - Approve/reject out-of-scope changes

---

## Next Steps

**Immediate Action Required:**

```bash
# 1. Add debug logging to see what's happening
npm run build
node dist/debug-implementation.js  # Create this debug script

# 2. Check the actual implementation plugin
cat dist/plugins/implementation-claude.js | grep -A 20 "implementChanges"

# 3. Run a test with verbose logging
DEBUG=viztrtr:* npm run test:performia
```

**Expected Output:**
- Should see OrchestratorAgent creating tasks
- Should see specialist agents being called
- Should see file edits being attempted
- If any of these are missing, that's where the bug is

---

## Success Criteria

✅ Implementation agent makes actual file changes
✅ Chrome DevTools provides real metrics
✅ Multiple routes/sections can be tested
✅ Change descriptions shown in UI
✅ PRD validation prevents scope creep
✅ Human approval for significant changes

When all criteria met: **Production Ready**
