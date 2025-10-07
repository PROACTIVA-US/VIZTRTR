# VIZTRTR Project Memory

**Last Updated: 2025-10-06 21:00:00**
**Project:** VIZTRTR - Visual Iteration Orchestrator
**Repository:** <https://github.com/PROACTIVA-US/VIZTRTR.git>

---

## Project Overview

VIZTRTR is an autonomous UI/UX improvement system that uses AI vision models (Claude Opus 4)
to analyze web interfaces, generates improvement recommendations, and uses AI agents
(Claude Sonnet 4 with extended thinking) to implement code changes automatically until
production-ready quality is achieved (8.5+/10 score).

---

## Recent Development Sessions

### Session: September 30, 2025 - Initial Setup & Performia Integration

**What was accomplished:**

1. ✅ Initialized project with `/init` command
2. ✅ Created comprehensive CLAUDE.md for future sessions
3. ✅ Integrated Claude Agent SDK with agentic architecture:
   - Claude Sonnet 4 with extended thinking (2000 token budget)
   - Automatic file detection and code generation
   - Backup system with timestamped files
   - Structured diff generation
4. ✅ Set up best practices tooling:
   - ESLint 9 with TypeScript
   - Prettier for formatting
   - Jest + ts-jest for testing
   - GitHub Actions CI/CD pipeline
5. ✅ Created Performia test case integration:
   - Complete PRD (VIZTRTR_PRD.md)
   - Test guide (PERFORMIA_TEST_GUIDE.md)
   - Integration summary (PERFORMIA_INTEGRATION_SUMMARY.md)
   - Test configuration (performia.config.ts)
   - Automated test runner (test-performia.ts)

**Key decisions made:**

- Chose Claude Opus 4 for vision analysis (best UI/UX understanding)
- Chose Claude Sonnet 4 for implementation (best code generation with extended thinking)
- Set 8-dimension scoring system with weighted composite score
- Accessibility weighted highest (1.3×) - critical for inclusive design
- Target score: 8.5/10 for production-ready quality
- Max iterations: 5 per run (balance between thoroughness and efficiency)

**Architecture established:**

```text
Capture (Puppeteer) → Analyze (Opus Vision) → Implement (Sonnet Agent) →
Evaluate (8D Rubric) → Repeat
```

**Current status:**

- ✅ Core system built and tested
- ✅ Performia integration configured
- ✅ Ready for first real-world test
- 🎯 Next: Run test on Performia Living Chart

---

## Test Case: Performia Living Chart

**Project:** Music performance platform with interactive "Living Chart" UI
**Location:** `/Users/danielconnolly/Projects/Performia/frontend`
**URL:** <http://localhost:5001>
**Tech Stack:** React 19 + TypeScript 5.8 + Tailwind CSS 4 + Vite

**Design Challenges:**

1. Typography readability at performance distance (6-10 feet)
2. Color contrast for stage lighting conditions
3. Visual hierarchy across dense musical information
4. High accessibility requirements (live performance)
5. Component consistency across multiple views
6. Smooth animations without impacting audio sync

**Success Criteria:**

- Composite score: 8.5+/10
- Typography score: 8.5+/10 (critical for stage)
- Accessibility score: 9.0+/10 (critical for inclusivity)
- WCAG AA compliance: 100%
- ≤ 5 iterations to target
- < 30 minutes total duration

**Expected Improvements:**

1. Increase lyric font size (3rem → 4-5rem) for stage readability
2. Enhance three-state lyric color contrast (gray → cyan → white)
3. Add visual separation between teleprompter and controls
4. Implement comprehensive ARIA labels and keyboard navigation
5. Standardize spacing to 8px grid system

---

## Key Files & Structure

### Core System

- `src/orchestrator.ts` - Main iteration engine
- `src/plugins/vision-claude.ts` - Claude Opus vision analysis
- `src/plugins/implementation-claude.ts` - Claude Sonnet agent with extended thinking
- `src/plugins/capture-puppeteer.ts` - Screenshot capture
- `src/types.ts` - TypeScript interfaces

### Configuration

- `performia.config.ts` - Performia test configuration
- `test-performia.ts` - Automated test runner
- `.env` - API keys (ANTHROPIC_API_KEY)

### Documentation

- `CLAUDE.md` - Guide for future Claude Code sessions
- `VIZTRTR_PRD.md` - Complete product requirements
- `PERFORMIA_TEST_GUIDE.md` - Testing instructions
- `PERFORMIA_INTEGRATION_SUMMARY.md` - Integration overview
- `SETUP_SUMMARY.md` - Initial setup summary

### Scripts

```bash
npm run build              # Compile TypeScript
npm run test              # Run Jest tests
npm run test:performia    # Run VIZTRTR on Performia
npm run lint              # ESLint check
npm run format            # Prettier format
```

