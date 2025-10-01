# Setting Up a New Project with VIZTRITR

This guide walks you through setting up VIZTRITR to test your own frontend application.

## Overview

To use VIZTRITR on your project, you'll create:

1. A project directory in `projects/your-project/`
2. A configuration file (`config.ts`)
3. A test runner script (`test.ts`)
4. An npm script for easy execution

## Step-by-Step Setup

### Step 1: Create Project Directory

```bash
mkdir -p projects/my-project
```

Replace `my-project` with your project name (use lowercase with hyphens).

### Step 2: Create Configuration File

Create `projects/my-project/config.ts`:

```typescript
import { VIZTRITRConfig } from '../../src/core/types';
import * as dotenv from 'dotenv';

dotenv.config();

export const myProjectConfig: VIZTRITRConfig = {
  // ============================================================================
  // PROJECT SETTINGS
  // ============================================================================

  // Absolute path to your frontend project root
  projectPath: '/absolute/path/to/your/frontend',

  // URL where your dev server runs
  frontendUrl: 'http://localhost:3000',

  // Target quality score (0-10). 8.5 is production-ready
  targetScore: 8.5,

  // Maximum number of iteration cycles
  maxIterations: 5,

  // ============================================================================
  // AI MODELS
  // ============================================================================

  // Vision model for UI analysis
  visionModel: 'claude-opus',

  // Implementation model for code changes
  implementationModel: 'claude-sonnet',

  // ============================================================================
  // API CREDENTIALS
  // ============================================================================

  // Anthropic API key from environment
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // ============================================================================
  // SCREENSHOT CONFIGURATION
  // ============================================================================

  screenshotConfig: {
    // Viewport width in pixels
    width: 1440,

    // Viewport height in pixels
    height: 900,

    // Capture entire scrollable page?
    fullPage: false,

    // CSS selector to capture (optional)
    // Use this to target specific parts of your UI
    selector: '#root' // or '#app', '.main-content', etc.
  },

  // ============================================================================
  // OUTPUT CONFIGURATION
  // ============================================================================

  // Where to save results (absolute path)
  outputDir: '/absolute/path/to/viztritr-output',

  // Enable detailed console logging
  verbose: true
};

export default myProjectConfig;
```

### Step 3: Create Test Runner

Create `projects/my-project/test.ts`:

```typescript
import { VIZTRITROrchestrator } from '../../src/core/orchestrator';
import myProjectConfig from './config';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🎨 VIZTRITR - My Project');
  console.log('='.repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`   Project: ${myProjectConfig.projectPath}`);
  console.log(`   Frontend URL: ${myProjectConfig.frontendUrl}`);
  console.log(`   Target Score: ${myProjectConfig.targetScore}/10`);
  console.log(`   Max Iterations: ${myProjectConfig.maxIterations}`);
  console.log(`   Output: ${myProjectConfig.outputDir}\n`);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  // Check for API key
  if (!myProjectConfig.anthropicApiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in .env');
    console.error('   Please add your API key to the .env file');
    process.exit(1);
  }

  // Pre-flight checks
  console.log('🔍 Pre-flight checks...');

  // Check if frontend is accessible
  try {
    const response = await fetch(myProjectConfig.frontendUrl);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
    console.log('✅ Frontend is accessible\n');
  } catch (error) {
    console.error('❌ Error: Frontend is not running');
    console.error(`   Please start it at: ${myProjectConfig.frontendUrl}`);
    console.error(`   Then run this test again.\n`);
    process.exit(1);
  }

  // ============================================================================
  // RUN VIZTRITR
  // ============================================================================

  console.log('🚀 Starting VIZTRITR iteration cycle...');
  console.log(`   Target Score: ${myProjectConfig.targetScore}/10`);
  console.log(`   Max Iterations: ${myProjectConfig.maxIterations}`);
  console.log(`   Output: ${myProjectConfig.outputDir}\n`);

  try {
    const orchestrator = new VIZTRITROrchestrator(myProjectConfig);
    const report = await orchestrator.run();

    // ============================================================================
    // PRINT RESULTS
    // ============================================================================

    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(70));

    console.log(`\n🎯 Score Progression:`);
    console.log(`   Starting: ${report.startingScore.toFixed(1)}/10`);
    console.log(`   Final: ${report.finalScore.toFixed(1)}/10`);
    console.log(`   Improvement: ${report.improvement >= 0 ? '+' : ''}${report.improvement.toFixed(1)} points`);
    console.log(`   Target Reached: ${report.targetReached ? '✅ YES' : '❌ NO'}`);

    console.log(`\n⚡ Performance:`);
    console.log(`   Total Iterations: ${report.totalIterations}`);
    console.log(`   Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`   Best Iteration: #${report.bestIteration}`);

    console.log(`\n📁 Outputs:`);
    console.log(`   Report: ${report.reportPath}`);
    console.log(`   Markdown: ${myProjectConfig.outputDir}/REPORT.md`);
    console.log(`   Screenshots: ${myProjectConfig.outputDir}/iteration_*/`);
    console.log(`   Memory: ${myProjectConfig.outputDir}/memory/\n`);

    // Print final scores if available
    const finalEval = report.iterations[report.iterations.length - 1]?.evaluation;
    if (finalEval) {
      console.log('📈 Final Dimension Scores:');
      console.log(`   Visual Hierarchy: ${finalEval.scores.visual_hierarchy.toFixed(1)}/10`);
      console.log(`   Typography: ${finalEval.scores.typography.toFixed(1)}/10`);
      console.log(`   Color & Contrast: ${finalEval.scores.color_contrast.toFixed(1)}/10`);
      console.log(`   Spacing & Layout: ${finalEval.scores.spacing_layout.toFixed(1)}/10`);
      console.log(`   Component Design: ${finalEval.scores.component_design.toFixed(1)}/10`);
      console.log(`   Animation & Interaction: ${finalEval.scores.animation_interaction.toFixed(1)}/10`);
      console.log(`   Accessibility: ${finalEval.scores.accessibility.toFixed(1)}/10`);
      console.log(`   Overall Aesthetic: ${finalEval.scores.overall_aesthetic.toFixed(1)}/10\n`);
    }

    // Next steps
    console.log('📝 Next Steps:');
    console.log('   1. Review the detailed report at:', report.reportPath);
    console.log('   2. Compare before/after screenshots in:', myProjectConfig.outputDir);
    console.log('   3. Test the changes in your application');
    console.log('   4. Run accessibility audit if needed');
    console.log('   5. Adjust config and run again if target not reached\n');

    // Exit with appropriate code
    process.exit(report.targetReached ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error running VIZTRITR:', error);
    process.exit(1);
  }
}

