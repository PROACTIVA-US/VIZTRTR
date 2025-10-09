# Gemini Computer Use Full - Visual Verification Loop Integration

## Overview

The **Gemini Computer Use Full** plugin provides advanced UI improvement implementation with complete visual verification. Unlike traditional code generation approaches, this plugin:

1. **Plans** code changes using Gemini vision
2. **Executes** file modifications
3. **Reloads** the browser to see changes
4. **Verifies** improvements visually
5. **Rolls back** if regression is detected

This creates a feedback loop that ensures changes actually improve the UI, not just generate plausible code.

## Architecture

### Key Components

- **`GeminiComputerUseFullPlugin`** - Main implementation plugin with full verification loop
- **Playwright** - Browser automation for visual verification
- **Gemini 2.0 Flash** - Vision model for analysis and verification (quota-friendly)
- **File Backup System** - Automatic rollback capability

### Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Gemini Computer Use Full Workflow                  │
└─────────────────────────────────────────────────────────────────────┘

1. Initialize Browser
   └─> Launch Playwright browser
   └─> Navigate to frontend URL
   └─> Wait for app to be ready

2. Capture "Before" Screenshot
   └─> Take base64 screenshot
   └─> Analyze with Gemini vision
   └─> Record baseline score (e.g., 7.2/10)

3. Generate Implementation Plan
   └─> Analyze design recommendation
   └─> Create precise file change plan
   └─> Identify exact line numbers
   └─> Specify expected visual changes

4. Execute File Changes
   └─> Create timestamped backups
   └─> Apply changes to files
   └─> Track all modifications

5. Reload Browser
   └─> Reload page to reflect changes
   └─> Wait for hot reload (3 seconds)
   └─> Ensure changes are visible

6. Capture "After" Screenshot
   └─> Take new screenshot
   └─> Compare with "before"

7. Verify Changes Visually
   └─> Analyze both screenshots with Gemini
   └─> Compare scores (before vs after)
   └─> Detect visual regressions
   └─> Validate expected changes occurred

8. Decision Point
   ├─> If improved + no regressions → SUCCESS
   └─> If regressions detected → ROLLBACK to backups
```

## Files Created

### Core Plugin

**`src/plugins/gemini-computer-use-full.ts`** (600+ lines)

Main plugin implementing the full visual verification loop.

**Key Methods:**
- `initializeBrowser(frontendUrl)` - Launch Playwright browser
- `captureScreenshotInternal()` - Capture base64 screenshot
- `analyzeUIVisually(screenshot, context)` - Get quality score from Gemini
- `generateImplementationPlan(spec, path, rec)` - Create change plan
- `executeFileChanges(plan, path)` - Apply file modifications
- `reloadAndWait(waitMs)` - Reload browser and wait for changes
- `verifyChanges(before, after, criteria)` - Visual comparison
- `rollback()` - Restore backups if regression detected
- `implementChanges(spec, path, url)` - **Main entry point**

**Security Features:**
- Path validation (only files within project)
- Blacklist protection (node_modules, .git, .env, etc.)
- Automatic backup before changes
- Rollback capability on failure

### Demo Script

**`examples/gemini-full-demo.ts`** (100+ lines)

Demo script showing end-to-end usage of the full Computer Use plugin.

**Usage:**
```bash
npm run build
node dist/examples/gemini-full-demo.js
```

**What it does:**
1. Captures screenshot of `http://localhost:5173`
2. Analyzes with Gemini Vision
3. Implements top recommendation with visual verification
4. Shows before/after scores
5. Reports success or rollback reason

## Usage

### Prerequisites

```bash
# Install Playwright (already added to package.json)
npm install playwright

# Ensure frontend is running
cd ui/frontend && npm run dev  # Runs on http://localhost:5173

# Set Gemini API key
export GEMINI_API_KEY="your-key-here"
# or
export GOOGLE_API_KEY="your-key-here"
```

### Basic Usage

