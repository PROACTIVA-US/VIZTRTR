# Phase 2: Human-in-the-Loop - Current Status

**Date:** 2025-10-08
**Status:** ⚠️ **PARTIALLY COMPLETE** - Terminal approval exists, web UI needed

---

## What Already Exists ✅

### 1. **HumanLoopAgent** (`src/agents/HumanLoopAgent.ts`)

**Full implementation with:**

- ✅ Approval gates (terminal-based readline)
- ✅ Risk assessment (low/medium/high based on impact+effort)
- ✅ Cost estimation ($0.05-0.15 per recommendation)
- ✅ Configurable approval modes:
  - `always` - Approve every iteration
  - `first-iteration` - Approve first only
  - `high-risk` - Approve high-risk only
  - `never` - Auto-approve (current default)

**Terminal Approval Flow:**

```
============================================================
👤 HUMAN APPROVAL REQUIRED
============================================================

📊 Context:
   Iteration: 0
   Risk Level: MEDIUM
   Estimated Cost: $0.15

📝 Recommendations (3):

   1. [Typography] Improve button text size
      Impact: 7/10 | Effort: 2/10 | ROI: 3.5:1
      Change text-sm to text-base for better readability

👉 Approve these recommendations? (y/n/s=skip iteration):
```

**User responses:**

- `y` / `yes` → Approve and continue
- `n` / `no` → Reject and end iteration cycle
- `s` / `skip` → Skip this iteration, try next one

### 2. **Orchestrator Integration** (`src/core/orchestrator.ts`)

**Lines 276-288:**

```typescript
// Step 2.6: Human approval gate (Layer 4)
const risk = this.humanLoopAgent.assessRisk(filtered.approved);
const estimatedCost = this.humanLoopAgent.estimateCost(filtered.approved);

const approval = await this.humanLoopAgent.requestApproval(filtered.approved, {
  iteration: iterationNum,
  risk,
  estimatedCost,
});

if (!approval.approved) {
  throw new Error(`Human approval denied: ${approval.reason || 'No reason provided'}`);
}
```

**Integration Status:** ✅ Fully integrated, runs after recommendation filtering

### 3. **Type Definitions** (`src/core/types.ts`)

**Lines 13-20:**

```typescript
export interface HumanLoopConfig {
  enabled: boolean;
  approvalRequired: 'always' | 'high-risk' | 'first-iteration' | 'never';
  costThreshold: number; // cents
  riskThreshold: 'low' | 'medium' | 'high';
  enablePromptRefinement?: boolean;
  enableMemoryAnnotation?: boolean;
}
```

**Lines 399-403:**

```typescript
export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
  modifications?: Recommendation[];
}
```

**Status:** ✅ Complete type definitions

---

## What's Missing ❌

### 1. **Web UI for Approval**

**Currently:** Terminal-only (readline prompts)
**Needed:** Web-based approval interface with:

- Before/after screenshots side-by-side
- 8-dimension score comparison
- Code changes diff viewer
- Approve/Reject/Modify buttons
- Comments field for feedback

**Why needed:**

- Users want to run VIZTRTR through web UI
- Can't use terminal prompts in web-based workflows
- Better UX with visual review

### 2. **API Endpoint for Review**

**Missing endpoint:**

```typescript
POST /api/runs/:runId/iterations/:iterationId/review
Body: {
  action: 'approve' | 'reject' | 'modify',
  feedback?: string,
  modifiedRecommendations?: Recommendation[],
}
```

**Integration needed:**

- Server-Sent Events (SSE) to pause execution
- Wait for approval via API before continuing
- Store approval decisions in database

### 3. **Enable by Default in Configs**

**Current default:**

```typescript
humanLoop: {
  enabled: false,
  approvalRequired: 'never',  // Auto-approves
  costThreshold: 100,
  riskThreshold: 'high',
}
```

**Should be:**

```typescript
humanLoop: {
  enabled: true,
  approvalRequired: 'always',  // Require approval every iteration
  costThreshold: 100,
  riskThreshold: 'medium',
}
```

**Files to update:**

- `projects/viztrtr-ui/config.ts`
- `projects/performia/config.ts`
- Default in `src/core/types.ts`

---

## How to Enable Terminal Approval NOW

