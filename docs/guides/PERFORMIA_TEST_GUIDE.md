# VIZTRTR + Performia Test Guide

**Test Case:** Performia Living Chart Application
**Objective:** Validate VIZTRTR's autonomous UI/UX improvement capabilities on a complex, real-world music performance platform

---

## Prerequisites

### 1. Environment Setup

**Required:**
- Node.js 18+ installed
- Anthropic API key with Claude Opus 4 and Sonnet 4 access
- Performia frontend repository cloned
- VIZTRTR repository cloned

**Verify:**
```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
```

### 2. API Key Configuration

Create `.env` in VIZTRTR root:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Install Dependencies

```bash
# In VIZTRTR directory
cd /Users/danielconnolly/Projects/VIZTRITR
npm install
npm run build

# In Performia directory
cd /Users/danielconnolly/Projects/Performia/frontend
npm install
```

---

## Running the Test

### Step 1: Start Performia Frontend

```bash
cd /Users/danielconnolly/Projects/Performia/frontend
npm run dev
```

**Expected output:**
```
  VITE v6.2.0  ready in XXX ms

  ➜  Local:   http://localhost:5001/
  ➜  Network: use --host to expose
```

**Verify:** Open http://localhost:5001 in browser - should see Living Chart interface

### Step 2: Run VIZTRTR Test

In a new terminal:

```bash
cd /Users/danielconnolly/Projects/VIZTRITR
npm run test:performia
```

**What happens:**
1. ✅ Pre-flight checks (frontend accessibility)
2. 📸 Captures baseline screenshot
3. 🔍 Claude Opus analyzes design (8 dimensions)
4. 📊 Generates design spec with issues & recommendations
5. 🔧 Claude Sonnet implements top 3 changes
6. ⏳ Waits for rebuild (3 seconds)
7. 📸 Captures after screenshot
8. 📈 Evaluates new score
9. 🔄 Repeats until target score (8.5/10) or max iterations (5)
10. 📝 Generates comprehensive report

**Expected duration:** 5-10 minutes (depending on iterations)

### Step 3: Review Results

**Output location:**
```
/Users/danielconnolly/Projects/Performia/viztritr-output/
├── iteration_0/
│   ├── before.png
│   ├── after.png
│   ├── design_spec.json
│   ├── changes.json
│   └── evaluation.json
├── iteration_N/
│   └── ...
├── report.json
└── REPORT.md
```

**Key files to review:**
1. `REPORT.md` - Human-readable summary
2. `report.json` - Complete data for analysis
3. `iteration_*/before.png` - Visual progression
4. `iteration_*/after.png` - Visual progression
5. `iteration_*/design_spec.json` - AI analysis details
6. `iteration_*/changes.json` - Code modifications

---

## Understanding the Output

### Design Spec Structure

```json
{
  "iteration": 0,
  "currentScore": 7.2,
  "currentIssues": [
    {
      "dimension": "Typography",
      "severity": "important",
      "description": "Lyric font size too small for performance distance",
      "location": ".teleprompter-lyric"
    }
  ],
  "recommendations": [
    {
      "dimension": "Typography",
      "title": "Increase lyric font size for stage readability",
      "description": "Current 3rem is insufficient at performance distance. Increase to 4-5rem.",
      "impact": 8,
      "effort": 2,
      "code": "Update CSS variable --base-font-size"
    }
  ],
  "prioritizedChanges": [...],  // Top 3 by impact/effort ratio
  "estimatedNewScore": 8.1
}
```

### Changes Structure

```json
{
  "files": [
    {
      "path": "src/styles/teleprompter.css",
      "type": "edit",
      "oldContent": "--base-font-size: 3rem;",
      "newContent": "--base-font-size: 4.5rem;",
      "diff": "- --base-font-size: 3rem;\n+ --base-font-size: 4.5rem;"
    }
  ],
  "summary": "Implemented 3 design improvements using Claude Sonnet agent",
  "buildCommand": "npm run build",
  "testCommand": "npm test"
}
```

### Evaluation Structure

```json
{
  "compositeScore": 8.6,
  "targetScore": 8.5,
  "targetReached": true,
  "scores": {
    "visual_hierarchy": 8.8,
    "typography": 9.1,
    "color_contrast": 8.5,
    "spacing_layout": 8.4,
    "component_design": 8.3,
    "animation_interaction": 8.0,
    "accessibility": 9.2,
    "overall_aesthetic": 8.7
  },
  "strengths": [
    "Excellent lyric readability at performance distance",
    "WCAG AA compliant color contrast",
    "Comprehensive keyboard navigation"
  ],
  "weaknesses": [
    "Minor spacing inconsistencies in settings panel"
  ]
}
```

---

## Expected Improvements

Based on Performia's design challenges, VIZTRTR should address:

### 1. Typography (Weight: 1.0×)
**Current Issues:**
- Lyric font size insufficient for stage distance
- Chord labels hierarchy unclear
- Line-height too tight for musical notation

**Expected Changes:**
- Increase lyric base font size (3rem → 4.5rem)
- Enhance chord label sizing and weight
- Optimize line-height for breathing room

### 2. Color & Contrast (Weight: 1.0×)
**Current Issues:**
- Three-state lyric colors may not meet WCAG AA
- Chord diagrams visibility in stage lighting
- Insufficient contrast in settings panel

**Expected Changes:**
- Enhance gray/cyan/white lyric progression contrast
- Improve chord diagram stroke and fill
- Boost settings panel text contrast

### 3. Visual Hierarchy (Weight: 1.2×)
**Current Issues:**
- Teleprompter vs controls separation unclear
- Section headers in blueprint view blend in
- Focus states not prominent enough

**Expected Changes:**
- Add visual separation (borders, spacing)
- Enhance section header styling
- Improve focus indicator prominence

