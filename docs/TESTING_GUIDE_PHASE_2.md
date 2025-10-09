# Phase 2 Testing Guide: Web Approval Workflow

**Purpose:** End-to-end testing of human-in-the-loop web approval system

**Estimated Time:** 30-45 minutes

---

## Prerequisites

### Required

- ✅ Phase 1 & 2 code completed
- ✅ TypeScript compiled (`npm run build`)
- ✅ Database migration applied
- ✅ ANTHROPIC_API_KEY set in `.env`

### Check Prerequisites

```bash
# 1. Verify build is clean
npm run build

# 2. Check .env file exists
ls -la .env

# 3. Verify ANTHROPIC_API_KEY is set
grep ANTHROPIC_API_KEY .env
```

---

## Test Setup

### Step 1: Start UI Server

```bash
cd ui/server
npm install  # If needed
npm run dev
```

**Expected Output:**

```
╔═══════════════════════════════════════════════════════════════╗
║                    VIZTRTR UI SERVER                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                              ║
║  Port: 3001                                                   ║
║  API: http://localhost:3001/api                           ║
║  Health: http://localhost:3001/health                     ║
╚═══════════════════════════════════════════════════════════════╝
```

**Verify:**

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 2: Start Frontend (New Terminal)

```bash
cd ui/frontend
npm install  # If needed
npm run dev
```

**Expected Output:**

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Verify:** Open <http://localhost:5173/> in browser

### Step 3: Start Test Frontend (New Terminal)

For testing, we need a simple frontend to run VIZTRTR against:

```bash
# Option 1: Use VIZTRTR's own UI as the test target
# (UI server already running on localhost:5173)

# Option 2: Create a minimal test page
cd /tmp
mkdir viztrtr-test-page
cd viztrtr-test-page
npm init -y
npm install vite
echo '<html><body><h1 class="bg-white text-black">Test Page</h1></body></html>' > index.html
npx vite --port 8080
```

---

## Test Execution

### Test 1: Create Project with Approval Enabled

**Via Web UI:**

1. Navigate to <http://localhost:5173/>
2. Click "Create New Project"
3. Fill in:
   - **Name:** "Approval Test"
   - **Project Path:** (path to test frontend)
   - **Frontend URL:** <http://localhost:8080> (or <http://localhost:5173>)
   - **Target Score:** 8.5
   - **Max Iterations:** 2
4. Click "Create Project"

**Expected:** Project created successfully, redirects to projects list

### Test 2: Start Run with Web Approval

**Manually trigger run with approval:**

```bash
cd /Users/danielconnolly/Projects/VIZTRTR
cat > test-approval-workflow.ts << 'EOF'
import { VIZTRTROrchestrator } from './src/core/orchestrator';
import { VIZTRTRConfig } from './src/core/types';
import path from 'path';

async function testApprovalWorkflow() {
  console.log('🧪 Testing Web Approval Workflow...\n');

  const config: VIZTRTRConfig = {
    projectPath: path.join(__dirname, 'ui/frontend'),
    frontendUrl: 'http://localhost:5173',
    targetScore: 8.5,
    maxIterations: 2,
    visionModel: 'claude-opus',
    implementationModel: 'claude-sonnet',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    screenshotConfig: {
      width: 1440,
      height: 900,
      fullPage: false,
    },
    outputDir: './viztritr-output/approval-test',
    verbose: true,
    humanLoop: {
      enabled: true,
      approvalRequired: 'always',
      costThreshold: 100,
      riskThreshold: 'medium',
    },
  };

  const orchestrator = new VIZTRTROrchestrator(config);

  try {
    const report = await orchestrator.run();
    console.log('\n✅ Test Complete!');
    console.log(`Final Score: ${report.finalScore}/10`);
    console.log(`Iterations: ${report.totalIterations}`);
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testApprovalWorkflow();
EOF

# Build and run test
npm run build
node dist/test-approval-workflow.js
```

**Alternative: Via UI Server API**

```bash
# Get project ID from UI
PROJECT_ID="proj_xxx"  # Replace with actual project ID

# Start run via API
curl -X POST http://localhost:3001/api/projects/$PROJECT_ID/runs \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test 3: Monitor SSE Stream

**In browser console (<http://localhost:5173>):**

```javascript
const runId = 'run_xxx'; // Get from URL or API response
const eventSource = new EventSource(`http://localhost:3001/api/runs/${runId}/stream`);

eventSource.addEventListener('progress', (e) => {
  console.log('Progress:', JSON.parse(e.data));
});

