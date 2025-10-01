# VIZTRTR - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** September 30, 2025
**Status:** Initial Release
**Test Case:** Performia Living Chart Application

---

## 1. Executive Summary

**VIZTRTR** (Visual Iteration Orchestrator) is an autonomous UI/UX improvement system that analyzes, improves, and evaluates web interfaces through AI-powered iterative cycles. It combines Claude Opus 4's vision analysis with Claude Sonnet 4's agentic code generation to automatically enhance design quality until production-ready standards are achieved (8.5+/10 score).

### Key Value Propositions
- **Autonomous Quality Improvement** - AI agents continuously iterate until design excellence
- **Expert-Level Design Critique** - Claude Opus analyzes with professional designer perspective
- **Intelligent Code Generation** - Claude Sonnet implements changes with extended thinking
- **Objective Scoring** - 8-dimension rubric ensures comprehensive quality assessment
- **Zero Manual Intervention** - Complete automation from analysis to implementation

---

## 2. Problem Statement

### Current Pain Points
1. **Inconsistent UI/UX Quality** - Projects ship with subpar design due to time/budget constraints
2. **Manual Design Reviews** - Expensive, time-consuming, and require expert availability
3. **Accessibility Gaps** - WCAG compliance issues often discovered too late
4. **Iterative Cost** - Each design iteration requires designer time and developer implementation
5. **Subjective Feedback** - Lack of objective, measurable design quality metrics

### Impact
- Delayed product launches due to design iteration cycles
- Higher costs from consultant fees and developer time
- User experience degradation affecting retention and satisfaction
- Accessibility lawsuits from compliance failures
- Inconsistent brand quality across products

---

## 3. Solution Overview

VIZTRTR provides an autonomous design improvement pipeline:

```
┌─────────────┐
│   Capture   │  Screenshot the live UI
│             │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Analyze   │  Claude Opus vision analysis
│             │  8-dimension design scoring
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Implement  │  Claude Sonnet agent generates code
│             │  Extended thinking for intelligent changes
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Evaluate   │  Re-score the improved design
│             │  Compare against target (8.5/10)
└──────┬──────┘
       │
       ▼
   Target reached? ──NO──> Repeat cycle
       │
      YES
       │
       ▼
┌─────────────┐
│   Report    │  Comprehensive improvement report
└─────────────┘
```

---

## 4. Target Users & Use Cases

### Primary Users

#### 1. Solo Developers / Indie Hackers
- **Need:** Ship high-quality UI without hiring designers
- **Use Case:** Run VIZTRTR before launch to ensure professional polish
- **Value:** Cost savings + faster time to market

#### 2. Startups / Small Teams
- **Need:** Maintain design quality with limited resources
- **Use Case:** Continuous UI quality checks in CI/CD pipeline
- **Value:** Consistent brand quality + reduced design debt

#### 3. Enterprise Development Teams
- **Need:** Scale design reviews across multiple projects
- **Use Case:** Automated design QA for all PRs
- **Value:** Reduced consultant costs + faster iterations

### Secondary Users

#### 4. Design Systems Teams
- **Need:** Enforce design system compliance
- **Use Case:** Validate adherence to brand guidelines
- **Value:** Automated compliance checking

#### 5. Accessibility Specialists
- **Need:** Identify WCAG violations early
- **Use Case:** Pre-deployment accessibility audits
- **Value:** Reduced legal risk + inclusive products

---

## 5. Initial Test Case: Performia Living Chart

### Why Performia?

**Performia** is a music performance platform with a complex, interactive "Living Chart" UI featuring:
- Real-time lyric synchronization with audio
- Dynamic chord diagrams and musical notation
- Three-state lyric coloring (upcoming, active, past)
- Smooth scrolling teleprompter view
- Interactive blueprint editor
- Settings panel with multiple tabs

**Complexity Level:** HIGH
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- Real-time audio synchronization
- Complex state management with Immer
- Multiple interactive components

**Design Challenges:**
1. Visual hierarchy across dense musical information
2. Typography for readability at performance distance
3. Color contrast for stage lighting conditions
4. Spacing/layout for multiple viewport sizes
5. Component consistency across views
6. Accessibility for live performance context

### Success Criteria for Performia Test

**Baseline Metrics:**
- Current design score: TBD (first VIZTRTR run)
- Current accessibility score: TBD
- Current WCAG compliance: TBD

**Target Metrics:**
- ✅ Composite score: 8.5+/10
- ✅ Accessibility score: 9.0+/10 (critical for live use)
- ✅ Visual hierarchy: 8.5+/10
- ✅ Typography: 8.5+/10 (readability at distance)
- ✅ WCAG AA compliance: 100%

