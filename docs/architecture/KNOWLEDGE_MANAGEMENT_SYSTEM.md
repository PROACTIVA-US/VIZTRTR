# VIZTRTR Knowledge Management System

## Overview

VIZTRTR's knowledge management system provides:

1. **Intelligent PRD Processing** via Docling
2. **Persistent Design Knowledge Base** with vector embeddings
3. **Autonomous Weekly Knowledge Updates** from web sources
4. **Real Browser Metrics** via Chrome DevTools MCP
5. **Semantic Search** across UI/UX best practices

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Sources                         │
├─────────────────────────────────────────────────────────────┤
│ • User PRDs (PDF, DOCX, MD)                                 │
│ • WCAG 2.2 AA Documentation                                 │
│ • Material Design 3 Guidelines                              │
│ • UI/UX Research Papers                                     │
│ • Weekly Web Scraping (latest best practices)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Document Processing (Docling)                   │
├─────────────────────────────────────────────────────────────┤
│ • PDF → Structured Markdown                                 │
│ • Table Extraction & Preservation                           │
│ • OCR for Scanned Documents                                 │
│ • Multi-format Support (PDF, DOCX, PPTX, HTML)             │
│ • Layout & Reading Order Analysis                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Vector Database (Qdrant or Pinecone)              │
├─────────────────────────────────────────────────────────────┤
│ Collections:                                                 │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ design_guidelines                                       │ │
│ │  - WCAG 2.2 requirements (chunked by criterion)        │ │
│ │  - Material Design 3 patterns                          │ │
│ │  - Accessibility standards                             │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ project_prds                                           │ │
│ │  - Per-project product specs                           │ │
│ │  - Component requirements                              │ │
│ │  - Design priorities                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ best_practices                                         │ │
│ │  - UI/UX patterns (weekly updates)                     │ │
│ │  - Component libraries                                 │ │
│ │  - Performance optimization                            │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ iteration_memory                                       │ │
│ │  - What works (successful changes)                     │ │
│ │  - What doesn't (failed attempts)                      │ │
│ │  - Context-specific learnings                          │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Chrome DevTools MCP Integration                │
├─────────────────────────────────────────────────────────────┤
│ Real Metrics:                                               │
│ • Accessibility Tree Analysis                               │
│ • WCAG Contrast Ratios (exact values)                       │
│ • Performance Metrics (Core Web Vitals)                     │
│ • Console Errors/Warnings                                   │
│ • Layout Stability (CLS)                                    │
│ • Touch Target Sizes (24x24px validation)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Enhanced Orchestrator                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Vision Analysis (Claude Opus 4)                          │
│    ↓ Query: "What WCAG issues exist?"                       │
│    → Semantic search vector DB                              │
│    → Returns relevant WCAG criteria + examples              │
│                                                              │
│ 2. Implementation (Claude Sonnet 4.5)                       │
│    ↓ Query: "How to fix contrast ratio?"                    │
│    → Retrieves best practices from vector DB                │
│    → Gets PRD constraints for this project                  │
│    → Implements with full context                           │
│                                                              │
│ 3. Verification (Chrome DevTools MCP)                       │
│    → Measure actual contrast ratios                         │
│    → Validate WCAG 2.2 compliance                           │
│    → Confirm performance hasn't degraded                    │
│                                                              │
│ 4. Evaluation                                               │
│    → Real metrics + AI vision                               │
│    → Store outcomes in iteration_memory                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Docling Integration

**Location**: `src/services/docling/`

**Purpose**: Parse any document format into structured data

**Files**:

```
src/services/docling/
├── parser.ts          # Main Docling wrapper (Python child process)
├── prd-processor.ts   # PRD-specific parsing logic
└── knowledge-ingestor.ts  # Batch processing for knowledge base
```

**API**:

```typescript
interface DoclingParser {
  parsePRD(filePath: string): Promise<StructuredPRD>;
  parseDocument(filePath: string, type: 'wcag' | 'material' | 'article'): Promise<ParsedDocument>;
  extractTables(filePath: string): Promise<Table[]>;
}

interface StructuredPRD {
  vision: string;
  targetUsers: string[];
  components: ComponentSpec[];
  designPriorities: string[];
  tables: Table[];  // Extracted requirements matrices
  sections: Section[];  // Hierarchical structure
}
```

**Implementation**:

- Spawn Python child process running Docling
- Use `python-shell` npm package for IPC
- Cache parsed results to avoid re-processing