```typescript
import { GeminiComputerUseFullPlugin } from './src/plugins/gemini-computer-use-full';
import { DesignSpec } from './src/core/types';

const plugin = new GeminiComputerUseFullPlugin();

// Your design spec from vision analysis
const designSpec: DesignSpec = {
  iteration: 0,
  timestamp: new Date(),
  currentScore: 7.2,
  recommendations: [
    {
      dimension: 'Accessibility',
      title: 'Improve keyboard focus indication',
      description: 'Add visible focus outline to buttons',
      impact: 9,
      effort: 2
    }
  ],
  // ... other fields
};

// Implement with visual verification
const changes = await plugin.implementChanges(
  designSpec,
  '/path/to/project',
  'http://localhost:5173'  // Frontend URL
);

console.log(`Files modified: ${changes.files.length}`);
console.log(`Summary: ${changes.summary}`);

// Cleanup
await plugin.cleanup();
```

### Advanced: Custom Verification Criteria

The plugin generates verification criteria automatically, but you can customize the prompt:

```typescript
// In generateImplementationPlan(), customize the prompt:
const prompt = `
You are a senior UI/UX engineer implementing design improvements.

RECOMMENDATION:
${JSON.stringify(recommendation, null, 2)}

PROJECT CONTEXT:
- Project path: ${projectPath}
- Type: React + TypeScript frontend
- **Custom Requirements**: Ensure changes maintain design system consistency

TASK:
Generate a precise implementation plan with focus on ${customRequirements}.
`;
```

### Integration with VIZTRTR Orchestrator

```typescript
import { VIZTRTROrchestrator } from './src/core/orchestrator';
import { VIZTRTRConfig } from './src/core/types';
import { GeminiComputerUseFullPlugin } from './src/plugins/gemini-computer-use-full';

const config: VIZTRTRConfig = {
  projectPath: '/path/to/frontend',
  frontendUrl: 'http://localhost:5173',
  targetScore: 8.5,
  maxIterations: 3,

  // Use Gemini Computer Use Full plugin
  models: {
    vision: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp'
    },
    implementation: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp'  // Uses Computer Use plugin internally
    },
    evaluation: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5-20250402'
    }
  },

  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: false
  },

  outputDir: './viztritr-output',
  verbose: true
};

const orchestrator = new VIZTRTROrchestrator(config);
const report = await orchestrator.run();
```

## Benefits of Visual Verification Loop

### 1. **Catches CSS Conflicts Immediately**

**Problem**: Code generation might produce valid CSS that conflicts with existing styles.

**Solution**: Visual verification detects when changes don't produce the expected result.

**Example**:
```
Plan: "Change button background to blue (#3B82F6)"
Execution: Modifies CSS correctly
Verification: Gemini sees button is still gray
Decision: ROLLBACK - conflicting CSS selector has higher specificity
```

### 2. **Validates Real Visual Impact**

**Problem**: Static analysis can't confirm changes actually improve UI.

**Solution**: Before/after screenshot comparison with AI analysis.

**Example**:
```
Before Score: 7.2/10
After Score: 8.1/10
Improved: true
Regression: false
Decision: SUCCESS - changes improved UI quality
```

### 3. **Prevents Regressions**

**Problem**: Changes might improve one area but break another.

**Solution**: Gemini analyzes entire screenshot for unintended side effects.

**Example**:
```
Plan: "Increase button padding"
Execution: Adds padding successfully
Verification: Button now overlaps adjacent text
Decision: ROLLBACK - visual regression detected
```

### 4. **Provides Confidence Metrics**

**Problem**: Hard to know if automated changes are safe to deploy.

**Solution**: Detailed verification breakdown with confidence scores.

**Example**:
```json
{
  "beforeScore": 7.2,
  "afterScore": 8.1,
  "improved": true,
  "regressionDetected": false,
  "details": "Focus outline is now visible and meets WCAG AAA standards. No layout shifts or visual regressions detected.",
  "confidence": 0.95
}
```

## Cost Comparison

### Traditional Approach (Claude Only)

- **Vision**: Claude Opus 4 ($15/1M input, $75/1M output)
- **Implementation**: Claude Sonnet 4 ($3/1M input, $15/1M output)
- **Typical 5-iteration run**: $5-$15

### Gemini Computer Use Full (Hybrid)

- **Vision**: Gemini 2.0 Flash ($0.10/1M input, $0.40/1M output) - **97% cheaper**
- **Implementation**: Gemini 2.0 Flash (same pricing)
- **Verification**: Gemini 2.0 Flash (same pricing)
- **Typical 5-iteration run**: $0.50-$2.00 - **83% cost savings**

