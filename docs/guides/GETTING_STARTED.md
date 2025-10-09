# Getting Started with VIZTRTR

This guide will help you get VIZTRTR up and running on your system.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Anthropic API key** ([Get one](https://console.anthropic.com/))
- A **running frontend application** to test on

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd VIZTRTR
```

### 2. Install Dependencies

```bash
npm install
```

This will install:

- TypeScript and development tools
- Anthropic SDK for Claude models
- Puppeteer for browser automation
- Testing and linting tools

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
touch .env
```

Add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Security Note:** Never commit your `.env` file to version control. It's already in `.gitignore`.

### 4. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Running Your First Test

### Option 1: Run the Demo

The demo script runs VIZTRTR on a generic frontend application.

**Step 1:** Make sure you have a frontend dev server running at `http://localhost:5001`

**Step 2:** Run the demo

```bash
npm run demo
```

**What happens:**

1. VIZTRTR captures a screenshot of your UI
2. Claude Opus analyzes the design
3. Claude Sonnet implements improvements
4. The UI is re-evaluated
5. Process repeats up to `maxIterations`
6. A comprehensive report is generated

**Step 3:** Check the results

```bash
ls -la viztritr-output/
```

You'll find:

- `iteration_*/` - Screenshots and analysis for each iteration
- `report.json` - Detailed JSON report
- `REPORT.md` - Human-readable summary

### Option 2: Test with Performia Project

VIZTRTR includes a complete example using the Performia music platform.

**Step 1:** Start Performia services

```bash
# Terminal 1: Start Performia backend (port 8000)
cd /path/to/Performia/backend
./RUN_API.sh

# Terminal 2: Start Performia frontend (port 5001)
cd /path/to/Performia/frontend
npm run dev
```

**Step 2:** Run VIZTRTR test

```bash
# Terminal 3: Run VIZTRTR
npm run test:performia
```

**What happens:**

- Uses the configuration in `projects/performia/config.ts`
- Runs 2 iterations (configurable)
- Learns from memory of past attempts
- Avoids repeating failed strategies
- Generates detailed Performia-specific report

**Step 3:** Review results

Check `/path/to/Performia/viztritr-output/REPORT.md` for:

- Score progression
- Improvements made
- Performia-specific analysis
- Recommendations

## Understanding the Output

After running VIZTRTR, examine the output directory structure:

```
viztritr-output/
├── iteration_0/
│   ├── before.png              # UI before changes
│   ├── after.png               # UI after changes
│   ├── design_spec.json        # Vision analysis from Claude Opus
│   ├── changes.json            # Code changes with diffs
│   └── evaluation.json         # 8-dimension scores
│
├── iteration_1/
│   └── [same structure as iteration_0]
│
├── memory/
│   └── iteration-memory.json   # Persistent learning data
│
├── report.json                 # Complete report (all data)
└── REPORT.md                   # Human-readable summary
```

### Key Files Explained

#### `design_spec.json`

Contains Claude Opus's vision analysis:

```json
{
  "overallImpression": "The UI shows good typography...",
  "strengths": ["Clear visual hierarchy", ...],
  "weaknesses": ["Low color contrast in buttons", ...],
  "recommendations": [
    {
      "title": "Increase button contrast",
      "priority": "high",
      "rationale": "WCAG AA requires 4.5:1...",
      "impact": "accessibility"
    }
  ]
}
```

#### `changes.json`

Shows what code was modified:

```json
{
  "filesModified": ["src/components/Button.tsx"],
  "description": "Increased button contrast ratio",
  "diff": "- background: #ccc;\n+ background: #333;"
}
```

#### `evaluation.json`

Contains 8-dimension scores:

```json
{
  "scores": {
    "visual_hierarchy": 7.5,
    "typography": 8.0,
    "color_contrast": 6.5,
    "spacing_layout": 7.8,
    "component_design": 7.2,
    "animation_interaction": 7.0,
    "accessibility": 6.8,
    "overall_aesthetic": 7.4
  },
  "compositeScore": 7.3,
  "reasoning": {...}
}
```

#### `REPORT.md`

Human-readable summary with:

- Executive summary
- Score progression
- Best improvements
- Detailed iteration breakdown
- Next steps

## Verification

Verify your installation is working:

### 1. Check Build

```bash
npm run build
```

Should complete without errors.

### 2. Check Types

```bash
npm run typecheck
```

Should show no type errors.

### 3. Run Tests

```bash
npm run test
```

Should pass all unit tests.

### 4. Check Linting

```bash
npm run lint
```

Should show no linting errors.

## Common Issues

### Issue: "ANTHROPIC_API_KEY not found"

**Solution:** Ensure `.env` file exists in project root with:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Issue: "Frontend is not running"

**Solution:** Start your frontend dev server first:

```bash
cd /path/to/frontend
npm run dev
```

Verify it's accessible at the configured URL (e.g., `http://localhost:5001`).

### Issue: "Cannot find module"

**Solution:** Rebuild the project:

```bash
npm run build
```

### Issue: "Puppeteer fails to launch Chrome"

**Solution:** Install Chrome/Chromium:

```bash
# macOS
brew install chromium

# Ubuntu
sudo apt-get install chromium-browser

# Or let Puppeteer install it
npx puppeteer browsers install chrome
```

### Issue: "Memory file not found"

**Solution:** This is normal for first run. Memory file is created automatically after the first iteration.

## Next Steps

Now that you have VIZTRTR running:

1. **Create Your Own Project** - See [PROJECT_SETUP.md](PROJECT_SETUP.md)
2. **Understand the Architecture** - Read [docs/architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
3. **Customize Configuration** - Tweak `targetScore`, `maxIterations`, etc.
4. **Review Test Results** - Analyze the generated reports
5. **Integrate into CI/CD** - Automate UI quality checks

## Getting Help

- **Documentation:** Check `docs/` directory
- **Examples:** Review `projects/performia/` for a complete example
- **Issues:** Open an issue on GitHub
- **API Reference:** See type definitions in `src/core/types.ts`

## Development Mode

For active development:

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# In another terminal, run your tests
npm run demo
```

## Configuration Overview

Key configuration options in `VIZTRTRConfig`:

| Option | Description | Example |
|--------|-------------|---------|
| `projectPath` | Absolute path to frontend | `/Users/me/my-app` |
| `frontendUrl` | Dev server URL | `http://localhost:3000` |
| `targetScore` | Quality threshold (0-10) | `8.5` |
| `maxIterations` | Max cycles to run | `5` |
| `visionModel` | Vision model to use | `'claude-opus'` |
| `implementationModel` | Code gen model | `'claude-sonnet'` |
| `outputDir` | Where to save results | `/tmp/viztritr-out` |
| `verbose` | Detailed logging | `true` |

For complete configuration options, see the `VIZTRTRConfig` interface in `src/core/types.ts`.

---

**Ready to test on your own project?** Continue to [PROJECT_SETUP.md](PROJECT_SETUP.md).
