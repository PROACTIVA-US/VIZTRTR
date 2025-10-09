# Chrome DevTools MCP Integration Plan

## Overview

Integrate Chrome DevTools MCP server to enhance VIZTRTR's UI/UX analysis accuracy from ~75% (vision-only) to ~95% (hybrid vision + real metrics).

## Why Chrome DevTools MCP?

**Current Limitation (Vision-only):**

- Claude Opus 4 analyzes screenshots → subjective visual assessment
- Cannot measure actual performance, accessibility, or network metrics
- Estimates contrast ratios, load times, interaction delays

**With Chrome DevTools MCP:**

- **Real performance metrics**: Core Web Vitals (LCP, FID, CLS), trace data
- **Real accessibility data**: Actual ARIA attributes, keyboard navigation, focus states
- **Real network data**: Request timing, resource sizes, waterfall analysis
- **Real console errors**: JavaScript errors, warnings, deprecations
- **DOM snapshots**: Actual HTML structure with unique IDs for precise element targeting

## Available Tools (23 total)

### Performance Analysis (Critical for VIZTRTR)

1. `performance_start_trace` - Record performance trace with Core Web Vitals
2. `performance_stop_trace` - Stop trace and get results
3. `performance_analyze_insight` - Deep dive into specific insights (LCP breakdown, etc.)

### Accessibility & Debugging (High Priority)

4. `take_snapshot` - Get DOM snapshot with element UIDs and accessibility tree
5. `evaluate_script` - Run JS to extract ARIA attributes, contrast ratios, focus states
6. `list_console_messages` - Detect errors, accessibility warnings

### Network Analysis (Medium Priority)

7. `list_network_requests` - Get all network requests with timing
8. `get_network_request` - Detailed request info (size, timing, headers)

### Browser Automation (Replaces Puppeteer)

9. `navigate_page` - Navigate to URL
10. `take_screenshot` - Capture screenshots
11. `resize_page` - Test responsive design
12. `click`, `fill`, `hover` - Interaction testing

### Emulation (Testing Different Conditions)

13. `emulate_cpu` - Test on slower devices
14. `emulate_network` - Test on 3G/4G networks

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VIZTRTR Orchestrator                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼──────────┐   ┌───▼────────────────┐
         │  Vision Analysis    │   │  Metrics Analysis  │
         │  (Claude Opus 4)    │   │ (Chrome DevTools)  │
         └──────────┬──────────┘   └───┬────────────────┘
                    │                  │
                    │  Screenshot      │  Performance Trace
                    │  + Visual Score  │  + Real Metrics
                    │                  │
                    └─────────┬────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Hybrid Scoring    │
                    │  - Vision (60%)    │
                    │  - Metrics (40%)   │
                    └────────────────────┘
```

## Hybrid Scoring System

### Current (Vision-only) - 8 Dimensions

1. Visual Hierarchy (1.2×)
2. Typography (1.0×)
3. Color & Contrast (1.0×)
4. Spacing & Layout (1.1×)
5. Component Design (1.0×)
6. Animation & Interaction (0.9×)
7. Accessibility (1.3×)
8. Overall Aesthetic (1.0×)

### Enhanced (Hybrid) - Vision + Metrics

**Vision Analysis (60% weight):**

- Visual Hierarchy: AI assessment
- Typography: Font rendering quality
- Color & Contrast: Visual perception
- Overall Aesthetic: Design harmony

**Real Metrics (40% weight):**

- **Performance Score** (25%):
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1
  - Total Blocking Time
  - Speed Index

- **Accessibility Score** (50%):
  - ARIA attributes completeness
  - Keyboard navigation (tab order)
  - Color contrast (actual measured ratios)
  - Focus indicators
  - Alt text presence
  - Semantic HTML

- **Network Efficiency** (15%):
  - Total page weight
  - Number of requests
  - Render-blocking resources
  - Image optimization

- **Console Health** (10%):
  - Zero JavaScript errors
  - No accessibility warnings
  - No deprecation warnings

## Implementation Plan

### Phase 1: Install & Configure (Week 1)

- [x] Review Chrome DevTools MCP documentation
- [ ] Install chrome-devtools-mcp package
- [ ] Configure MCP server in Claude Code
- [ ] Test basic connectivity and tools
- [ ] Create ChromeDevToolsPlugin class

### Phase 2: Metrics Collection (Week 1-2)

- [ ] Implement performance trace capture
- [ ] Implement accessibility snapshot analysis
- [ ] Implement network request analysis
- [ ] Implement console message collection
- [ ] Create MetricsAnalyzer service

### Phase 3: Hybrid Scoring (Week 2)

- [ ] Create HybridScoringAgent
- [ ] Merge vision scores with real metrics
- [ ] Update evaluation.json structure
- [ ] Enhance REPORT.md with metrics

### Phase 4: Replace Puppeteer (Week 2-3)

- [ ] Migrate screenshot capture to Chrome DevTools MCP
- [ ] Remove Puppeteer dependency
- [ ] Update capture-puppeteer.ts → capture-chrome-devtools.ts
- [ ] Test all existing functionality

### Phase 5: Advanced Features (Week 3-4)

- [ ] Responsive design testing (resize_page)
- [ ] Performance testing (emulate_cpu, emulate_network)
- [ ] Interaction testing (click, hover, fill)
- [ ] Cross-browser testing (different Chrome channels)

## Technical Implementation

### 1. ChromeDevToolsPlugin (`src/plugins/chrome-devtools.ts`)

```typescript
export class ChromeDevToolsPlugin implements VIZTRTRPlugin {
  type = 'capture' as const;