eventSource.addEventListener('approval_required', (e) => {
  console.log('⏸️  APPROVAL REQUIRED:', JSON.parse(e.data));
});

eventSource.addEventListener('completed', (e) => {
  console.log('✅ Run completed:', JSON.parse(e.data));
});

eventSource.addEventListener('error', (e) => {
  console.log('❌ Error:', e);
});
```

### Test 4: Verify Approval Modal Appears

**Expected Behavior:**

1. Run starts, captures screenshot
2. Vision analysis completes
3. Discovery agent creates recommendations
4. UIConsistencyAgent validates changes
5. **Orchestrator reaches approval gate**
6. **SSE `approval_required` event emitted**
7. **Frontend catches event**
8. **IterationReview modal appears**

**Manual Verification:**

- [ ] Modal overlay appears (dark background)
- [ ] Before screenshot loads
- [ ] Recommendations list shows (dimension, title, description)
- [ ] Risk indicator shows correct color (low=green, medium=yellow, high=red)
- [ ] Estimated cost displays
- [ ] All buttons present (Approve, Reject, Skip)

### Test 5: Test Approval Action

**Click "Approve & Continue":**

1. Optional: Add feedback in text area
2. Click "Approve & Continue" button
3. Verify modal closes
4. Check browser console for POST request:

   ```
   POST http://localhost:3001/api/runs/{runId}/iterations/0/review
   Body: {"action":"approve","feedback":"..."}
   ```

5. Verify response: `{"success":true,"action":"approve",...}`
6. Watch terminal/logs - orchestrator should continue to execution

**Expected Terminal Output:**

```
🔧 Step 3: Implementing changes...
   Files Modified: X
🔍 Step 4: Verifying implementation...
```

### Test 6: Test Rejection Action

**Restart run or wait for next iteration, then:**

1. Click "Reject" button
2. Rejection modal appears
3. Enter reason: "Testing rejection workflow"
4. Click "Confirm Rejection"
5. Verify modal closes
6. Verify orchestrator stops with error:

   ```
   Error: Human approval denied: Testing rejection workflow
   ```

### Test 7: Test Skip Action

**Restart run, then:**

1. Click "Skip Iteration"
2. Verify modal closes
3. Verify API call:

   ```
   POST .../review
   Body: {"action":"skip"}
   ```

4. Verify orchestrator skips to next iteration

### Test 8: Verify Database Persistence

**Query database:**

```bash
cd ui/server
sqlite3 viztritr.db << EOF
SELECT * FROM iteration_approvals ORDER BY created_at DESC LIMIT 5;
EOF
```

**Expected Output:**

```
id|run_id|iteration_id|action|feedback|reason|created_at
1|run_xxx|0|approve|Testing approval|NULL|2025-10-08 ...
2|run_xxx|1|reject|NULL|Testing rejection|2025-10-08 ...
```

### Test 9: Verify Approval History API

```bash
RUN_ID="run_xxx"  # Replace with actual run ID