**Expected Improvements:**
1. Enhanced contrast for stage visibility
2. Improved lyric readability at performance distance
3. Better visual separation between UI sections
4. Optimized touch targets for live control
5. Smoother animations and transitions
6. Comprehensive keyboard navigation

---

## 6. 8-Dimension Scoring System

### Evaluation Dimensions

| Dimension | Weight | Criteria | Performia Focus |
|-----------|--------|----------|-----------------|
| **Visual Hierarchy** | 1.2× | Clear element priority, size scaling, contrast | Critical - dense musical info |
| **Typography** | 1.0× | Font sizes, hierarchy, readability, line height | Critical - performance distance |
| **Color & Contrast** | 1.0× | WCAG compliance, harmony, semantic usage | Critical - stage lighting |
| **Spacing & Layout** | 1.1× | 8px grid, breathing room, alignment | High - multiple views |
| **Component Design** | 1.0× | Button states, touch targets, consistency | High - live interaction |
| **Animation & Interaction** | 0.9× | Smooth transitions, micro-interactions | Medium - audio sync priority |
| **Accessibility** | 1.3× | ⭐ ARIA, keyboard nav, focus management | Critical - live performance |
| **Overall Aesthetic** | 1.0× | Professional polish, modern feel, cohesion | High - professional tool |

**Composite Score Formula:**
```
Composite = Σ(dimension_score × weight) / Σ(weights)
```

**Target Threshold:** 8.5/10

---

## 7. Technical Architecture

### Core Components

#### 1. Vision Analysis Agent (Claude Opus 4)
- **Input:** Screenshot (PNG, 1440x900)
- **Processing:**
  - Analyzes UI against 8 dimensions
  - Identifies specific issues with locations
  - Generates prioritized recommendations
  - Estimates improvement impact
- **Output:** `DesignSpec` with current score and recommendations

#### 2. Implementation Agent (Claude Sonnet 4)
- **Input:** `DesignSpec` + project path
- **Processing:**
  - Extended thinking (2000 tokens) to plan changes
  - Identifies target files automatically
  - Generates code following project patterns
  - Creates timestamped backups
- **Output:** `Changes` with file modifications and diffs

#### 3. Capture Agent (Puppeteer)
- **Input:** Frontend URL + screenshot config
- **Processing:**
  - Launches headless Chrome
  - Navigates to target URL
  - Captures high-quality screenshot
  - Handles dynamic content loading
- **Output:** `Screenshot` with base64 and metadata

#### 4. Evaluation Agent (8D Rubric)
- **Input:** Post-improvement screenshot
- **Processing:**
  - Scores against 8 dimensions
  - Calculates weighted composite score
  - Identifies strengths and weaknesses
  - Determines if target reached
- **Output:** `EvaluationResult` with scores and analysis

### Data Flow

```typescript
interface VIZTRITRConfig {
  projectPath: string;           // '/Users/.../Performia/frontend'
  frontendUrl: string;            // 'http://localhost:5001'
  targetScore: number;            // 8.5
  maxIterations: number;          // 5

  visionModel: 'claude-opus';
  implementationModel: 'claude-sonnet';

  anthropicApiKey: string;

  screenshotConfig: {
    width: 1440;
    height: 900;
    fullPage: false;
    selector?: '#app';            // Optional: specific element
  };

  outputDir: './viztritr-output';
}
```

### Output Structure

```
viztritr-output/
├── iteration_0/
│   ├── before.png                  # Pre-change screenshot
│   ├── after.png                   # Post-change screenshot
│   ├── design_spec.json            # AI analysis + recommendations
│   ├── changes.json                # Applied code changes
│   └── evaluation.json             # Scoring results
├── iteration_1/
│   └── ...
├── iteration_N/
│   └── ...
├── report.json                     # Complete iteration data
└── REPORT.md                       # Human-readable summary
```

---

## 8. Performia Integration Plan

### Phase 1: Setup & Baseline (Week 1)

**Tasks:**
1. ✅ Create Performia test configuration
2. ✅ Start Performia dev server on port 5001
3. ✅ Run initial VIZTRTR analysis
4. ✅ Capture baseline scores across all 8 dimensions
5. ✅ Document current design issues

**Deliverables:**
- Performia VIZTRTR config file
- Baseline design report
- Initial score dashboard

### Phase 2: Iteration & Improvement (Week 2)

**Tasks:**
1. Run VIZTRTR autonomous improvement cycle
2. Monitor each iteration:
   - Before/after screenshots
   - Design spec generation
   - Code implementation
   - Score evaluation
3. Track score progression toward 8.5 target
4. Document all changes made

**Success Metrics:**
- Achieve 8.5+ composite score
- 9.0+ accessibility score
- Zero WCAG AA violations
- < 5 iterations to target

**Deliverables:**
- Complete iteration history
- All screenshots and diffs
- Final improvement report