### 4. Accessibility (Weight: 1.3× - CRITICAL)
**Current Issues:**
- Missing ARIA labels on interactive controls
- Incomplete keyboard navigation
- No screen reader support for dynamic content

**Expected Changes:**
- Add ARIA labels to all buttons/controls
- Implement full keyboard nav (Tab, Enter, Esc)
- Add live region announcements for lyric changes

### 5. Spacing & Layout (Weight: 1.1×)
**Current Issues:**
- Inconsistent 8px grid adherence
- Cramped spacing in settings panel
- Uneven padding across components

**Expected Changes:**
- Standardize to 8px grid system
- Increase settings panel spacing
- Unify padding patterns

---

## Validation Checklist

### ✅ Technical Validation

- [ ] No build errors introduced
- [ ] All tests pass (if tests exist)
- [ ] No TypeScript errors
- [ ] No console warnings in browser
- [ ] Hot reload works correctly
- [ ] Performance not regressed (measure with DevTools)

### ✅ Design Validation

- [ ] Composite score ≥ 8.5/10
- [ ] Typography score ≥ 8.5/10
- [ ] Accessibility score ≥ 9.0/10
- [ ] Color contrast meets WCAG AA
- [ ] Visual hierarchy is clear
- [ ] Components are consistent

### ✅ Functional Validation

- [ ] Living Chart displays correctly
- [ ] Blueprint View displays correctly
- [ ] Settings panel opens/closes smoothly
- [ ] Chord display modes work (Off, Names, Diagrams)
- [ ] Font size slider functions
- [ ] Transpose and Capo work correctly
- [ ] Song library loads
- [ ] Song selection updates view

### ✅ User Experience Validation

Test with actual musicians (if available):
- [ ] Lyrics readable at 6-10 feet distance
- [ ] Chords visible in typical stage lighting
- [ ] Controls accessible during performance
- [ ] Overall polish feels professional
- [ ] No distracting visual elements

---

## Troubleshooting

### Issue: Frontend not accessible

**Error:**
```
❌ Error: Performia frontend is not running
```

**Solution:**
```bash
cd /Users/danielconnolly/Projects/Performia/frontend
npm run dev
# Verify at http://localhost:5001
```

### Issue: API key missing

**Error:**
```
❌ Error: ANTHROPIC_API_KEY not found in .env
```

**Solution:**
```bash
# Create .env in VIZTRTR root
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env
```

### Issue: Build fails

**Error:**
```
TypeScript error in src/test-performia.ts
```

**Solution:**
```bash
npm run build
# Check for TypeScript errors
# Fix any import/type issues
```

### Issue: Low scores not improving

**Symptom:**
- Scores plateau below target
- Multiple iterations with minimal change

**Diagnosis:**
1. Check `design_spec.json` - are recommendations actionable?
2. Check `changes.json` - are files being modified?
3. Review console logs - any implementation errors?

**Solution:**
- Review recommendations in design spec
- Manually verify file paths are correct
- Check if changes are actually being applied
- May need to adjust implementation agent prompts

---

## Next Steps After Test

### 1. Analyze Results
```bash
# View report
cat /Users/danielconnolly/Projects/Performia/viztritr-output/REPORT.md

# Compare screenshots
open /Users/danielconnolly/Projects/Performia/viztritr-output/iteration_0/before.png
open /Users/danielconnolly/Projects/Performia/viztritr-output/iteration_0/after.png
```

### 2. Manual Review
- Review all code changes in `changes.json`
- Test Performia manually for regressions
- Run accessibility audit (Chrome DevTools)
- Get feedback from musicians

### 3. Document Findings
Create Performia test report:
- Baseline vs final scores
- Key improvements made
- Any issues encountered
- Recommendations for VIZTRTR improvements

### 4. Iterate on VIZTRTR
Based on Performia test:
- Refine vision analysis prompts
- Improve implementation agent logic
- Adjust scoring weights if needed
- Add Performia-specific checks

---

## Success Criteria

### Minimum Viable Success
- ✅ Composite score: 8.5+/10
- ✅ No breaking changes
- ✅ Accessibility improved
- ✅ Report generated successfully

### Ideal Success
- ✅ All dimension scores: 8.5+/10
- ✅ Accessibility score: 9.0+/10
- ✅ WCAG AA: 100% compliant
- ✅ Positive musician feedback
- ✅ ≤ 5 iterations to target
- ✅ < 30 minutes total time

---

## Appendix

### A. Performia Frontend Structure

```
frontend/
├── App.tsx                    # Main app component
├── components/
│   ├── Header.tsx
│   ├── TeleprompterView.tsx  # Living Chart
│   ├── BlueprintView.tsx     # Editor
│   ├── SettingsPanel.tsx
│   └── icons/
├── styles/
│   └── (Tailwind CSS)
├── services/
│   └── libraryService.ts
├── hooks/
│   └── useSongMapUpload.ts
└── types.ts
```

### B. Key Files to Monitor

**For changes:**
- `App.tsx` - Main styling and layout
- `TeleprompterView.tsx` - Lyric display
- `BlueprintView.tsx` - Editor view
- `SettingsPanel.tsx` - Controls
- Tailwind config

**For backups:**
All modified files are backed up with timestamp:
```
App.tsx.backup.1727734800000
```

### C. Performance Metrics

**Baseline (before VIZTRTR):**
- TBD - run test to capture

**Target (after VIZTRTR):**
- Composite: 8.5+
- Typography: 8.5+ (critical for performance)
- Accessibility: 9.0+ (critical for inclusivity)
- Visual Hierarchy: 8.5+
- Color Contrast: 8.5+ (stage lighting)

---

**Ready to test! Run `npm run test:performia` to begin** 🚀
