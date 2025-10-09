# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIZTRTR is an autonomous UI/UX improvement system that uses AI vision models to analyze, improve,
and evaluate web interfaces through iterative cycles. The goal is to automatically improve designs
until they reach production-ready quality (8.5+/10 score).

## Project Structure

```text
VIZTRTR/
├── src/
│   ├── core/                 # Core orchestrator, types, exports, validation
│   ├── plugins/              # Vision, capture, implementation, video plugins
│   ├── agents/               # AI agents (Orchestrator, Reflection, specialized)
│   │   └── specialized/     # ControlPanel, Teleprompter agents
│   ├── memory/               # Persistent memory system
│   ├── tools/                # Video analyzer and other tools
│   ├── utils/                # Grep helpers and utilities
│   └── __tests__/            # Integration tests
├── ui/
│   ├── frontend/             # React + Vite + Tailwind web UI
│   ├── server/               # Express API server
│   └── shared/               # Shared TypeScript types
├── projects/                 # Project-specific configurations
│   ├── performia/           # Performia integration project
│   └── viztrtr-ui/          # Self-improvement UI project
├── examples/                 # Demo scripts (including video analysis)
├── tests/unit/              # Unit tests
├── docs/
│   ├── architecture/        # Architecture docs
│   ├── guides/             # How-to guides (including video processing)
│   └── status/             # Status reports
└── dist/                   # Compiled output
```

## Key Commands

### Development

```bash
npm run build          # Compile TypeScript to dist/
npm run dev           # Watch mode for development
npm run typecheck     # Type-check without compiling
npm run test          # Run Jest unit tests
npm run test:coverage # Run tests with coverage
```

### Testing Projects

```bash
npm run demo              # Run basic demo
npm run test:performia    # Test on Performia project
npm run test:viztrtr-ui   # Test on VIZTRTR's own UI
```

### UI Development

```bash
# Backend server (port 3001)
cd ui/server && npm install && npm run dev

# Frontend (port 5173) - in new terminal
cd ui/frontend && npm install && npm run dev
```

### Code Quality

```bash
npm run lint          # Lint TypeScript files
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format with Prettier
npm run format:check  # Check formatting
npm run precommit     # Run all checks (lint + format + typecheck)
```

### Maintenance

```bash
npm run maintain         # Full maintenance (clean, docs, quality, git, security)
npm run maintain:quick   # Quick maintenance (clean, quality:fix, git:status)
npm run maintain:deep    # Deep maintenance (includes deps:check)
npm run clean:all        # Clean dist, coverage, logs, temp files
npm run docs:update      # Generate API docs and lint markdown
npm run security:check   # Run npm audit with moderate level
npm run deps:check       # Check for dependency updates (ncu)
```

### Setup

```bash
npm install           # Install dependencies
# Create .env file with: ANTHROPIC_API_KEY=sk-ant-...
npm run prepare       # Install git hooks (lefthook)
```

## Architecture

### Core Workflow

The orchestrator runs an iterative loop with AI agents and persistent memory:

1. **Capture** - Screenshot the UI (Puppeteer)
2. **Analyze** - Claude Opus 4 analyzes design quality with memory context
3. **Orchestrate** - OrchestratorAgent selects improvement (filters failed attempts)
4. **Implement** - Claude Sonnet 4 applies code changes (extended thinking)
5. **Verify** - VerificationAgent validates changes
6. **Evaluate** - Score against 8 design dimensions
7. **Reflect** - ReflectionAgent records outcomes to memory
8. **Repeat** - Continue until target score (8.5+/10) or max iterations

### Key Components

**Core** (`src/core/`)

- `orchestrator.ts` - Main coordinator, iteration loop
- `types.ts` - All TypeScript interfaces and types
- `index.ts` - Public API exports

**Agents** (`src/agents/`)

- `OrchestratorAgent.ts` - Selects improvements, filters failed attempts
- `ReflectionAgent.ts` - Analyzes outcomes, records to memory
- `InterfaceValidationAgent.ts` - Cross-file interface validation
- `specialized/ControlPanelAgent.ts` - UI state management
- `specialized/TeleprompterAgent.ts` - Video analysis coordination

**Memory** (`src/memory/`)

- `IterationMemoryManager.ts` - Persistent learning, tracks attempts/outcomes

**Plugins** (`src/plugins/`)

- `vision-claude.ts` - Claude Opus 4 vision analysis
- `implementation-claude.ts` - Claude Sonnet 4 code implementation (extended thinking, scope constraints)
- `capture-puppeteer.ts` - Headless Chrome screenshot capture
- `vision-video-claude.ts.skip` - Video frame analysis (planned)
- `video-processor.ts.skip` - FFmpeg video frame extraction (planned)