To enable human approval in the current VIZTRTR run:

### **Option 1: Update Test Config**

**File:** `projects/viztrtr-ui/test.ts`

**Add:**

```typescript
const config: VIZTRTRConfig = {
  // ... existing config ...
  humanLoop: {
    enabled: true,
    approvalRequired: 'always',  // Approve every iteration
    costThreshold: 100,
    riskThreshold: 'medium',
  },
};
```

### **Option 2: Enable via viztrtr-config.json**

**File:** `viztritr-config.json` (in project root)

**Add:**

```json
{
  "viztrtr": {
    "humanLoop": {
      "enabled": true,
      "approvalRequired": "always",
      "costThreshold": 100,
      "riskThreshold": "medium"
    }
  }
}
```

---

## Phase 2 Completion Plan

### **Step 1: Enable Terminal Approval** (5 minutes)

1. Update `projects/viztrtr-ui/config.ts`
2. Set `humanLoop.enabled = true`
3. Set `approvalRequired = 'always'`
4. Test on VIZTRTR's own UI

**Result:** Human can approve/reject each iteration in terminal

### **Step 2: Create Web Review UI** (3 hours)

1. Create `ui/frontend/src/components/IterationReview.tsx`
   - Before/after screenshots
   - Score comparison
   - Diff viewer
   - Approve/Reject buttons

2. Add review route: `/runs/:runId/iterations/:iterationId/review`
3. Integrate with RunPage SSE stream

**Result:** Web-based approval interface

### **Step 3: Create Review API** (2 hours)

1. Add `POST /api/runs/:runId/iterations/:iterationId/review` endpoint
2. Store approval decisions in database
3. Emit SSE event when approval received
4. Modify orchestrator to poll for approval

**Result:** API-driven approval workflow

### **Step 4: Integrate Web + Backend** (2 hours)

1. Orchestrator emits `iteration_review_required` SSE event
2. Frontend shows review modal
3. User approves/rejects
4. API stores decision
5. Orchestrator continues execution

**Result:** Full web-based human-in-the-loop workflow

### **Step 5: Test & Document** (1 hour)

1. Test approval/rejection flows
2. Test skip iteration
3. Document user guide
4. Create demo video

**Result:** Production-ready Phase 2

**Total Time:** ~8 hours

---

## Implementation Priority

### **Immediate (Next 5 minutes):**

✅ Enable terminal approval in test config
✅ Test on VIZTRTR UI (currently running)

### **Short-term (Today):**

1. Create IterationReview UI component
2. Add review API endpoint
3. Integrate with SSE stream

### **Medium-term (This week):**

1. Add modify recommendations feature
2. Add feedback comments
3. Add approval history view

---

## Current Situation

**VIZTRTR is running right now without approval:**

- Running on port 5173 (VIZTRTR's own UI)
- Making changes automatically without human review
- Will complete 5 iterations autonomously

**To stop and enable approval:**

1. Kill current process (Ctrl+C)
2. Update config with `humanLoop.enabled = true`
3. Re-run test
4. Terminal will prompt for approval each iteration

**OR:**

**Let current run finish, then:**

1. Review what it changed
2. Enable approval for future runs
3. Build web UI for better approval experience

---

## Recommendation

Since VIZTRTR is currently running autonomously, I suggest:

**Immediate:**

1. ✅ Let current run finish (see what it does autonomously)
2. ✅ Review changes it made
3. ✅ Enable terminal approval for next run

**Today:**

1. Build web-based approval UI (3 hours)
2. Add review API endpoint (2 hours)
3. Test full workflow (1 hour)

**This Week:**

1. Add modification features
2. Add 10/10 refinement loop (Phase 3)
3. Production deployment

---

## Conclusion

**Phase 2 is 50% complete:**

- ✅ Terminal-based approval fully implemented
- ❌ Web-based approval not yet built
- ❌ Not enabled by default

**To fully complete Phase 2:**

- Enable terminal approval (5 min)
- Build web UI (6-8 hours)
- Test & deploy (2 hours)

**Total Phase 2 completion time:** ~10 hours

---

**Next Action:** Should I:

1. Enable terminal approval now (kill current run, restart with approval)
2. Let current run finish, then build web UI
3. Build web UI in parallel while current run finishes