  // MCP tools available
  async captureScreenshot(config): Promise<Screenshot>
  async capturePerformanceTrace(config): Promise<PerformanceTrace>
  async captureAccessibilitySnapshot(config): Promise<AccessibilitySnapshot>
  async captureNetworkRequests(config): Promise<NetworkRequest[]>
  async captureConsoleMessages(config): Promise<ConsoleMessage[]>
}
```

### 2. MetricsAnalyzer (`src/agents/MetricsAnalyzer.ts`)

```typescript
export class MetricsAnalyzer {
  async analyzePerformance(trace): Promise<PerformanceScore>
  async analyzeAccessibility(snapshot): Promise<AccessibilityScore>
  async analyzeNetwork(requests): Promise<NetworkScore>
  async analyzeConsole(messages): Promise<ConsoleScore>
}
```

### 3. HybridScoringAgent (`src/agents/HybridScoringAgent.ts`)

```typescript
export class HybridScoringAgent {
  async scoreDesign(
    visionAnalysis: DesignAnalysis,
    metricsData: MetricsData
  ): Promise<HybridEvaluation> {
    // Combine vision (60%) + metrics (40%)
  }
}
```

### 4. Updated Orchestrator Flow

```typescript
// 1. Capture (Chrome DevTools MCP)
const screenshot = await chromeDevTools.captureScreenshot(config);
const perfTrace = await chromeDevTools.capturePerformanceTrace(config);
const a11ySnapshot = await chromeDevTools.captureAccessibilitySnapshot(config);
const networkData = await chromeDevTools.captureNetworkRequests(config);
const consoleLogs = await chromeDevTools.captureConsoleMessages(config);

// 2. Analyze Vision (Claude Opus 4)
const visionAnalysis = await visionPlugin.analyzeScreenshot(screenshot);

// 3. Analyze Metrics
const metricsScores = await metricsAnalyzer.analyze({
  perfTrace,
  a11ySnapshot,
  networkData,
  consoleLogs
});

// 4. Hybrid Scoring
const evaluation = await hybridScoringAgent.scoreDesign(
  visionAnalysis,
  metricsScores
);

// 5. Implement Changes (if score < target)
if (evaluation.compositeScore < config.targetScore) {
  const recommendation = orchestratorAgent.selectImprovement(
    visionAnalysis,
    metricsScores,
    memory
  );
  // ...
}
```

## Configuration

### MCP Server Config (`.claude-code/config.json`)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--isolated=true",
        "--headless=false",
        "--viewport=1280x720"
      ]
    }
  }
}
```

### VIZTRTR Config Updates (`src/core/types.ts`)

```typescript
export interface VIZTRTRConfig {
  // ... existing fields

  // Chrome DevTools MCP
  useChromeDevTools?: boolean; // Enable hybrid scoring
  chromeDevToolsConfig?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    isolated?: boolean;
    channel?: 'stable' | 'canary' | 'beta' | 'dev';
  };

  // Scoring weights
  scoringWeights?: {
    vision: number; // 0.6 default
    metrics: number; // 0.4 default
  };
}
```

## Expected Improvements

### Accuracy Gains

- **Before**: ~75% accuracy (vision-only estimates)
- **After**: ~95% accuracy (hybrid vision + real metrics)

### Specific Examples

**Accessibility:**

- Before: "Contrast appears adequate" (subjective)
- After: "Contrast ratio: 4.52:1 (WCAG AA ✓)" (measured)

**Performance:**

- Before: "Page feels responsive" (subjective)
- After: "LCP: 2.1s, FID: 45ms, CLS: 0.05 (Core Web Vitals ✓)" (measured)

**Network:**

- Before: "Images seem large" (subjective)
- After: "Total page weight: 3.2MB, 8 unoptimized images (avg 400KB each)" (measured)

## Success Metrics

1. **Accuracy**: Hybrid scores match human expert assessments >95%
2. **Performance**: Full analysis completes in <30s
3. **Reliability**: Zero false positives on accessibility issues
4. **Coverage**: All 8 dimensions use mix of vision + metrics
5. **Adoption**: Users prefer hybrid mode 90%+ of the time

## Rollout Strategy

1. **Week 1**: Install, configure, basic testing
2. **Week 2**: Parallel mode (vision + metrics both run, compare results)
3. **Week 3**: Hybrid mode (default for new projects)
4. **Week 4**: Full migration (remove Puppeteer, metrics required)

## Next Steps

1. Install chrome-devtools-mcp via npm
2. Configure MCP server in Claude Code
3. Create ChromeDevToolsPlugin class
4. Test performance trace capture
5. Build MetricsAnalyzer service