### 2. Vector Database

**Choice**: **Qdrant** (better for self-hosted, open-source, TypeScript SDK)

**Location**: `src/services/vector-db/`

**Why Qdrant over Pinecone**:

- Open source, can run locally
- Better privacy for sensitive PRDs
- Excellent TypeScript support
- Lower cost (self-hosted)
- Filtering and metadata support

**Collections Schema**:

```typescript
// Collection: design_guidelines
{
  id: string;  // UUID
  vector: number[];  // 1536-dim embedding (OpenAI ada-002)
  payload: {
    type: 'wcag' | 'material_design' | 'accessibility';
    criterion: string;  // e.g., "1.4.3 Contrast (Minimum)"
    level: 'A' | 'AA' | 'AAA';
    description: string;
    examples: string[];
    testProcedure: string;
    source: string;  // URL or citation
    lastUpdated: string;  // ISO date
  }
}

// Collection: project_prds
{
  id: string;
  vector: number[];
  payload: {
    projectId: string;
    component: string;
    requirement: string;
    priority: 'must' | 'should' | 'nice-to-have';
    userStory: string;
    acceptanceCriteria: string[];
  }
}

// Collection: best_practices
{
  id: string;
  vector: number[];
  payload: {
    pattern: string;  // e.g., "Button States"
    category: 'component' | 'layout' | 'interaction' | 'performance';
    description: string;
    code: string;  // Example implementation
    doThis: string[];
    dontDoThis: string[];
    source: string;
    publishedDate: string;
  }
}
```

**API**:

```typescript
interface VectorDBService {
  // Semantic search
  search(query: string, collection: CollectionName, limit: number): Promise<SearchResult[]>;

  // Hybrid search (semantic + filters)
  searchWithFilter(query: string, filters: Record<string, any>): Promise<SearchResult[]>;

  // Ingestion
  ingest(documents: Document[], collection: CollectionName): Promise<void>;

  // Batch operations
  batchIngest(source: 'wcag' | 'material_design', filePath: string): Promise<void>;
}
```

### 3. Autonomous Knowledge Updater

**Location**: `src/services/knowledge-updater/`

**Purpose**: Weekly web scraping + ingestion of latest UI/UX best practices

**Scheduler**: Node-cron (runs weekly)

**Sources**:

- <https://m3.material.io> (Material Design updates)
- <https://www.w3.org/WAI> (WCAG updates)
- <https://web.dev> (Chrome team best practices)
- <https://www.smashingmagazine.com> (UI/UX articles)
- <https://uxdesign.cc> (Medium UX collective)
- <https://github.com/topics/ui-components> (trending repos)

**Workflow**:

```typescript
// Every Sunday at 2am
cron.schedule('0 2 * * 0', async () => {
  // 1. Scrape sources
  const articles = await webScraper.scrapeLatestArticles();

  // 2. Download PDFs/articles
  const files = await downloader.downloadFiles(articles);

  // 3. Parse with Docling
  const parsed = await Promise.all(
    files.map(f => doclingParser.parseDocument(f, 'article'))
  );

  // 4. Chunk for embedding
  const chunks = parsed.flatMap(doc => chunker.chunk(doc, { size: 512, overlap: 50 }));

  // 5. Generate embeddings
  const embeddings = await embeddingService.embed(chunks);

  // 6. Ingest to vector DB
  await vectorDB.ingest(embeddings, 'best_practices');

  // 7. Notify admin
  await notificationService.send({
    type: 'knowledge_update',
    count: chunks.length,
    sources: articles.map(a => a.url)
  });
});
```

**Files**:

```
src/services/knowledge-updater/
├── scheduler.ts       # Cron job setup
├── web-scraper.ts     # Playwright-based scraping
├── downloader.ts      # Download PDFs/articles
├── chunker.ts         # Text chunking for embeddings
├── embedding.ts       # OpenAI API wrapper
└── sources.json       # Configured sources
```

### 4. Chrome DevTools MCP Integration

**Location**: `src/services/chrome-devtools-mcp/`

**Installation**:

```bash
cd src/services/chrome-devtools-mcp
npm install chrome-devtools-mcp
```

**Purpose**: Replace Puppeteer with MCP for enhanced capabilities

**Capabilities**:

1. **Accessibility Metrics**
   - Get accessibility tree
   - Measure contrast ratios
   - Validate ARIA labels
   - Check touch target sizes