**Validation** (`src/core/`)

- `validation.ts` - Cross-file interface validation logic

**Tools** (`src/tools/`)

- `video-analyzer.ts.skip` - Video analysis tools (planned)

**Utils** (`src/utils/`)

- `grep-helper.ts` - Code search utilities

### 8-Dimension Scoring System

Each UI is evaluated on weighted dimensions:

1. Visual Hierarchy (1.2×)
2. Typography (1.0×)
3. Color & Contrast (1.0×)
4. Spacing & Layout (1.1×)
5. Component Design (1.0×)
6. Animation & Interaction (0.9×)
7. Accessibility (1.3×) - Highest priority
8. Overall Aesthetic (1.0×)

**Composite Score** = weighted average of all dimensions

### Output Structure

```text
viztritr-output/
├── iteration_0/
│   ├── before.png         # Screenshot before changes
│   ├── after.png          # Screenshot after changes
│   ├── design_spec.json   # Vision analysis
│   ├── changes.json       # Code changes with diffs
│   └── evaluation.json    # 8-dimension scores
├── iteration_N/
├── memory/
│   └── iteration-memory.json  # Persistent learning
├── report.json            # Full report
└── REPORT.md              # Human-readable summary
```

## Important Implementation Notes

### Current State

**Completed Features:**

- ✅ Core orchestrator with iteration loop
- ✅ Multi-agent architecture (Orchestrator, Reflection, specialized agents)
- ✅ Persistent memory system with learning
- ✅ Claude Opus 4 vision integration
- ✅ Claude Sonnet 4 implementation with extended thinking (2000 token budget)
- ✅ Puppeteer screenshot capture
- ✅ 8-dimension scoring system
- ✅ Automatic file detection and backup with timestamps
- ✅ Structured diff generation
- ✅ Comprehensive reporting (JSON + Markdown)
- ✅ Best practices tooling (ESLint, Prettier, Jest, TypeScript)
- ✅ Clean project structure with organized directories
- ✅ **Web UI** - React + Express full-stack interface
- ✅ **Video Processing** - Frame extraction and analysis (planned integration)
- ✅ **Cross-File Validation** - Interface validation across TypeScript files
- ✅ **Scope Constraints** - Security controls for file modifications
- ✅ **Agent SDK Integration** - Claude Agent SDK with tools

### ⚠️ IMPORTANT: Use V2 Agents Only

**PRODUCTION READY:** ControlPanelAgentV2 with constrained tools architecture
**DEPRECATED:** V1 agents (ControlPanelAgent, implementation-claude.ts)

**Why V2:**

- ✅ 83% reduction in tool calls (12 → 2)
- ✅ 100% success rate vs 0-17% for V1
- ✅ Surgical 2-line changes vs 60-604 line rewrites
- ✅ Hard constraints via tools (agent cannot rewrite files)
- ✅ Line hint optimization eliminates blind search

**Files:**

- `src/agents/specialized/ControlPanelAgentV2.ts` - ✅ USE THIS
- `src/agents/specialized/ControlPanelAgent.ts` - ❌ DEPRECATED (V1)
- `src/plugins/implementation-claude.ts` - ❌ DEPRECATED (V1)
- `src/tools/MicroChangeToolkit.ts` - ✅ V2 constrained tools
- `src/utils/line-hint-generator.ts` - ✅ V2 optimization

### V2 Agent Architecture with Two-Phase Workflow (PRODUCTION DEFAULT)

**Two-Phase Workflow** (Production Ready - 100% Success Rate):

**Phase 1: Discovery** - `DiscoveryAgent` analyzes files and creates precise change plans

- Read-only file access
- Identifies exact line numbers and current values
- Outputs structured JSON with all change details
- Validates line content before creating plan

**Phase 2: Execution** - `ControlPanelAgentV2` executes plans with constrained tools

- Receives precise change plan from Discovery
- Fallback search (±5 lines) for robustness
- Whitespace-insensitive line matching
- Uses constrained tools for surgical changes

**Available Constrained Tools:**

- **updateClassName** - Change exactly one className on one line
- **updateStyleValue** - Change single CSS property value
- **updateTextContent** - Change text content on one line
- **appendToClassName** - Add new classes to existing className

**Workflow:**

1. **OrchestratorAgent** routes recommendations to appropriate specialist
2. **DiscoveryAgent** reads files and creates change plan (Phase 1)
3. **ControlPanelAgentV2** executes change plan with tools (Phase 2)
4. Fallback search provides safety for edge cases
5. Each tool call = exactly 1 atomic change
6. Agent physically cannot rewrite entire files
7. 100% traceability and rollback capability