---

## Important Context

### 8-Dimension Scoring System

| Dimension               | Weight   | Focus                                               |
| ----------------------- | -------- | --------------------------------------------------- |
| Visual Hierarchy        | 1.2×     | Element priority, size scaling, contrast            |
| Typography              | 1.0×     | Readability, hierarchy, line height                 |
| Color & Contrast        | 1.0×     | WCAG compliance, semantic usage                     |
| Spacing & Layout        | 1.1×     | 8px grid, breathing room, alignment                 |
| Component Design        | 1.0×     | Button states, touch targets, consistency           |
| Animation & Interaction | 0.9×     | Smooth transitions, micro-interactions              |
| **Accessibility**       | **1.3×** | **⭐ ARIA, keyboard nav, focus (highest priority)** |
| Overall Aesthetic       | 1.0×     | Professional polish, modern feel, cohesion          |

**Formula:** `Composite = Σ(dimension_score × weight) / Σ(weights)`

### Agent Workflow

**Implementation Agent (Claude Sonnet 4):**

1. Receives design recommendation from vision analysis
2. Uses extended thinking (2000 tokens) to plan implementation
3. Automatically identifies which files need modification
4. Generates code following project patterns
5. Creates timestamped backups before changes
6. Applies changes and generates structured diffs
7. Returns Changes object with file modifications

**Output Structure:**

```text
viztritr-output/
├── iteration_0/
│   ├── before.png
│   ├── after.png
│   ├── design_spec.json
│   ├── changes.json
│   └── evaluation.json
├── iteration_N/
├── report.json
└── REPORT.md
```

---

## Environment & Dependencies

### Required

- Node.js 18+
- Anthropic API key (Claude Opus 4 + Sonnet 4 access)
- Running frontend dev server for testing

### Key Dependencies

- `@anthropic-ai/sdk@^0.65.0` - Latest Anthropic SDK
- `puppeteer@^23.0.0` - Screenshot capture
- `sharp@^0.33.0` - Image processing
- TypeScript 5.6
- ESLint 9 + Prettier

---

## Known Issues & Considerations

### Current Limitations

1. Implementation agent uses placeholder in orchestrator - needs actual Sonnet API integration
2. No rollback mechanism yet (relies on backups)
3. Single iteration testing only (not validated multi-iteration)
4. No CLI interface yet (planned for Phase 2)
5. Screenshot capture assumes single viewport (no responsive testing)

### Future Enhancements

- CLI interface (`viztritr init`, `viztritr run`)
- Additional AI model plugins (GPT-4V, Gemini)
- Multi-page support
- GitHub Action integration
- VS Code extension
- Local model support (LLaVA)

---

## Testing Protocol

### Pre-flight Checks

