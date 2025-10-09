# VIZTRTR - Visual Iteration Orchestrator

**Best-in-class autonomous UI/UX improvement system for any web project**

## Vision

VIZTRTR is an autonomous design iteration system that:

1. Captures screenshots of your UI
2. Analyzes design quality using AI vision models
3. Generates detailed improvement specifications
4. Implements changes automatically
5. Evaluates results and iterates until excellence (8.5+/10 score)

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VIZTRTR Core                          │
│                   (Orchestrator Engine)                     │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Capture    │    │   Analysis   │    │Implementatio│
│    Agent     │    │    Agent     │    │     Agent    │
│  (Puppeteer) │    │  (AI Vision) │    │ (Code Gen)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                    ┌──────────────┐
                    │  Evaluation  │
                    │    Agent     │
                    │ (8D Rubric)  │
                    └──────────────┘
```

## Plugin Architecture

```typescript
interface VIZTRTRPlugin {
  name: string;
  type: 'vision' | 'implementation' | 'evaluation' | 'capture';

  // For vision plugins
  analyzeScreenshot?(imagePath: string): Promise<DesignSpec>;

  // For implementation plugins
  implementChanges?(spec: DesignSpec, projectPath: string): Promise<Changes>;

  // For evaluation plugins
  scoreDesign?(imagePath: string): Promise<EvaluationResult>;

  // For capture plugins
  captureScreenshot?(url: string, selector?: string): Promise<string>;
}
```

### Default Plugins

**Vision Analysis:**

- ✅ Claude Opus 4 (with vision) - Default
- 🔌 GPT-4 Vision
- 🔌 Gemini Pro Vision
- 🔌 LLaVA (local)
- 🔌 Custom API endpoint

**Code Implementation:**

- ✅ Claude Sonnet 4.5 - Default (best code generation)
- 🔌 GPT-4 Turbo
- 🔌 DeepSeek Coder (local)
- 🔌 Custom API endpoint

**Screenshot Capture:**

- ✅ Puppeteer (headless Chrome)
- 🔌 Playwright
- 🔌 Selenium
- 🔌 Custom capture script

**Evaluation:**

- ✅ 8-Dimension Design Rubric (built-in)
- 🔌 Lighthouse scores
- 🔌 aXe accessibility scores
- 🔌 Custom scoring models

## System Components

### 1. Core Orchestrator

```typescript
class VIZTRTROrchestrator {
  constructor(config: VIZTRTRConfig);

  // Main iteration loop
  async run(): Promise<IterationReport>;

  // Plugin management
  registerPlugin(plugin: VIZTRTRPlugin): void;

  // Iteration control
  async runIteration(n: number): Promise<IterationResult>;
  checkStoppingCriteria(): boolean;
}
```

### 2. Configuration

```typescript
interface VIZTRTRConfig {
  // Project settings
  projectPath: string;
  frontendUrl: string;
  targetScore: number;
  maxIterations: number;

  // Plugin selection
  visionPlugin: 'claude-opus' | 'gpt4v' | 'gemini' | 'custom';
  implementationPlugin: 'claude-sonnet' | 'gpt4' | 'deepseek' | 'custom';
  capturePlugin: 'puppeteer' | 'playwright' | 'custom';

  // API credentials
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  customEndpoint?: string;

  // Target selectors
  targetSelectors?: string[];
  screenshotConfig: {
    width: number;
    height: number;
    fullPage?: boolean;
  };

  // Scoring weights
  scoringRubric: ScoringRubric;
}
```

### 3. Agent Interfaces

#### Vision Analysis Agent

```typescript
interface DesignAnalysisAgent {
  analyzeUI(screenshot: Screenshot): Promise<DesignSpec>;
}

interface DesignSpec {
  currentIssues: Issue[];
  recommendations: Recommendation[];
  prioritizedChanges: Change[];
  estimatedImpact: { [dimension: string]: number };
}
```

#### Implementation Agent

```typescript
interface ImplementationAgent {
  applyChanges(spec: DesignSpec, codebase: string): Promise<Changes>;
  validateChanges(changes: Changes): Promise<ValidationResult>;
}

interface Changes {
  files: FileChange[];
  buildCommand?: string;
  testCommand?: string;
}
```

#### Evaluation Agent

```typescript
interface EvaluationAgent {
  score(screenshot: Screenshot): Promise<EvaluationResult>;
}

interface EvaluationResult {
  compositeScore: number;
  dimensionScores: { [key: string]: number };
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}
```

## Workflow

### Phase 1: Initialization

```bash
viztritr init
# Creates viztritr.config.json
# Prompts for API keys
# Detects project type (React, Vue, Angular, etc.)
```

### Phase 2: Analysis

```bash
viztritr analyze
# Captures initial screenshot
# Runs vision analysis
# Generates baseline score
# Outputs initial report
```

### Phase 3: Iteration

```bash
viztritr iterate --target 8.5 --max-iterations 10
# Runs autonomous improvement cycles
# Captures before/after screenshots
# Generates design specs
# Implements changes
# Evaluates results
# Repeats until target reached
```

### Phase 4: Review

```bash
viztritr report
# Generates comprehensive report
# Shows score progression
# Links to all screenshots
# Documents all changes made
```

## Integration Methods

### Method 1: CLI (Standalone)

```bash
npm install -g viztritr
cd my-project
viztritr init
viztritr iterate
```

### Method 2: GitHub Action

```yaml
name: VIZTRTR UI Review
on: [pull_request]
jobs:
  ui-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: viztritr/action@v1
        with:
          target-score: 8.5
          anthropic-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Method 3: API Server