### Phase 3: Validation & Documentation (Week 3)

**Tasks:**
1. Manual design review of changes
2. Performance testing (ensure no regression)
3. Accessibility audit verification
4. User testing with musicians
5. Document lessons learned

**Deliverables:**
- Validation report
- Performance benchmark
- User feedback summary
- Best practices doc

---

## 9. Success Metrics

### Quantitative Metrics

**Design Quality:**
- Composite score improvement: Target +2.0 points
- Accessibility score: Target 9.0+/10
- WCAG AA compliance: Target 100%

**Efficiency:**
- Iterations to target: Target ≤ 5
- Time per iteration: Target < 5 minutes
- Total improvement time: Target < 30 minutes

**Code Quality:**
- No build errors introduced: 100% success
- No test regressions: 100% pass rate
- Code follows patterns: Manual review

### Qualitative Metrics

**User Feedback (Performia Musicians):**
- Improved readability at distance: 5/5 rating
- Better stage visibility: 5/5 rating
- Enhanced usability: 5/5 rating
- Professional polish: 5/5 rating

**Developer Experience:**
- Setup ease: < 5 minutes
- Configuration simplicity: Minimal config needed
- Output clarity: Actionable insights
- Integration smoothness: Zero friction

---

## 10. Future Roadmap

### Phase 1: MVP (Current - Performia Test)
- ✅ Core orchestrator
- ✅ Claude Opus vision integration
- ✅ Claude Sonnet agentic implementation
- ✅ Puppeteer screenshot capture
- ✅ 8-dimension scoring system
- 🎯 Performia test case validation

### Phase 2: CLI & Plugins (Q1 2026)
- [ ] CLI interface (`viztritr init`, `viztritr run`)
- [ ] GPT-4V vision plugin
- [ ] Gemini Pro vision plugin
- [ ] Configuration wizard
- [ ] HTML report generation
- [ ] Screenshot comparison view

### Phase 3: Production Features (Q2 2026)
- [ ] npm package publication
- [ ] GitHub Action integration
- [ ] API server mode
- [ ] Queue system for long-running jobs
- [ ] Rollback/restore functionality
- [ ] Multi-page support

### Phase 4: Ecosystem (Q3 2026)
- [ ] VS Code extension
- [ ] Local model support (LLaVA, CogVLM)
- [ ] Community plugin marketplace
- [ ] Design system adherence checks
- [ ] A/B testing support
- [ ] Figma integration

---

## 11. Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API rate limits | High | Medium | Implement caching, rate limiting |
| Code generation errors | High | Medium | Backup system, rollback capability |
| Vision analysis accuracy | Medium | Low | Multiple model validation |
| Performance regression | High | Low | Automated testing, monitoring |

### Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performia-specific issues | Low | Medium | Test on multiple projects |
| Subjective scoring | Medium | Medium | Validate with designers |
| Over-optimization | Low | Low | Stop at target, don't over-iterate |

---

## 12. Appendix

### A. Performia Frontend Tech Stack
- **Framework:** React 19.1.1 + TypeScript 5.8.2
- **Build:** Vite 6.2.0
- **Styling:** Tailwind CSS 4.1.13
- **State:** Immer 10.1.3
- **Dev Server:** http://localhost:5001

### B. VIZTRTR Configuration for Performia

```typescript
const performiaConfig: VIZTRITRConfig = {
  projectPath: '/Users/danielconnolly/Projects/Performia/frontend',
  frontendUrl: 'http://localhost:5001',
  targetScore: 8.5,
  maxIterations: 5,

  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,

  screenshotConfig: {
    width: 1440,
    height: 900,
    fullPage: false,
    selector: '#root' // Performia root element
  },

  outputDir: '/Users/danielconnolly/Projects/Performia/viztritr-output'
};
```

### C. Expected Performia Improvements

Based on initial analysis, expected focus areas:
1. **Typography Enhancement**
   - Increase lyric font size for stage distance readability
   - Improve chord label hierarchy
   - Optimize line-height for dense musical notation

2. **Color & Contrast**
   - Enhance three-state lyric colors (gray → cyan → white)
   - Improve chord diagram visibility
   - Optimize for stage lighting conditions

3. **Visual Hierarchy**
   - Better separation between teleprompter and controls
   - Clearer section headers in blueprint view
   - Improved focus states for interactive elements

4. **Accessibility**
   - Add ARIA labels for all controls
   - Implement comprehensive keyboard navigation
   - Ensure screen reader compatibility for musicians with visual impairments

5. **Component Consistency**
   - Standardize button styles across views
   - Unify spacing patterns (8px grid)
   - Consistent interaction states

---

**End of PRD**

*VIZTRTR: Because great design shouldn't require great designers*