main();
```

### Step 4: Add npm Script

Edit `package.json` and add to the `scripts` section:

```json
{
  "scripts": {
    "test:my-project": "npm run build && node dist/projects/my-project/test.js"
  }
}
```

Replace `my-project` with your project name.

### Step 5: Run Your Test

```bash
# First, start your frontend dev server
cd /path/to/your/frontend
npm run dev

# In another terminal, run VIZTRITR
cd /path/to/VIZTRITR
npm run test:my-project
```

## Configuration Guide

### Essential Settings

#### `projectPath`
**Type:** `string` (absolute path)
**Required:** Yes
**Example:** `'/Users/me/projects/my-app'`

The absolute path to your frontend project root directory. This is where VIZTRITR will look for and modify source files.

#### `frontendUrl`
**Type:** `string` (URL)
**Required:** Yes
**Example:** `'http://localhost:3000'`

The URL where your dev server is running. VIZTRITR will screenshot this URL.

#### `outputDir`
**Type:** `string` (absolute path)
**Required:** Yes
**Example:** `'/tmp/viztritr-output'`

Where VIZTRITR saves all results. Will be created if it doesn't exist.

### Quality Settings

#### `targetScore`
**Type:** `number` (0-10)
**Default:** `8.5`
**Recommended:** `8.5` for production, `7.5` for MVP

The quality threshold. VIZTRITR stops when this score is reached.

| Score | Meaning |
|-------|---------|
| 6.0-7.0 | Basic quality, needs work |
| 7.0-8.0 | Good quality, minor issues |
| 8.0-8.5 | Production-ready |
| 8.5-9.0 | Excellent quality |
| 9.0+ | Outstanding, rare |

#### `maxIterations`
**Type:** `number`
**Default:** `5`
**Recommended:** `3-10`

Maximum number of improvement cycles. Higher values allow more refinement but take longer and cost more API credits.

### Screenshot Settings

#### `screenshotConfig.width` / `height`
**Type:** `number` (pixels)
**Defaults:** `1440 × 900`

Viewport dimensions. Common sizes:

| Device | Width × Height |
|--------|----------------|
| Desktop HD | 1920 × 1080 |
| Desktop Standard | 1440 × 900 |
| Laptop | 1366 × 768 |
| Tablet (iPad) | 768 × 1024 |
| Mobile (iPhone) | 375 × 667 |

#### `screenshotConfig.fullPage`
**Type:** `boolean`
**Default:** `false`

- `false` - Capture visible viewport only (faster)
- `true` - Capture entire scrollable page (slower, more comprehensive)

#### `screenshotConfig.selector`
**Type:** `string` (CSS selector, optional)
**Example:** `'#app'`, `'.main-content'`, `'[data-testid="dashboard"]'`

Capture only a specific element. Useful for:
- Testing specific components
- Ignoring headers/footers
- Focusing on problem areas

### Advanced Settings

#### `verbose`
**Type:** `boolean`
**Default:** `true`

Enable detailed console logging. Set to `false` for cleaner output in CI/CD.

#### `visionModel`
**Type:** `'claude-opus' | 'gpt4v' | 'gemini'`
**Default:** `'claude-opus'`

Vision model for UI analysis. Currently only Claude Opus 4 is fully implemented.

#### `implementationModel`
**Type:** `'claude-sonnet'`
**Default:** `'claude-sonnet'`

Code implementation model. Currently only Claude Sonnet 4 with extended thinking is implemented.

## Example Configurations

### SaaS Dashboard

```typescript
export const dashboardConfig: VIZTRITRConfig = {
  projectPath: '/Users/me/saas-app',
  frontendUrl: 'http://localhost:3000/dashboard',
  targetScore: 8.5,
  maxIterations: 5,
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  screenshotConfig: {
    width: 1920,
    height: 1080,
    fullPage: false,
    selector: '.dashboard-container'
  },
  outputDir: '/tmp/viztritr-saas',
  verbose: true
};
```

### Mobile-First App

```typescript
export const mobileConfig: VIZTRITRConfig = {
  projectPath: '/Users/me/mobile-app',
  frontendUrl: 'http://localhost:3000',
  targetScore: 8.0,
  maxIterations: 3,
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  screenshotConfig: {
    width: 375,  // iPhone SE width
    height: 667,
    fullPage: true,  // Capture full scrollable page
    selector: '#app'
  },
  outputDir: '/tmp/viztritr-mobile',
  verbose: true
};
```

### Marketing Landing Page

```typescript
export const landingConfig: VIZTRITRConfig = {
  projectPath: '/Users/me/landing-page',
  frontendUrl: 'http://localhost:3000',
  targetScore: 9.0,  // High bar for marketing
  maxIterations: 7,   // More iterations for refinement
  visionModel: 'claude-opus',
  implementationModel: 'claude-sonnet',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  screenshotConfig: {
    width: 1440,
    height: 900,
    fullPage: true,  // Capture entire page
    selector: undefined  // No selector, capture everything
  },
  outputDir: '/tmp/viztritr-landing',
  verbose: true
};
```

## Troubleshooting

### Frontend Not Accessible

**Error:** `❌ Error: Frontend is not running`

**Solutions:**
1. Verify dev server is running: `curl http://localhost:3000`
2. Check the correct port in `frontendUrl`
3. Ensure no firewall blocking localhost connections
4. Try accessing the URL in your browser first