```bash
viztritr serve --port 3000
# Runs as HTTP API server
# Accept webhook from CI/CD
# Return improvement suggestions
```

### Method 4: VS Code Extension

```javascript
// In VS Code
Command Palette → "VIZTRTR: Analyze Current UI"
// Launches browser, captures, analyzes, suggests
```

## API Integration

### Claude Opus Vision API

```typescript
class ClaudeOpusVisionAgent implements DesignAnalysisAgent {
  async analyzeUI(screenshot: Screenshot): Promise<DesignSpec> {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshot.base64
            }
          },
          {
            type: "text",
            text: this.getAnalysisPrompt()
          }
        ]
      }]
    });

    return this.parseDesignSpec(response.content);
  }

  private getAnalysisPrompt(): string {
    return `
You are a world-class UI/UX designer analyzing this interface.

Evaluate based on 8 dimensions:
1. Visual Hierarchy (weight: 1.2x)
2. Typography (weight: 1.0x)
3. Color & Contrast (weight: 1.0x)
4. Spacing & Layout (weight: 1.1x)
5. Component Design (weight: 1.0x)
6. Animation & Interaction (weight: 0.9x)
7. Accessibility (weight: 1.3x) ← CRITICAL
8. Overall Aesthetic (weight: 1.0x)

For each dimension:
- Score 1-10
- Identify specific issues
- Recommend concrete improvements

Prioritize changes by impact and effort.
    `;
  }
}
```

### Local Model Support (Future)

```typescript
class LocalVisionAgent implements DesignAnalysisAgent {
  private model: LLaVAModel;

  async analyzeUI(screenshot: Screenshot): Promise<DesignSpec> {
    // Run local LLaVA/CogVLM model
    const analysis = await this.model.generate({
      image: screenshot.path,
      prompt: this.getAnalysisPrompt(),
      maxTokens: 2048
    });

    return this.parseDesignSpec(analysis);
  }
}
```

## Package Structure

```
viztritr/
├── packages/
│   ├── core/                 # Core orchestration engine
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── plugin-manager.ts
│   │   │   ├── iteration-loop.ts
│   │   │   └── config.ts
│   │   └── package.json
│   │
│   ├── plugins/              # Official plugins
│   │   ├── vision-claude/
│   │   ├── vision-gpt4/
│   │   ├── impl-claude/
│   │   ├── impl-gpt4/
│   │   ├── capture-puppeteer/
│   │   ├── eval-rubric/
│   │   └── eval-lighthouse/
│   │
│   ├── cli/                  # Command-line interface
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── analyze.ts
│   │   │   │   ├── iterate.ts
│   │   │   │   └── report.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── server/               # API server (optional)
│   │   └── src/
│   │       ├── api.ts
│   │       ├── webhooks.ts
│   │       └── queue.ts
│   │
│   └── vscode-extension/     # VS Code extension (future)
│       └── src/
│
├── examples/                 # Example projects
│   ├── react-app/
│   ├── vue-app/
│   └── angular-app/
│
├── docs/                     # Documentation
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── plugin-development.md
│   └── architecture.md
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── viztritr.config.schema.json
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Plan

### Phase 1: MVP (Week 1-2)

- [x] Core orchestrator structure
- [x] 8-dimension scoring rubric
- [x] Agent specifications
- [ ] Claude Opus vision integration
- [ ] Puppeteer screenshot capture (real)
- [ ] Basic iteration loop
- [ ] File-based implementation (edit files directly)
- [ ] Test on Performia project

### Phase 2: CLI & Plugins (Week 3-4)

- [ ] CLI interface (init, analyze, iterate, report)
- [ ] Plugin architecture
- [ ] GPT-4V plugin
- [ ] Configuration system
- [ ] HTML report generation
- [ ] Screenshot gallery

### Phase 3: Production Features (Week 5-6)

- [ ] API server mode
- [ ] Queue system for long-running jobs
- [ ] Caching layer
- [ ] Rollback/restore functionality
- [ ] A/B comparison view
- [ ] Performance optimization

### Phase 4: Ecosystem (Week 7-8)

- [ ] npm package publication
- [ ] GitHub Action
- [ ] VS Code extension
- [ ] Documentation site
- [ ] Video tutorials
- [ ] Community plugins

### Phase 5: Advanced (Future)

- [ ] Local model support (LLaVA, CogVLM)
- [ ] Multi-page analysis
- [ ] Responsive design testing
- [ ] Browser compatibility checks
- [ ] Performance budgets
- [ ] Design system adherence checks

## Monetization Strategy (Optional)

**Free Tier:**

- 10 iterations/month
- Basic scoring rubric
- Puppeteer capture
- Community support

**Pro Tier ($49/month):**

- Unlimited iterations
- All AI model plugins
- Advanced scoring
- Priority support
- API access

**Enterprise ($499/month):**

- Self-hosted option
- Custom models
- White-label reports
- SLA support
- Training & consulting

## Success Metrics

- ⭐ GitHub stars
- 📦 npm downloads
- 🎯 Average score improvement (baseline → final)
- ⚡ Iteration speed (seconds per cycle)
- 🎨 Projects improved
- 👥 Active users
- 🔌 Community plugins

## Next Steps

1. Build MVP Claude Opus integration
2. Test on Performia (this project)
3. Extract into standalone package
4. Add GPT-4V support
5. Create CLI
6. Publish to npm
7. Create demo video
8. Launch on Product Hunt

---

**VIZTRTR: Because great design shouldn't require great designers**