1. Frontend dev server running (curl <http://localhost:5001>)
2. ANTHROPIC_API_KEY in .env
3. VIZTRTR built (npm run build)
4. Output directory writable

### Running Test

```bash
# Terminal 1
cd /Users/danielconnolly/Projects/Performia/frontend
npm run dev

# Terminal 2
cd /Users/danielconnolly/Projects/VIZTRTR
npm run test:performia
```

### Validation Steps

1. Check scores in report.json
2. Compare before/after screenshots
3. Review changes.json for code modifications
4. Test Performia for regressions
5. Run accessibility audit
6. Get musician feedback (if available)

---

## Next Actions

### Immediate

- [ ] Run first Performia test
- [ ] Validate results
- [ ] Document findings
- [ ] Refine based on learnings

### Short-term

- [ ] Test on Blueprint view
- [ ] Test on Settings panel
- [ ] Create case study
- [ ] Optimize iteration speed

### Long-term

- [ ] Build CLI
- [ ] Add more plugins
- [ ] Publish to npm
- [ ] Create documentation site

---

## Important Reminders

1. **Always backup** - Implementation agent creates timestamped backups
2. **Validate manually** - AI suggestions should be reviewed
3. **Test thoroughly** - Check for regressions after changes
4. **Accessibility first** - Highest weighted dimension for good reason
5. **Iterative approach** - Don't expect perfection in one cycle
6. **Context matters** - Performia's stage use case drives design priorities

---

**This memory file should be updated after each significant development session.**

### October 04, 2025 - Project Wizard Enhancements (PR #7)

- Branch: feat/project-wizard-improvements
- Status: ✅ Complete - PR open for review
- **Changes**:
  1. Streamlined workflow (3 steps → 2 steps)
  2. Backend `/api/projects/detect-url` endpoint for smart URL detection
  3. Functional Browse button with webkitdirectory API
  4. Auto-suggest project name from path
  5. Save project without requiring immediate analysis
- **Commits**: c0965e4, 2b4fb3f, 2bd5a36
- **PR**: <https://github.com/PROACTIVA-US/VIZTRTR/pull/7>
- **Reviewer**: PerformanceSuite
- **Services Active**:
  - Performia: <http://localhost:5001>
  - VIZTRTR UI: <http://localhost:5173>
  - VIZTRTR API: <http://localhost:3001>

### October 04, 2025 - Error Handling & Recovery System

- Branch: main
- Status: ✅ Complete
- **What was accomplished:**
  1. ✅ Added animated progress indicators to PRD analysis screen
     - Bouncing brain emoji animation
     - Shimmer effect on progress bar (gradient background-position animation)
  2. ✅ Implemented comprehensive error handling for PRD analysis
     - 2-minute timeout detection with AbortController
     - Network error detection and specific error messages
     - Pre-flight server health check before starting analysis
  3. ✅ Created user-facing error recovery UI
     - New `analyzing-error` step with helpful error screen
     - Troubleshooting tips for common issues
     - Retry button to attempt analysis again
     - Go Back button to modify PRD
  4. ✅ Enhanced server health endpoints
     - `/health` - Basic health check with uptime and memory usage
     - `/api/health-detailed` - Component-level health status (DB, Anthropic API, memory)
- **Files modified:**
  - `ui/frontend/src/components/ProjectOnboarding.tsx:17-24,89-182,349-413`
  - `ui/server/src/index.ts:85-112`
- **Key improvements:**
  - Users never see stuck loading screens - always get clear error messages
  - Proactive health checking prevents wasted time on dead servers
  - Specific error messages guide users to solutions
  - Retry mechanism allows quick recovery from transient failures
- **Next steps:**
  - Consider adding automatic server restart mechanism
  - Monitor error patterns in production to improve troubleshooting tips

### October 06, 2025 - Backend Process Management & Port Auto-Detection

- Branch: main
- Status: ✅ Complete
- **What was accomplished:**
  1. ✅ Implemented backend server process manager system
     - Created `ServerProcessManager` class to manage backend server lifecycle
     - Added manager server on port 3002 with REST API for server control
     - Supports start, stop, restart operations with graceful shutdown
     - PID tracking and process health monitoring
  2. ✅ Enhanced SystemStatus component with backend control
     - Detects connection errors automatically
     - Shows "Start Backend" button when offline, "Restart Backend" when online
     - Communicates with manager server (port 3002) to control backend (port 3001)
     - Real-time status polling every 10 seconds
  3. ✅ Fixed port auto-detection for project frontends
     - Fixed `/api/projects/detect-url` to prioritize vite.config port over running servers
     - Now correctly detects port 5001 for Performia, port 5173 for VIZTRTR
     - Returns configured port immediately when found in vite.config
     - Added visual indicators showing auto-detected URL with override warnings
  4. ✅ Enhanced RunPage with server management
     - Detects connection errors (ERR_CONNECTION_REFUSED, etc.)
     - Shows "Start Project Server" button for failed runs with connection errors
     - Handles runs with missing project associations gracefully
- **Files created:**
  - `ui/server/src/services/serverProcessManager.ts` - Server lifecycle management
  - `ui/server/src/manager.ts` - Manager server entry point (port 3002)
  - `ui/server/MANAGER_README.md` - Manager documentation
  - `ui/USAGE.md` - Complete usage guide
- **Files modified:**
  - `ui/server/package.json:8` - Added `manager` script
  - `ui/frontend/src/components/SystemStatus.tsx:72-150` - Backend control via manager
  - `ui/frontend/src/pages/RunPage.tsx:13-157` - Server management for failed runs
  - `ui/server/src/routes/projects.ts:230-259,880-950` - Fixed port detection, added detect-port endpoint
  - `ui/frontend/src/components/ProjectOnboarding.tsx:54,147-148,818-839` - Auto-detection UI improvements
- **Key improvements:**
  - Users can now start/restart backend from UI without terminal access
  - Port auto-detection correctly reads project configuration (vite.config)
  - Clear visual feedback when URL is auto-detected vs manually overridden
  - Failed runs now offer one-click server start for connection errors
- **Architecture:**
  - Manager Server (3002) → Controls → Backend Server (3001)
  - Frontend (5173) → Monitors → Backend (3001) via /health endpoint
  - Frontend → Controls → Manager (3002) for start/stop/restart
- **Next steps:**
  - Consider PM2 or systemd for production deployments
  - Add authentication for manager endpoints in production
  - Monitor server start/stop patterns to optimize defaults

### October 03, 2025 - Migration to unified session system v3.0

- Branch: main
- Status: ✅ Passed