### Invalid Project Path

**Error:** File modifications fail

**Solutions:**
1. Use absolute paths, not relative: `/Users/me/project` not `./project`
2. Ensure path exists: `ls /path/to/project`
3. Check write permissions: `ls -la /path/to/project`

### Screenshot Element Not Found

**Error:** Screenshot captures incorrectly

**Solutions:**
1. Verify selector exists: Open browser dev tools, run `document.querySelector('#app')`
2. Wait for page load: Add delay in config (not currently supported, contact maintainers)
3. Use a less specific selector
4. Try without a selector first

### Memory Issues

**Error:** Out of memory

**Solutions:**
1. Reduce `maxIterations`
2. Use `fullPage: false` for screenshots
3. Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run test:my-project`

## Best Practices

### 1. Start with Conservative Settings

```typescript
{
  targetScore: 8.0,  // Not 9.0
  maxIterations: 3,  // Not 10
  fullPage: false    // Not true
}
```

Run a quick test first, then increase if needed.

### 2. Use Specific Selectors

Instead of capturing the entire page, target the component you want to improve:

```typescript
selector: '#dashboard'  // Good
selector: undefined     // Less focused
```

### 3. Monitor API Costs

Each iteration makes multiple API calls:
- Vision analysis: ~1-2 API calls
- Implementation: ~2-3 API calls
- Evaluation: ~1 API call

**Total per iteration:** ~4-6 API calls

With `maxIterations: 5`, expect ~20-30 API calls total.

### 4. Check Memory Between Runs

Memory accumulates learnings across runs. Review it:

```bash
cat /path/to/output/memory/iteration-memory.json
```

If it suggests avoiding certain files repeatedly, consider those optimizations carefully.

### 5. Version Control Integration

Before running VIZTRITR:

```bash
# Create a git branch
git checkout -b viztritr-improvements

# Run VIZTRITR
npm run test:my-project

# Review changes
git diff

# Commit if good
git add -A
git commit -m "feat: UI improvements from VIZTRITR"
```

## Next Steps

- **Customize Scoring:** Understand the [8-dimension scoring system](../architecture/ARCHITECTURE.md#scoring-system)
- **Review Results:** Learn to interpret [output files](GETTING_STARTED.md#understanding-the-output)
- **Advanced Usage:** Explore memory system and agent customization
- **Integration:** Set up CI/CD automation

---

**Need help?** Check [GETTING_STARTED.md](GETTING_STARTED.md) or open an issue on GitHub.