curl http://localhost:3001/api/runs/$RUN_ID/approval-history | jq .
```

**Expected Output:**

```json
{
  "history": [
    {
      "id": 1,
      "run_id": "run_xxx",
      "iteration_id": 0,
      "action": "approve",
      "feedback": "Testing approval",
      "reason": null,
      "created_at": "2025-10-08 ..."
    }
  ]
}
```

---

## Edge Case Testing

### Test 10: Browser Refresh During Pending Approval

1. Start run, wait for approval modal
2. Refresh browser (F5)
3. **Expected:** Modal does NOT reappear (approval state in server, not client)
4. Check pending approval status:

   ```bash
   curl http://localhost:3001/api/runs/$RUN_ID/iterations/0/approval-status | jq .
   ```

5. **Expected:** `{"pending":true, ...}` if still waiting

### Test 11: Multiple Concurrent Runs

1. Start Run A
2. Start Run B (different project)
3. Approve Run A iteration 0
4. Approve Run B iteration 0
5. **Expected:** Both run independently, no cross-contamination

### Test 12: Server Restart During Pending Approval

1. Start run, wait for approval modal
2. Stop UI server (Ctrl+C)
3. Restart UI server
4. **Expected:** Pending approval lost (in-memory storage)
5. Run fails or times out
6. **Note:** This is expected behavior, documented limitation

### Test 13: Network Disconnection

1. Start run, wait for approval modal
2. Disconnect network (WiFi off)
3. Click "Approve"
4. **Expected:** Error alert shown
5. Reconnect network
6. Click "Approve" again
7. **Expected:** Works

---

## Success Criteria

### Must Pass

- [x] SSE connection establishes
- [x] `approval_required` event received
- [x] IterationReview modal renders
- [x] Before screenshot loads
- [x] Recommendations display correctly
- [x] Risk indicator shows correct color
- [x] Approve action completes workflow
- [x] Reject action stops workflow
- [x] Skip action advances to next iteration
- [x] Database stores approval decisions
- [x] Approval history API returns data

### Should Pass

- [x] Modal styling matches design system
- [x] Error handling shows user-friendly messages
- [x] Loading states display while waiting
- [x] Screenshots load within 2 seconds

### Nice to Have

- [ ] Smooth animations
- [ ] Responsive design (mobile-friendly)
- [ ] Keyboard shortcuts (Enter=approve, Esc=cancel)

---

## Troubleshooting

### Modal Doesn't Appear

**Check:**

1. Browser console for JavaScript errors
2. Network tab for SSE connection
3. SSE event stream in browser DevTools
4. Server logs for `approval_required` emit

**Debug:**

```javascript
// In browser console
const es = new EventSource('http://localhost:3001/api/runs/RUN_ID/stream');
es.onmessage = (e) => console.log('Message:', e);
es.onerror = (e) => console.error('Error:', e);
```

### Approval Doesn't Work

**Check:**

1. Network tab for POST request
2. Response status (should be 200)
3. Server logs for `respondToApproval` call
4. Database for approval record

**Debug:**

```bash
# Check server logs
tail -f ui/server/logs/*.log  # If logging enabled

# Check database directly
sqlite3 ui/server/viztritr.db "SELECT * FROM iteration_approvals;"
```

### Screenshots Don't Load

**Check:**

1. Screenshot path in modal props
2. Static file serving in server
3. File actually exists:

   ```bash
   ls -la viztritr-output/run_xxx/iteration_0/before.png
   ```

**Fix:**

```bash
# Verify static file routes
curl http://localhost:3001/outputs/run_xxx/iteration_0/before.png
```

### TypeScript Errors

**Fix:**

```bash
npm run build 2>&1 | grep error
# Address any errors
npm run build
```

---

## Test Results Template

```markdown
## Test Results: Phase 2 Web Approval

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** macOS / Windows / Linux

### Test Execution:

| Test | Result | Notes |
|------|--------|-------|
| 1. Create project | ✅ / ❌ | |
| 2. Start run | ✅ / ❌ | |
| 3. SSE stream | ✅ / ❌ | |
| 4. Modal appears | ✅ / ❌ | |
| 5. Approve action | ✅ / ❌ | |
| 6. Reject action | ✅ / ❌ | |
| 7. Skip action | ✅ / ❌ | |
| 8. Database persistence | ✅ / ❌ | |
| 9. Approval history API | ✅ / ❌ | |

### Edge Cases:

| Test | Result | Notes |
|------|--------|-------|
| 10. Browser refresh | ✅ / ❌ | |
| 11. Concurrent runs | ✅ / ❌ | |
| 12. Server restart | ✅ / ❌ | |
| 13. Network disconnect | ✅ / ❌ | |

### Issues Found:

1. [Description of issue]
   - **Severity:** Critical / High / Medium / Low
   - **Steps to reproduce:** ...
   - **Expected:** ...
   - **Actual:** ...

### Overall Result:

- [ ] **PASS** - Ready for production
- [ ] **PASS WITH ISSUES** - Minor fixes needed
- [ ] **FAIL** - Major issues, not ready

### Recommendations:

[Any suggestions for improvements or fixes]
```

---

## Next Steps After Testing

### If Tests Pass

1. ✅ Mark Phase 2 as production-ready
2. ✅ Create PR for Phase 1 & 2
3. ✅ Deploy to staging environment
4. ✅ Begin Phase 3 planning

### If Tests Fail

1. ❌ Document all failures
2. ❌ Create GitHub issues for each bug
3. ❌ Fix critical issues
4. ❌ Re-test
5. ❌ Update documentation

---

## Automated Testing (Future)

**For next session:**

```typescript
// test/integration/approval-workflow.test.ts
describe('Phase 2: Web Approval Workflow', () => {
  it('should emit approval_required SSE event', async () => {
    // Test implementation
  });

  it('should display IterationReview modal', async () => {
    // Test implementation
  });

  it('should handle approval action', async () => {
    // Test implementation
  });

  it('should persist approval to database', async () => {
    // Test implementation
  });
});
```

**Run automated tests:**

```bash
npm run test:integration
```

---

**📋 Testing Checklist Complete!**

Use this guide to systematically verify the Phase 2 implementation works end-to-end.