**Performance (Validated Oct 8, 2025):**

- Implementation rate: **100%** (target: ≥80%) ✅
- Duration: 30-36s per recommendation ✅
- Failed changes: 0 ✅
- Line number accuracy: **100%** ✅
- Surgical precision: 2-line changes ✅

**Key Files:**

- `src/agents/OrchestratorAgent.ts` - Routes to two-phase workflow
- `src/agents/specialized/DiscoveryAgent.ts` - Phase 1 (analysis)
- `src/agents/specialized/ControlPanelAgentV2.ts` - Phase 2 (execution)
- `src/tools/MicroChangeToolkit.ts` - Constrained tools
- `src/utils/line-hint-generator.ts` - Optimization

### V1 Agent Implementation (DEPRECATED - DO NOT USE)

The legacy code implementation agent (`src/plugins/implementation-claude.ts`) uses:

- **Claude Sonnet 4** with extended thinking for complex reasoning
- **2000 token thinking budget** to analyze design changes
- **Automatic file detection** - identifies which files need modification
- **Backup system** - creates timestamped backups before changes
- **Diff generation** - structured diffs for all changes
- **Scope constraints** - security controls to prevent unauthorized file access
- **Path validation** - absolute/relative path resolution with safety checks

The agent workflow:

1. Receives design recommendation from vision analysis
2. Uses extended thinking to plan the implementation
3. Validates file paths are within project scope
4. Identifies target files and generates code
5. Creates timestamped backups of existing files
6. Applies changes and generates diffs
7. Returns structured `Changes` object with rollback capability

**Security Features:**

- Whitelist: Only files within `projectPath`
- Blacklist: Prevents modification of `node_modules`, `.git`, `.env`, etc.
- Path traversal prevention
- Automatic validation of all file operations

### Plugin Architecture

To add a new plugin, implement the `VIZTRTRPlugin` interface:

- `type`: 'vision' | 'implementation' | 'evaluation' | 'capture'
- Implement relevant method(s): `analyzeScreenshot`, `implementChanges`, `scoreDesign`, or `captureScreenshot`

### Configuration

Main config object (`VIZTRTRConfig` in `src/core/types.ts`) controls:

- `projectPath` - Absolute path to frontend project
- `frontendUrl` - Running dev server URL
- `targetScore` - Quality threshold (0-10, default: 8.5)
- `maxIterations` - Safety limit (default: 5)
- `visionModel` - 'claude-opus' | 'gpt4v' | 'gemini'
- `implementationModel` - 'claude-sonnet' (currently)
- `anthropicApiKey` - Required for Claude models
- `screenshotConfig` - Width, height, fullPage, selector
- `outputDir` - Where to save results
- `verbose` - Enable detailed logging

## Development Guidelines

### When Adding Features

- Update type definitions in `src/core/types.ts` first
- Core functionality goes in `src/core/`
- Plugins should be self-contained in `src/plugins/`
- Agents go in `src/agents/`
- All async operations must have proper error handling
- Output artifacts go to configured `outputDir`

### When Adding a New Project

1. Create `projects/project-name/` directory
2. Add `config.ts` with `VIZTRTRConfig` object
3. Add `test.ts` with test runner
4. Add npm script: `"test:project-name": "npm run build && node dist/projects/project-name/test.js"`
5. Document in project README or guide

### Testing Workflow

1. Ensure target frontend dev server is running
2. Set `ANTHROPIC_API_KEY` in `.env`
3. Run `npm run build`
4. Run `npm run demo` for basic test
5. Run `npm run test:performia` for full integration test
6. Check output directory for results

### File Organization

- **Source files**: `src/` - Core library code only
- **Project configs**: `projects/` - Project-specific configurations
- **Examples**: `examples/` - Demo and example scripts
- **Tests**: `tests/unit/` - Unit tests
- **Docs**: `docs/` - All documentation
- **Build output**: `dist/` - Compiled JavaScript

### Code Quality & Git Hooks

The project uses **Lefthook** for fast, parallel git hooks:

- **pre-commit**: Runs `lint-staged` (lint + format staged files) and `typecheck`
- **pre-push**: Runs `npm test` and `security:check`
- **commit-msg**: Validates commit message format

Before committing:

```bash
npm run precommit  # Runs lint, format check, typecheck
```

The hooks are installed automatically via `npm run prepare` (runs on `npm install`).

## TypeScript Configuration

**Build settings** (`tsconfig.json`):

