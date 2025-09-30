# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIZTRITR is an autonomous UI/UX improvement system that uses AI vision models to analyze, improve, and evaluate web interfaces through iterative cycles. The goal is to automatically improve designs until they reach production-ready quality (8.5+/10 score).

## Key Commands

### Development
```bash
npm run build          # Compile TypeScript to dist/
npm run dev           # Watch mode for development
npm run test          # Run Jest tests
npm run demo          # Build and run demo script
```

### Setup
```bash
npm install           # Install dependencies
cp .env.example .env  # Create environment file (add ANTHROPIC_API_KEY)
```

## Architecture

### Core Workflow
The orchestrator runs an iterative loop:
1. **Capture** - Screenshot the UI (Puppeteer)
2. **Analyze** - AI vision analyzes design quality (Claude Opus)
3. **Implement** - Apply code changes (currently placeholder, planned: Claude Sonnet)
4. **Evaluate** - Score the result against 8 design dimensions
5. **Repeat** - Continue until target score (8.5+/10) or max iterations reached

### Key Components

**Orchestrator** (`src/orchestrator.ts`)
- Main iteration loop logic
- Coordinates all plugins
- Generates reports (JSON + Markdown)
- Manages output directory structure

**Type System** (`src/types.ts`)
- Defines all interfaces: `VIZTRITRConfig`, `Screenshot`, `DesignSpec`, `EvaluationResult`, `IterationReport`
- Plugin interface `VIZTRITRPlugin` for extensibility

**Plugins** (`src/plugins/`)
- `vision-claude.ts` - Claude Opus 4 vision analysis
- `capture-puppeteer.ts` - Headless Chrome screenshot capture
- Future: GPT-4V, Gemini, Claude Sonnet implementation agent

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
│   ├── before.png
│   ├── after.png
│   ├── design_spec.json
│   ├── changes.json
│   └── evaluation.json
├── iteration_N/
├── report.json
└── REPORT.md
```

## Important Implementation Notes

### Current State (MVP)
- ✅ Core orchestrator complete
- ✅ Claude Opus vision integration with vision API
- ✅ Claude Sonnet implementation agent with extended thinking
- ✅ Puppeteer screenshot capture
- ✅ 8-dimension scoring system
- ✅ Best practices tooling (ESLint, Prettier, Jest, TypeScript)
- ✅ CI/CD pipeline (GitHub Actions)

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
To add a new plugin, implement the `VIZTRITRPlugin` interface:
- `type`: 'vision' | 'implementation' | 'evaluation' | 'capture'
- Implement relevant method(s): `analyzeScreenshot`, `implementChanges`, `scoreDesign`, or `captureScreenshot`

### Configuration
Main config object (`VIZTRITRConfig`) controls:
- `projectPath` - Target frontend project
- `frontendUrl` - Running dev server URL
- `targetScore` - Quality threshold (default: 8.5)
- `maxIterations` - Safety limit (default: 5)
- `visionModel` - Which AI vision model to use
- `anthropicApiKey` - Required for Claude models

## Development Guidelines

### When Adding Features
- Update type definitions in `src/types.ts` first
- Plugins should be self-contained in `src/plugins/`
- All async operations should have proper error handling
- Output artifacts go to configured `outputDir`

### Testing Workflow
1. Ensure a frontend dev server is running (e.g., `http://localhost:5001`)
2. Set `ANTHROPIC_API_KEY` in `.env`
3. Run `npm run demo` to test the full cycle
4. Check `viztritr-output/` for results

### File Modifications
When implementing code changes:
- Always backup original files before modification
- Use structured diffs (not whole file replacements when possible)
- Include rollback capability
- Wait for rebuild (3 second delay currently for hot-reload)

## Next Development Phases

**Phase 1 (Current)**: MVP with Claude Opus vision
**Phase 2**: CLI interface + plugin system
**Phase 3**: Production features (API server, queue, caching)
**Phase 4**: Ecosystem (GitHub Action, VS Code extension, npm package)
