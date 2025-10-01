# VIZTRITR - Visual Iteration Orchestrator

**Autonomous UI/UX improvement system powered by AI vision models**

VIZTRITR automatically analyzes, improves, and evaluates web interfaces through iterative cycles until they reach design excellence (8.5+/10 score).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Scoring System](#scoring-system)
- [Creating Your Own Project](#creating-your-own-project)
- [Available Commands](#available-commands)
- [Output Structure](#output-structure)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
- [Requirements](#requirements)
- [Documentation](#documentation)

## Features

- 🔍 **AI Vision Analysis** - Claude Opus 4 analyzes your UI with expert-level design critique
- 🧠 **Memory System** - Learns from past iterations to avoid repeating failed approaches
- 🎯 **Intelligent Agents** - Orchestrator, Reflection, and Verification agents work together
- 📸 **Automated Screenshots** - Puppeteer captures high-quality screenshots
- 🎨 **8-Dimension Scoring** - Evaluates visual hierarchy, typography, accessibility, and more
- 🔄 **Iterative Improvement** - Automatically applies changes and re-evaluates
- 💾 **Persistent Learning** - Saves successful strategies and failed attempts across runs
- 🔌 **Plugin Architecture** - Extensible design for multiple AI models and tools
- 📊 **Detailed Reports** - Comprehensive reports with before/after comparisons

## Project Structure

```
VIZTRITR/
├── src/                          # Core library source code
│   ├── core/                     # Core functionality
│   │   ├── orchestrator.ts       # Main iteration orchestrator
│   │   ├── types.ts              # TypeScript type definitions
│   │   └── index.ts              # Public API exports
│   ├── plugins/                  # Plugin implementations
│   │   ├── vision-claude.ts      # Claude Opus 4 vision analysis
│   │   ├── capture-puppeteer.ts  # Puppeteer screenshot capture
│   │   └── implementation-claude.ts # Claude Sonnet code implementation
│   ├── agents/                   # AI agent system
│   │   ├── OrchestratorAgent.ts  # Coordinates improvements
│   │   ├── ReflectionAgent.ts    # Analyzes iteration outcomes
│   │   └── VerificationAgent.ts  # Validates changes
│   └── memory/                   # Memory & learning system
│       └── IterationMemoryManager.ts # Tracks attempts and outcomes
├── projects/                     # Project-specific configurations
│   └── performia/                # Example: Performia music platform
│       ├── config.ts             # Project configuration
│       └── test.ts               # Project test runner
├── examples/                     # Example implementations
│   └── demo.ts                   # Basic demo script
├── tests/                        # Test suite
│   └── unit/                     # Unit tests
│       └── core/                 # Core functionality tests
├── docs/                         # Documentation
│   ├── architecture/             # Architecture documentation
│   ├── guides/                   # How-to guides
│   └── status/                   # Development status reports
└── dist/                         # Compiled JavaScript output
```

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd VIZTRITR
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from [Anthropic Console](https://console.anthropic.com/).

### 3. Build the Project

```bash
npm run build
```

### 4. Run the Demo

First, ensure you have a frontend dev server running (e.g., at `http://localhost:5001`), then:

```bash
npm run demo
```

This will run VIZTRITR on your local frontend and generate a detailed report.

### 5. Test with Performia Project

To test with the included Performia project configuration:

```bash
# Start Performia backend (port 8000) and frontend (port 5001) first
npm run test:performia
```

## How It Works

```
┌──────────────────┐
│ 1. Capture       │  Puppeteer takes a screenshot of your UI
│    Screenshot    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Analyze       │  Claude Opus 4 analyzes design quality
│    with Vision   │  • Identifies specific issues
│    AI            │  • Provides recommendations
│                  │  • Uses memory of past attempts
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Orchestrate   │  OrchestratorAgent selects best improvement
│    Improvement   │  • Filters failed attempts from memory
│                  │  • Prioritizes high-impact changes
│                  │  • Coordinates with other agents
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Implement     │  Claude Sonnet 4 applies code changes
│    Changes       │  • Uses extended thinking (2000 tokens)
│                  │  • Detects which files to modify
│                  │  • Creates backups automatically
│                  │  • Generates structured diffs
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Verify        │  VerificationAgent checks changes
│    Changes       │  • Validates file modifications
│                  │  • Checks for errors
│                  │  • Waits for rebuild (3s)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Evaluate      │  Scores the new design on 8 dimensions
│    Result        │  • Compares to target score (8.5/10)
│                  │  • Checks if improvement was made
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. Reflect       │  ReflectionAgent analyzes outcome
│                  │  • Records success or failure
│                  │  • Updates memory for next iteration
│                  │  • Identifies patterns
└────────┬─────────┘
         │
         ▼
    Target reached?
    or max iterations?
         │
         NO ─────> Repeat from step 1
         │
        YES
         │
         ▼
┌──────────────────┐
│ 8. Generate      │  Create comprehensive report
│    Report        │  • JSON data (report.json)
│                  │  • Markdown summary (REPORT.md)
│                  │  • All screenshots and diffs
└──────────────────┘
```

## Configuration

Create a configuration object implementing `VIZTRITRConfig`:

```typescript
import { VIZTRITRConfig } from './src/core/types';

const config: VIZTRITRConfig = {
  // Project Settings
  projectPath: '/absolute/path/to/your/frontend/project',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,              // Target quality score (0-10)
  maxIterations: 5,              // Maximum iteration cycles

  // AI Models
  visionModel: 'claude-opus',     // Vision analysis model
  implementationModel: 'claude-sonnet', // Code implementation model

  // API Credentials
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Screenshot Configuration
  screenshotConfig: {
    width: 1440,                  // Viewport width in pixels
    height: 900,                  // Viewport height in pixels
    fullPage: false,              // Capture full scrollable page?
    selector: '#app'              // CSS selector to capture (optional)
  },

  // Output Directory
  outputDir: '/path/to/viztritr-output',

  // Verbose Logging
  verbose: true                   // Enable detailed console output
};
```

## Scoring System

VIZTRITR evaluates UIs across **8 weighted dimensions**:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Visual Hierarchy** | 1.2× | Clear element priority, size scaling, focal points |
| **Typography** | 1.0× | Font sizes, hierarchy, readability, line height |
| **Color & Contrast** | 1.0× | WCAG compliance, color harmony, semantic usage |
| **Spacing & Layout** | 1.1× | White space, 8px grid, breathing room, alignment |
| **Component Design** | 1.0× | Button states, touch targets, consistency |
| **Animation & Interaction** | 0.9× | Smooth transitions, micro-interactions, feedback |
| **Accessibility** | 1.3× | **⭐ Highest priority** - ARIA, keyboard nav, focus states |
| **Overall Aesthetic** | 1.0× | Professional polish, modern feel, visual cohesion |

**Composite Score Formula:**
```
Score = (Σ dimension_score × weight) / (Σ weights)
```

**Target:** 8.5+/10 for production-ready quality

Each dimension is scored 0-10 with specific criteria. Accessibility has the highest weight (1.3×) because it's critical for user experience and legal compliance.

## Creating Your Own Project

To use VIZTRITR on your own project:

### 1. Create Project Directory

```bash
mkdir -p projects/my-project
```

### 2. Create Configuration File

Create `projects/my-project/config.ts`:

```typescript
import { VIZTRITRConfig } from '../../src/core/types';
import * as dotenv from 'dotenv';

dotenv.config();

export const myProjectConfig: VIZTRITRConfig = {
  projectPath: '/absolute/path/to/my-frontend',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,
  maxIterations: 5,
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  screenshotConfig: {
    width: 1440,
    height: 900,
    fullPage: false,
    selector: '#root' // Adjust to your app's root element
  },
  outputDir: '/path/to/output',
  verbose: true
};

export default myProjectConfig;
```

### 3. Create Test Runner

Create `projects/my-project/test.ts`:

```typescript
import { VIZTRITROrchestrator } from '../../src/core/orchestrator';
import myProjectConfig from './config';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🎨 VIZTRITR - My Project');
  console.log('='.repeat(70));

  // Validate API key
  if (!myProjectConfig.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found');
    process.exit(1);
  }

  // Check frontend is running
  try {
    const response = await fetch(myProjectConfig.frontendUrl);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    console.log('✅ Frontend is accessible\n');
  } catch (error) {
    console.error('❌ Frontend is not running');
    console.error(`   Please start: ${myProjectConfig.frontendUrl}`);
    process.exit(1);
  }

  // Run VIZTRITR
  const orchestrator = new VIZTRITROrchestrator(myProjectConfig);
  const report = await orchestrator.run();

  // Print results
  console.log('\n📊 Results:');
  console.log(`   Starting Score: ${report.startingScore.toFixed(1)}/10`);
  console.log(`   Final Score: ${report.finalScore.toFixed(1)}/10`);
  console.log(`   Improvement: +${report.improvement.toFixed(1)}`);
  console.log(`   Iterations: ${report.totalIterations}`);
  console.log(`   Report: ${report.reportPath}\n`);

  process.exit(report.targetReached ? 0 : 1);
}

main();
```

### 4. Add npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "test:my-project": "npm run build && node dist/projects/my-project/test.js"
  }
}
```

### 5. Run Your Test

```bash
npm run test:my-project
```

## Available Commands

```bash
# Development
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode for development
npm run typecheck      # Type-check without emitting files

# Testing
npm run test           # Run Jest unit tests
npm run test:coverage  # Run tests with coverage report
npm run test:performia # Run full test on Performia project
npm run demo           # Run basic demo script

# Code Quality
npm run lint           # Lint all TypeScript files
npm run lint:fix       # Fix linting issues automatically
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm run precommit      # Run all checks (lint + format + typecheck)
```

## Output Structure

After running VIZTRITR, check your configured `outputDir`:

```
viztritr-output/
├── iteration_0/
│   ├── before.png              # Screenshot before changes
│   ├── after.png               # Screenshot after changes
│   ├── design_spec.json        # AI vision analysis
│   ├── changes.json            # Code changes applied
│   └── evaluation.json         # 8-dimension scoring results
├── iteration_1/
│   └── [same structure]
├── iteration_N/
│   └── [same structure]
├── memory/
│   └── iteration-memory.json   # Memory of all attempts
├── report.json                 # Complete report (JSON)
└── REPORT.md                   # Human-readable summary
```

### Report Contents

**report.json** includes:
- Starting and final scores
- All iteration details
- Success/failure analysis
- Total duration
- Best iteration identifier

**REPORT.md** includes:
- Executive summary
- Score progression chart
- Top improvements made
- Iteration-by-iteration breakdown
- Recommendations for further improvement

## Architecture

VIZTRITR uses a **multi-agent architecture** with persistent memory:

### Core Components

1. **VIZTRITROrchestrator** (`src/core/orchestrator.ts`)
   - Main coordinator for iteration cycles
   - Manages plugins and agents
   - Generates reports

2. **OrchestratorAgent** (`src/agents/OrchestratorAgent.ts`)
   - Selects which improvements to implement
   - Filters recommendations based on memory
   - Prioritizes high-impact changes

3. **ReflectionAgent** (`src/agents/ReflectionAgent.ts`)
   - Analyzes iteration outcomes
   - Records successes and failures
   - Identifies patterns across iterations

4. **VerificationAgent** (`src/agents/VerificationAgent.ts`)
   - Validates file changes
   - Checks for build errors
   - Ensures changes were applied correctly

5. **IterationMemoryManager** (`src/memory/IterationMemoryManager.ts`)
   - Persists learning across runs
   - Tracks attempted recommendations
   - Records frequently modified files
   - Builds context for future iterations

### Plugin System

VIZTRITR uses a plugin architecture for extensibility:

- **Vision Plugins** - Analyze UI screenshots (Claude Opus, GPT-4V, Gemini)
- **Capture Plugins** - Take screenshots (Puppeteer, Playwright, Selenium)
- **Implementation Plugins** - Apply code changes (Claude Sonnet, GPT-4, Copilot)
- **Evaluation Plugins** - Score designs (AI-based, Lighthouse, custom)

See `src/core/types.ts` for the `VIZTRITRPlugin` interface.

## Use Cases

### 1. Pre-Launch QA
Run VIZTRITR before shipping to ensure your UI meets design standards:
```bash
npm run test:my-app
```

### 2. Design Reviews
Get expert-level UI critique without hiring consultants. Review the generated `REPORT.md` for specific recommendations.

### 3. Accessibility Audits
VIZTRITR prioritizes accessibility (1.3× weight). Use it to identify and fix WCAG compliance issues.

### 4. Continuous Improvement
Integrate into CI/CD to maintain design quality across releases.

### 5. Design System Compliance
Verify adherence to brand guidelines and design systems automatically.

## Requirements

- **Node.js 18+** - For TypeScript and modern JavaScript features
- **Anthropic API Key** - For Claude Opus vision analysis and Claude Sonnet implementation
- **Running Frontend Dev Server** - Your application must be accessible via HTTP
- **Modern Browser** - Puppeteer requires Chrome/Chromium

### System Requirements

- **RAM:** Minimum 4GB (8GB+ recommended for larger projects)
- **Disk:** ~500MB for dependencies + space for output artifacts
- **Network:** API calls to Anthropic (Claude models)

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **Architecture:** [`docs/architecture/`](docs/architecture/)
  - System design and component relationships
  - Agent architecture analysis
  - Memory system design

- **Guides:** [`docs/guides/`](docs/guides/)
  - Setup and configuration tutorials
  - Performia integration guide
  - Testing strategies

- **Status Reports:** [`docs/status/`](docs/status/)
  - Phase completion reports
  - Implementation status
  - Test results

## Development Status

### ✅ Completed Features

- Core orchestrator with iteration loop
- Claude Opus 4 vision integration
- Claude Sonnet 4 code implementation with extended thinking
- Puppeteer screenshot capture
- 8-dimension scoring system
- Multi-agent architecture (Orchestrator, Reflection, Verification)
- Persistent memory system
- Automatic file detection and backup
- Structured diff generation
- Comprehensive reporting (JSON + Markdown)

### 🚧 In Progress

- Enhanced memory learning algorithms
- Additional plugin implementations
- CLI interface

### 📋 Planned Features

- GPT-4V and Gemini vision plugins
- Multiple page support
- Design system validation
- A/B testing capabilities
- Local model support (LLaVA, CogVLM)
- GitHub Action integration
- VS Code extension

## Contributing

VIZTRITR is in active development. Contributions are welcome!

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run precommit`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Workflow

```bash
# Install dependencies
npm install

# Start development mode (watch)
npm run dev

# Run tests
npm run test

# Check code quality
npm run precommit
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

**Author:** Daniel Connolly
**Project:** Built for the Performia music platform

### Powered By

- **Claude Opus 4** - AI vision analysis (Anthropic)
- **Claude Sonnet 4** - Code implementation with extended thinking (Anthropic)
- **Puppeteer** - Browser automation (Google)
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review the Performia project example in `projects/performia/`

---

**VIZTRITR: Because great design shouldn't require great designers** 🎨