**Breakdown per iteration:**
```
Before/After Screenshots: 2 × $0.01 = $0.02
Implementation Plan: ~10K tokens × $0.10/1M = $0.001
Visual Verification: ~15K tokens × $0.10/1M = $0.0015
Total per iteration: ~$0.025-$0.05

vs Claude: ~$1-$3 per iteration
Savings: 95-98%
```

## Comparison: Gemini Computer Use API vs Full Plugin

### Gemini 2.5 Computer Use Preview (API)

**Pros:**
- Official Google API
- Direct browser control
- Structured action format

**Cons:**
- ❌ Free tier quota limits (0 requests/day for preview)
- ❌ Requires paid tier
- ❌ Not available in all regions
- ❌ Rate limits can block workflows

**Cost**: TBD (preview pricing not finalized)

### Gemini Computer Use Full Plugin (This Implementation)

**Pros:**
- ✅ Uses Gemini 2.0 Flash (quota-friendly, FREE during preview)
- ✅ Full visual verification loop
- ✅ Automatic rollback on regression
- ✅ Works with existing Playwright setup
- ✅ No special quotas needed
- ✅ Available globally

**Cons:**
- Manual browser automation (not AI-controlled)
- Requires frontend to be running locally

**Cost**: ~$0.025-$0.05 per iteration (95-98% cheaper than Claude)

## Troubleshooting

### Issue: "Browser not initialized"

**Cause**: `implementChanges()` called before browser launch.

**Fix**: The plugin automatically initializes the browser. Ensure frontend URL is accessible.

```typescript
// Check if frontend is running
const response = await fetch('http://localhost:5173');
if (!response.ok) {
  console.error('Frontend not running');
}
```

### Issue: "Failed to generate plan"

**Cause**: Gemini API error or invalid response format.

**Fix**: Check API key and quota:

```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Test API access
curl -H "Content-Type: application/json" \
     -H "x-goog-api-key: $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp
```

### Issue: "Verification always detects regressions"

**Cause**: Changes are too subtle or frontend hot reload is slow.

**Fix**: Increase wait time after reload:

```typescript
// Default is 3000ms (3 seconds)
await this.reloadAndWait(5000); // Try 5 seconds
```

### Issue: "File changes not visible in browser"

**Cause**: Frontend build/hot reload not working.

**Fix**: Verify dev server has hot reload enabled:

```bash
# Vite (default)
npm run dev  # Should show "hmr update" messages

# If using build step, add build command to workflow
const changes = await plugin.implementChanges(...);
await execSync('npm run build');  // Force rebuild
await plugin.reloadAndWait(5000);  // Extra wait for build
```

## Limitations

1. **Frontend Must Be Running**: Requires local dev server (can't verify without live UI)
2. **Gemini Vision Needed**: Quota-limited models may not work for high-volume testing
3. **Simple Changes Only**: Best for CSS/styling tweaks, not complex React refactors
4. **Sequential Execution**: Verifies one change at a time (not batched)

## Future Enhancements

Potential improvements for future versions:

- [ ] **Parallel Verification**: Verify multiple recommendations simultaneously
- [ ] **Screenshot Diffing**: Pixel-by-pixel comparison for regression detection
- [ ] **Video Recording**: Record browser interactions for debugging
- [ ] **Multi-Route Testing**: Test changes across multiple pages
- [ ] **Performance Metrics**: Track Lighthouse scores before/after
- [ ] **Accessibility Testing**: Auto-run axe-core on changes
- [ ] **Design System Validation**: Ensure changes match design tokens

## Related Documentation

- [Gemini Integration Guide](./gemini-integration.md) - Basic Gemini setup
- [Hybrid Scoring Guide](../status/PHASE_3_HYBRID_SCORING.md) - AI + Real Metrics
- [Chrome DevTools MCP Integration](../architecture/CHROME_DEVTOOLS_MCP_INTEGRATION.md)
- [Project Analysis](../status/PROJECT_ANALYSIS_OCT_9_2025.md) - Cost analysis

## Support

For issues or questions:
- GitHub Issues: https://github.com/anthropics/viztrtr/issues
- Documentation: https://github.com/anthropics/viztrtr/docs

---

**Last Updated**: October 9, 2025
**Plugin Version**: 1.0.0
**Gemini Models**: 2.0 Flash Experimental, 2.5 Computer Use Preview