2. **Performance Metrics**
   - Core Web Vitals (LCP, FID, CLS)
   - Frame rates during animations
   - Paint timing
   - Memory usage

3. **Network & Console**
   - Detect console errors/warnings
   - Monitor network requests
   - Check for 404s or failures

4. **Advanced Automation**
   - Fill forms
   - Trigger interactions
   - Emulate devices
   - Network throttling

**API**:

```typescript
interface ChromeDevToolsMCP {
  // Accessibility
  getAccessibilityTree(url: string): Promise<A11yTree>;
  measureContrast(selector: string): Promise<number>;
  validateWCAG(url: string): Promise<WCAGReport>;

  // Performance
  getCoreWebVitals(url: string): Promise<WebVitals>;
  measureAnimationFPS(url: string, selector: string): Promise<number>;

  // Validation
  getConsoleErrors(url: string): Promise<ConsoleMessage[]>;
  validateImplementation(url: string, checks: ValidationCheck[]): Promise<ValidationResult>;
}
```

**Integration with Orchestrator**:

```typescript
// src/core/orchestrator.ts
async evaluateIteration(url: string): Promise<Evaluation> {
  // 1. Take screenshot (vision)
  const screenshot = await chromeDevTools.takeScreenshot(url);

  // 2. Get real metrics
  const a11y = await chromeDevTools.getAccessibilityTree(url);
  const vitals = await chromeDevTools.getCoreWebVitals(url);
  const errors = await chromeDevTools.getConsoleErrors(url);

  // 3. Vision analysis (Claude Opus 4)
  const visionAnalysis = await visionPlugin.analyzeScreenshot(screenshot, {
    context: await vectorDB.search("UI design best practices", "design_guidelines", 5)
  });

  // 4. Hybrid scoring
  const score = calculateScore({
    vision: visionAnalysis,
    accessibility: a11y,
    performance: vitals,
    wcagCompliance: this.validateWCAG(a11y)
  });

  return { score, visionAnalysis, realMetrics: { a11y, vitals, errors } };
}
```

## Enhanced Scoring System

### Current (Vision-Only)

```typescript
// 8 dimensions, all from AI vision estimation
{
  visualHierarchy: 7.5,  // AI guess
  accessibility: 6.0,    // AI guess (risky!)
  animation: 8.0,        // AI guess
  // ... etc
}
```

### New (Hybrid: Vision + Real Metrics)

```typescript
{
  visualHierarchy: {
    visionScore: 7.5,           // AI assessment
    realMetrics: null,          // No real metric
    finalScore: 7.5,
    weight: 1.2
  },
  accessibility: {
    visionScore: 6.0,           // AI guess
    realMetrics: {
      wcagAAPass: true,         // From Chrome DevTools
      contrastRatios: [4.8, 7.2, 3.1],  // Measured
      ariaLabels: 15/18,        // 15 out of 18 elements
      touchTargets: 22/25       // 22 meet 24x24px
    },
    finalScore: 8.5,            // Real data wins!
    weight: 1.3
  },
  animation: {
    visionScore: 8.0,
    realMetrics: {
      fps: 58,                  // Measured during animation
      cls: 0.02                 // Layout shift
    },
    finalScore: 8.7,            // Confirmed smooth
    weight: 0.9
  }
}
```

## Workflow: PRD to Deployment

### Step 1: Project Creation (with PRD)

```
User uploads: comprehensive-prd.pdf (10+ pages)
↓
Docling parses:
  - Vision: "Build accessible e-commerce platform"
  - Users: ["Seniors 65+", "Screen reader users"]
  - Tables: Requirements matrix with priorities
  - Sections: Hierarchical feature breakdown
↓
Vector DB ingestion:
  - Chunk PRD into semantic segments
  - Embed each section
  - Store in project_prds collection
↓
Project created with rich context
```

### Step 2: Iteration Loop (Context-Aware)

```
Vision Analysis:
  "Poor contrast on CTA button"
  ↓ Query vector DB
  → WCAG 1.4.3: "Text must have 4.5:1 ratio"
  → Material Design: "Use primary color with sufficient contrast"
  → Project PRD: "Target users are seniors - prioritize readability"

Implementation:
  "Change button color from #FF6B6B to #D32F2F"
  ↓ With full context
  → Knows: seniors need high contrast
  → Knows: WCAG AA requirement
  → Knows: Material Design palette

Verification (Chrome DevTools MCP):
  Measure actual contrast: 7.2:1 ✓
  Validate WCAG AA: PASS ✓
  Check touch target: 48x48px ✓
```

