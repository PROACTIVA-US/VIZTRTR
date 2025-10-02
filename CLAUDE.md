# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIZTRTR is an autonomous UI/UX improvement system that uses AI vision models to analyze, improve, and evaluate web interfaces through iterative cycles. The goal is to automatically improve designs until they reach production-ready quality (8.5+/10 score).

## Project Structure

```
VIZTRTR/
├── src/
│   ├── core/                 # Core orchestrator, types, exports
│   ├── plugins/              # Vision, capture, implementation plugins
│   ├── agents/               # AI agents (Orchestrator, Reflection, Verification)
│   └── memory/               # Persistent memory system
├── projects/                 # Project-specific configurations
│   └── performia/           # Example project
├── examples/                 # Demo scripts
├── tests/unit/              # Unit tests
├── docs/
│   ├── architecture/        # Architecture docs
│   ├── guides/             # How-to guides
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
```

### Code Quality
```bash
npm run lint          # Lint TypeScript files
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format with Prettier
npm run format:check  # Check formatting
npm run precommit     # Run all checks
```

### Setup
```bash
npm install           # Install dependencies
# Create .env file with: ANTHROPIC_API_KEY=sk-ant-...
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
- `VerificationAgent.ts` - Validates file changes, checks for errors

**Memory** (`src/memory/`)
- `IterationMemoryManager.ts` - Persistent learning, tracks attempts/outcomes

**Plugins** (`src/plugins/`)
- `vision-claude.ts` - Claude Opus 4 vision analysis
- `implementation-claude.ts` - Claude Sonnet 4 code implementation (extended thinking)
- `capture-puppeteer.ts` - Headless Chrome screenshot capture

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
```
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
- ✅ Multi-agent architecture (Orchestrator, Reflection, Verification)
- ✅ Persistent memory system with learning
- ✅ Claude Opus 4 vision integration
- ✅ Claude Sonnet 4 implementation with extended thinking (2000 token budget)
- ✅ Puppeteer screenshot capture
- ✅ 8-dimension scoring system
- ✅ Automatic file detection and backup
- ✅ Structured diff generation
- ✅ Comprehensive reporting (JSON + Markdown)
- ✅ Best practices tooling (ESLint, Prettier, Jest, TypeScript)
- ✅ Clean project structure with organized directories

### Agent-Based Implementation
The code implementation agent (`src/plugins/implementation-claude.ts`) uses:
- **Claude Sonnet 4** with extended thinking for complex reasoning
- **2000 token thinking budget** to analyze design changes
- **Automatic file detection** - identifies which files need modification
- **Backup system** - creates timestamped backups before changes
- **Diff generation** - structured diffs for all changes

The agent workflow:
1. Receives design recommendation from vision analysis
2. Uses extended thinking to plan the implementation
3. Identifies target files and generates code
4. Creates backups of existing files
5. Applies changes and generates diffs
6. Returns structured `Changes` object

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

### Code Quality
Before committing:
```bash
npm run precommit  # Runs lint, format check, typecheck
```

## Important File Paths

When writing code that references files:
- Core types: `import { Type } from '../../src/core/types'`
- Orchestrator: `import { VIZTRTROrchestrator } from '../../src/core/orchestrator'`
- From agents to types: `import { Type } from '../core/types'`
- From plugins to types: `import { Type } from '../core/types'`

## Next Development Phases

**Phase 1 (Complete)**: Multi-agent MVP with memory system
**Phase 2 (Next)**: Enhanced learning, CLI interface, additional plugins
**Phase 3**: Production features (API server, queue, caching)
**Phase 4**: Ecosystem (GitHub Action, VS Code extension, npm package)
