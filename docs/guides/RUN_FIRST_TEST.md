# VIZTRTR First Test - Execution Guide

**IMPORTANT: This is a SUPERVISED autonomous system, not fully autonomous.**

## Pre-Flight Checklist

### ✅ Prerequisites Verified
- [x] VIZTRTR built (`npm run build`)
- [x] API keys configured (`.env` with `ANTHROPIC_API_KEY`)
- [x] Performia frontend available
- [x] Documentation complete
- [x] Memory system configured

### ⚠️ Safety Measures in Place
- [x] Backup system (creates `.backup.timestamp` files)
- [x] 3-second delay for hot-reload
- [x] Max 5 iterations (safety limit)
- [x] All changes tracked in `viztritr-output/`

## Execution Steps (MANUAL - RECOMMENDED FOR FIRST RUN)

### Terminal 1: Start Performia Dev Server

```bash
cd /Users/danielconnolly/Projects/Performia/frontend
npm run dev
```

**Wait for:**
```
  VITE v6.2.0  ready in XXX ms
  ➜  Local:   http://localhost:5001/
```

**Keep this terminal VISIBLE** - You'll see:
- Hot Module Replacement (HMR) updates when VIZTRTR makes changes
- Build errors if something breaks
- Performance warnings
- Console logs from the app

### Terminal 2: Run VIZTRTR Test

```bash
cd /Users/danielconnolly/Projects/VIZTRITR
npm run test:performia
```

**Expected Process:**
1. Pre-flight checks (validates Performia is running)
2. **Iteration 0:**
   - 📸 Screenshot before
   - 🔍 Claude Opus analyzes (1-2 min)
   - 📊 Design spec generated
   - 🔧 Claude Sonnet implements top 3 changes (2-3 min)
   - 💾 Files modified (watch Terminal 1 for HMR)
   - ⏳ 3 second wait for rebuild
   - 📸 Screenshot after
   - 📈 Evaluate new score
3. **Iteration 1-4:** (if target not reached)
   - Same process, building on previous changes
4. **Report generation**
   - Complete data saved to `/Users/danielconnolly/Projects/Performia/viztritr-output/`

**Total Duration:** 5-10 minutes per iteration = 25-50 minutes for full run

## What to Monitor

### In Terminal 1 (Performia):
- ✅ HMR updates successfully
- ❌ Build errors (TypeScript, import errors)
- ⚠️ Performance warnings
- 🔄 Full page reloads (if HMR fails)

### In Terminal 2 (VIZTRTR):
- ✅ Each iteration completes
- ✅ Scores improve
- ❌ API errors (rate limits, timeouts)
- ❌ Implementation failures

## When to Intervene

### STOP if you see:
1. **Build errors in Terminal 1** - VIZTRTR broke the build
2. **Repeated score plateaus** - Agent is stuck
3. **Nonsensical changes** - Agent is confused
4. **API rate limit errors** - Too many requests
5. **Infinite loop patterns** - Same changes repeating

### How to Stop:
- `Ctrl+C` in Terminal 2 (VIZTRTR)
- Check `viztritr-output/iteration_N/changes.json` for what broke
- Restore from `.backup.timestamp` files if needed
- Review and fix VIZTRTR prompts if needed

## Post-Test Analysis

### 1. Review Output
```bash
cd /Users/danielconnolly/Projects/Performia/viztritr-output
cat REPORT.md
```

### 2. Compare Screenshots
```bash
open iteration_0/before.png
open iteration_N/after.png
```

### 3. Review Changes
```bash
cat iteration_0/changes.json | jq '.files[].path'
```

### 4. Test Performia Manually
- Navigate through all views
- Test all interactions
- Check console for errors
- Verify accessibility improvements

### 5. Document Findings
Create `FIRST_TEST_RESULTS.md` with:
- What worked well
- What failed
- Unexpected behaviors
- Recommendations for VIZTRTR improvements

## Success Criteria for First Test

### Minimum Success:
- ✅ Completes without crashing
- ✅ Generates valid design specs
- ✅ Applies at least some changes
- ✅ Produces complete report
- ✅ No data loss

### Ideal Success:
- ✅ Reaches 8.5+ target score
- ✅ All changes are valid and improve design
- ✅ No breaking changes
- ✅ Performia works better after
- ✅ Process is repeatable

## Rollback Procedure (If Needed)

If VIZTRTR breaks Performia:

```bash
cd /Users/danielconnolly/Projects/Performia/frontend

# Find backup files
find . -name "*.backup.*" | sort

# Restore specific file
cp App.tsx.backup.1727734800000 App.tsx

# Or restore all from git
git checkout HEAD -- .

# Then restart dev server
npm run dev
```

## Next Steps After First Test

### If Successful:
1. Document the results
2. Create case study
3. Refine prompts based on learnings
4. Test on other Performia views
5. Build tmux automation script

### If Issues Found:
1. Document the failures
2. Analyze what went wrong
3. Fix VIZTRTR implementation
4. Update prompts/agents
5. Re-test on simpler target first

---

## Ready to Run?

**Before you start, ask yourself:**
- ✅ Do I have time to monitor this? (30-60 min)
- ✅ Is Performia in a good state? (committed/clean)
- ✅ Am I prepared to debug issues?
- ✅ Have I read this entire guide?

**If YES to all, proceed with Terminal 1 → Terminal 2 execution.**

**If NO to any, wait until conditions are right.**

---

*This is a first test of autonomous UI improvement. Treat it as an experiment, not production automation.*