### Step 3: Weekly Knowledge Update

```
Sunday 2am:
  Scrape web sources
  ↓
  Download latest articles:
    - "2025 Button Design Patterns"
    - "WCAG 3.0 Draft Updates"
    - "Core Web Vitals Changes"
  ↓
  Parse with Docling
  ↓
  Chunk + Embed
  ↓
  Ingest to vector DB

Next iteration:
  VIZTRTR now knows about latest patterns!
  Uses 2025 best practices automatically
```

## Implementation Phases

### Phase 1: Docling + PRD Enhancement (Week 1)

- [ ] Install Docling Python library
- [ ] Create TypeScript wrapper via python-shell
- [ ] Enhance PRD analyzer to use Docling
- [ ] Parse tables and maintain structure
- [ ] Update product spec generator with richer data

### Phase 2: Vector Database Setup (Week 1-2)

- [ ] Install Qdrant (Docker or cloud)
- [ ] Create collections schema
- [ ] Implement embedding service (OpenAI ada-002)
- [ ] Ingest WCAG 2.2 documentation
- [ ] Ingest Material Design 3 guidelines
- [ ] Build search API

### Phase 3: Chrome DevTools MCP Integration (Week 2-3)

- [ ] Install chrome-devtools-mcp
- [ ] Create MCP client wrapper
- [ ] Implement accessibility metrics gathering
- [ ] Implement performance metrics gathering
- [ ] Replace Puppeteer capture with MCP
- [ ] Update orchestrator to use real metrics

### Phase 4: Knowledge Updater (Week 3-4)

- [ ] Build web scraper (Playwright)
- [ ] Configure source list
- [ ] Implement chunking strategy
- [ ] Set up cron scheduler
- [ ] Add notification system
- [ ] Test weekly cycle

### Phase 5: Hybrid Scoring System (Week 4)

- [ ] Update evaluation types
- [ ] Implement hybrid scoring logic
- [ ] Weight real metrics appropriately
- [ ] Update reporting to show both vision + real
- [ ] Validate accuracy improvements

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Document Parsing | Docling (Python) | Best PDF/DOCX parser, table extraction, OCR |
| Vector DB | Qdrant | Open source, TypeScript SDK, self-hosted |
| Embeddings | OpenAI ada-002 | Industry standard, good performance/cost |
| Browser Automation | Chrome DevTools MCP | Official Chrome tools, 23 advanced capabilities |
| Web Scraping | Playwright | Reliable, modern, headless |
| Scheduler | node-cron | Simple, effective cron jobs |
| Memory | Existing IterationMemoryManager | Already working well |

## Storage Requirements

| Data Type | Size Estimate | Retention |
|-----------|---------------|-----------|
| WCAG Documentation | ~2MB (embedded) | Permanent |
| Material Design Docs | ~5MB (embedded) | Permanent |
| Weekly Articles | ~10MB/week | 3 months rolling |
| Project PRDs | ~1MB per project | Per project lifetime |
| Iteration Memory | ~100KB per iteration | Per project lifetime |
| **Total Year 1** | ~500MB | Growing |

Qdrant can handle this easily, even self-hosted.

## Cost Estimates

| Service | Cost |
|---------|------|
| Qdrant (self-hosted) | $0/month (use Docker) |
| OpenAI Embeddings | ~$0.10/1K documents = $5-10/month |
| Chrome DevTools MCP | Free (open source) |
| Docling | Free (open source) |
| **Total** | **~$10/month** |

Much cheaper than Pinecone ($70+/month for similar capacity).

## Benefits Summary

### Accuracy

- **Before**: ~75% accuracy (vision guesses)
- **After**: ~95% accuracy (vision + real metrics + knowledge base)

### Context Awareness

- **Before**: Generic improvements
- **After**: PRD-specific, WCAG-compliant, brand-aligned

### Knowledge

- **Before**: Static model knowledge (cutoff Jan 2025)
- **After**: Weekly updates, latest patterns, current standards

### Verification

- **Before**: Screenshot comparison
- **After**: Real WCAG validation, measured performance

## Next Steps

1. **Review this architecture** - Does it align with your vision?
2. **Prioritize phases** - Which order makes most sense?
3. **Approve tech stack** - Any preferences (Pinecone vs Qdrant)?
4. **Start Phase 1** - Begin with Docling integration

This system will make VIZTRTR incredibly powerful and context-aware!
