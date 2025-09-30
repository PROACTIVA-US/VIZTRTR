# VIZTRITR - Visual Iteration Orchestrator

**Autonomous UI/UX improvement system powered by AI vision models**

VIZTRITR automatically analyzes, improves, and evaluates your web interfaces through iterative cycles until they reach design excellence (8.5+/10 score).

## Features

- 🔍 **AI Vision Analysis** - Claude Opus 4 analyzes your UI with expert-level design critique
- 📸 **Automated Screenshots** - Puppeteer captures high-quality screenshots
- 🎨 **8-Dimension Scoring** - Evaluates visual hierarchy, typography, accessibility, and more
- 🔄 **Iterative Improvement** - Automatically applies changes and re-evaluates
- 🔌 **Plugin Architecture** - Support for multiple AI models (GPT-4V, Gemini, local models)
- 📊 **Detailed Reports** - Comprehensive reports with before/after comparisons

## Quick Start

### 1. Installation

```bash
cd viztritr
npm install
```

### 2. Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Build

```bash
npm run build
```

### 4. Run Demo

Make sure your frontend is running at `http://localhost:5001`, then:

```bash
npm run demo
```

## How It Works

```
┌─────────────┐
│   Capture   │  Puppeteer screenshots your UI
│ Screenshot  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Analyze   │  Claude Opus analyzes design quality
│  with AI    │  Identifies issues and recommendations
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Implement  │  Applies top improvements
│   Changes   │  Modifies code automatically
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Evaluate   │  Scores the new design
│   Result    │  Checks if target reached
└──────┬──────┘
       │
       ▼
   Target reached? ──NO──> Repeat
       │
      YES
       │
       ▼
┌─────────────┐
│   Report    │  Generate comprehensive report
│  & Finish   │  with all iterations documented
└─────────────┘
```

## Scoring System

VIZTRITR evaluates UIs across 8 dimensions:

1. **Visual Hierarchy** (weight: 1.2×) - Clear element priority, size scaling, contrast
2. **Typography** (weight: 1.0×) - Font sizes, hierarchy, readability, line height
3. **Color & Contrast** (weight: 1.0×) - WCAG compliance, harmony, semantic usage
4. **Spacing & Layout** (weight: 1.1×) - 8px grid, breathing room, alignment
5. **Component Design** (weight: 1.0×) - Button states, touch targets, consistency
6. **Animation & Interaction** (weight: 0.9×) - Smooth transitions, micro-interactions
7. **Accessibility** (weight: 1.3×) - ⭐ Highest priority - ARIA, keyboard nav, focus
8. **Overall Aesthetic** (weight: 1.0×) - Professional polish, modern feel, cohesion

**Composite Score** = Weighted average of all dimensions

**Target** = 8.5+/10 for production-ready quality

## Output

After running VIZTRITR, you'll find:

```
viztritr-output/
├── iteration_0/
│   ├── before.png          # Screenshot before changes
│   ├── after.png           # Screenshot after changes
│   ├── design_spec.json    # AI analysis and recommendations
│   ├── changes.json        # Code changes applied
│   └── evaluation.json     # Scoring results
├── iteration_1/
│   └── ...
├── report.json            # Full report (JSON)
└── REPORT.md              # Human-readable report
```

## Configuration

```typescript
const config: VIZTRITRConfig = {
  projectPath: '/path/to/your/frontend',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.5,
  maxIterations: 5,
  visionModel: 'claude-opus', // or 'gpt4v', 'gemini'
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  screenshotConfig: {
    width: 1440,
    height: 900,
    fullPage: false,
    selector: '#app' // Optional: capture specific element
  },
  outputDir: './viztritr-output'
};
```

## Plugins

### Current Plugins

- ✅ **Claude Opus Vision** - AI vision analysis (default)
- ✅ **Puppeteer Capture** - Screenshot capture

### Planned Plugins

- 🔌 **GPT-4 Vision** - Alternative vision model
- 🔌 **Gemini Pro Vision** - Google's vision model
- 🔌 **Claude Sonnet Implementation** - Code generation agent
- 🔌 **Lighthouse Evaluation** - Performance + accessibility scores
- 🔌 **LLaVA** - Local vision model (no API required)

## Roadmap

### Phase 1: MVP (Current)
- [x] Core orchestrator
- [x] Claude Opus vision integration
- [x] Puppeteer screenshot capture
- [x] Basic iteration loop
- [ ] Claude Sonnet code implementation
- [ ] Test on Performia project

### Phase 2: CLI & Plugins
- [ ] CLI interface (`viztritr init`, `viztritr run`)
- [ ] GPT-4V plugin
- [ ] Configuration wizard
- [ ] HTML report generation

### Phase 3: Production
- [ ] npm package publication
- [ ] GitHub Action
- [ ] VS Code extension
- [ ] API server mode
- [ ] Multi-page support

### Phase 4: Ecosystem
- [ ] Local model support (LLaVA, CogVLM)
- [ ] Community plugin marketplace
- [ ] Design system adherence checks
- [ ] A/B testing support

## Use Cases

- **Pre-launch QA** - Ensure your UI meets design standards before shipping
- **Design Reviews** - Get expert-level critique without hiring consultants
- **Accessibility Audits** - Identify and fix WCAG compliance issues
- **Continuous Improvement** - Run in CI/CD to maintain design quality
- **Design System Compliance** - Verify adherence to brand guidelines

## Requirements

- Node.js 18+
- Anthropic API key (for Claude Opus vision)
- Running frontend dev server

## Contributing

VIZTRITR is currently in early development. Contributions welcome!

## License

MIT

## Credits

Built for the Performia project by Daniel Connolly.

Powered by:
- Claude Opus 4 (Anthropic)
- Puppeteer (Google)
- TypeScript

---

**VIZTRITR: Because great design shouldn't require great designers**