- **Target**: ES2022 for modern features
- **Module**: CommonJS for Node.js compatibility
- **Source**: `src/` → **Output**: `dist/`
- **Strict mode**: Enabled for type safety
- **Declaration files**: Generated with source maps
- **Root imports**: Absolute paths not configured (use relative imports)

## Important File Paths

When writing code that references files:

- Core types: `import { Type } from '../../src/core/types'`
- Orchestrator: `import { VIZTRTROrchestrator } from '../../src/core/orchestrator'`
- From agents to types: `import { Type } from '../core/types'`
- From plugins to types: `import { Type } from '../core/types'`

**Note**: All imports use relative paths. The project does not use path aliases.

## Web UI

**Location**: `/Users/danielconnolly/Projects/VIZTRTR/ui/`

### Frontend (React + Vite + Tailwind)

- Real-time agent monitoring dashboard
- Interactive prompt input with streaming responses
- Agent card displays showing status and thinking
- Video upload interface (planned)
- Live build monitoring
- AI evaluation panel with 8-dimension scores

**Tech Stack**: React 18, Vite, Tailwind CSS, Zustand, Server-Sent Events

### Backend (Express + TypeScript)

- `/api/evaluate` - Submit UI analysis requests
- `/api/projects` - List available projects
- `/api/runs/:id` - Get run status and results
- `/api/runs/:id/stream` - SSE stream for real-time updates

**Tech Stack**: Express, TypeScript, SQLite, CORS, @anthropic-ai/sdk, MCP SDK

### Running the UI

```bash
# Terminal 1: Start backend (port 3001)
cd ui/server && npm install && npm run dev

# Terminal 2: Start frontend (port 5173)
cd ui/frontend && npm install && npm run dev

# Access at http://localhost:5173
```

**Production Build:**

```bash
# Build backend
cd ui/server && npm run build && npm start

# Build frontend
cd ui/frontend && npm run build && npm run preview
```

## Video Processing (Planned)

**Files**: `src/plugins/vision-video-claude.ts.skip`, `src/plugins/video-processor.ts.skip`

Features:

- FFmpeg-based frame extraction
- Multi-frame vision analysis
- Temporal UI/UX pattern detection
- Video-specific design recommendations

To enable:

1. Remove `.skip` extensions
2. Install FFmpeg: `brew install ffmpeg`
3. Update config with video options
4. Test with `examples/video-analysis-demo.ts`

## Cross-File Validation

**Files**: `src/core/validation.ts`, `src/agents/InterfaceValidationAgent.ts`

Features:

- TypeScript interface extraction and parsing
- Cross-file interface matching
- Missing interface detection
- Type mismatch reporting
- Automatic fix suggestions

Usage:

```bash
npm run build && node dist/examples/cross-file-validation-demo.js
```

## ESLint Configuration

The project uses **ESLint 9** with flat config (`eslint.config.js`):

- TypeScript parser with project-aware type checking
- Recommended TypeScript rules
- Unused vars warnings (prefix with `_` to ignore)
- Explicit return types disabled
- `any` and non-null assertions: warnings only

Files linted: `src/**/*.ts`
Ignored: `dist/`, `node_modules/`, `*.js` (except config files)

## Troubleshooting

### Common Issues

**TypeScript compilation errors:**

```bash
npm run clean:all && npm install && npm run build
```

**Frontend not accessible:**

- Ensure dev server is running on the configured `frontendUrl`
- Check `projectPath` points to the correct frontend directory
- Verify port is not in use

**API key errors:**

- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check key has sufficient credits at console.anthropic.com
- Ensure `.env` is in project root, not in subdirectories

**Memory/iteration issues:**

- Check `viztritr-output/memory/iteration-memory.json` for stored attempts
- Delete memory file to reset learning (will retry failed approaches)
- Review `verbose: true` in config for detailed logging

**Git hooks not running:**

```bash
npm run prepare  # Reinstall lefthook hooks
```

### Debugging Tips

1. **Enable verbose logging**: Set `verbose: true` in config
2. **Check iteration output**: Review files in `outputDir/iteration_N/`
3. **Inspect agent thinking**: Look at Claude's extended thinking in implementation logs
4. **Review memory state**: Check `iteration-memory.json` for learned patterns
5. **Test single iteration**: Set `maxIterations: 1` for faster debugging

## Next Development Phases

**Phase 1 (Complete)**: Multi-agent MVP with memory system
**Phase 2 (Current)**: Web UI, video processing, cross-file validation
**Phase 3 (Next)**: Production features (authentication, monitoring, caching)
**Phase 4**: Ecosystem (GitHub Action, VS Code extension, npm package)
