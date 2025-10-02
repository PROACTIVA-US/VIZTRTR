# VIZTRTR Testing Guide

## Setup

### 1. Add API Key

Create `.env` file:

```bash
cd /Users/danielconnolly/Projects/VIZTRTR
nano .env
```

Add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

### 2. Verify Performia is Running

Make sure Performia frontend is running at http://localhost:5001:

```bash
cd /Users/danielconnolly/Projects/Performia/frontend
npm run dev
```

Should show:
```
➜  Local:   http://localhost:5001/
```

### 3. Run VIZTRTR

```bash
cd /Users/danielconnolly/Projects/VIZTRTR
npm run demo
```

## Expected Output

```
🎨 VIZTRTR - Visual Iteration Orchestrator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Project: /Users/danielconnolly/Projects/Performia/frontend
   URL: http://localhost:5001
   Target: 8.5/10
   Max Iterations: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Starting VIZTRTR iteration cycle...
   Target Score: 8.5/10
   Max Iterations: 3
   Output: /Users/danielconnolly/Projects/VIZTRTR/viztritr-output

══════════════════════════════════════════════════════════════════════
📍 ITERATION 1/3
══════════════════════════════════════════════════════════════════════

📸 Step 1: Capturing before screenshot...
   Capturing screenshot of http://localhost:5001...
   Dimensions: 1440x900
   Output: /tmp/screenshot-1234567890.png
✅ Screenshot saved: /tmp/screenshot-1234567890.png

🔍 Step 2: Analyzing UI with Claude Opus vision...
   Current Score: 6.5/10
   Issues Found: 5
   Recommendations: 8

🔧 Step 3: Implementing changes...
   Implementing top 3 recommendations...
   - Add focus indicators
   - Increase spacing scale
   - Improve typography hierarchy
   Files Modified: 0

⏳ Step 4: Waiting for rebuild...

📸 Step 5: Capturing after screenshot...

📊 Step 6: Evaluating result...

📊 Iteration 1 Complete:
   Score: 7.2/10
   Delta: +0.7
   Target: 8.5/10
```

## Output Files

After running, check:

```bash
cd viztritr-output
ls -la
```

You should see:

```
viztritr-output/
├── iteration_0/
│   ├── before.png          # Screenshot before changes
│   ├── after.png           # Screenshot after changes
│   ├── design_spec.json    # Claude's analysis
│   ├── changes.json        # Code changes
│   └── evaluation.json     # Scoring
├── iteration_1/
│   └── ...
├── report.json
└── REPORT.md
```

## Viewing Results

### View Screenshots

```bash
open viztritr-output/iteration_0/before.png
open viztritr-output/iteration_0/after.png
```

### View Analysis

```bash
cat viztritr-output/iteration_0/design_spec.json | jq .
```

### View Report

```bash
cat viztritr-output/REPORT.md
```

Or open in VS Code:

```bash
code viztritr-output/REPORT.md
```

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not found"

Make sure `.env` file exists and contains your API key:

```bash
cat .env
# Should show: ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "Failed to navigate to URL"

Make sure Performia frontend is running:

```bash
curl http://localhost:5001
# Should return HTML
```

### Error: "Cannot find module"

Rebuild the project:

```bash
npm run build
```

### Puppeteer Issues

If Puppeteer fails to launch Chrome:

```bash
# macOS
# Install Chrome manually if needed
brew install --cask google-chrome
```

## Next Steps

After successful test:

1. Review `viztritr-output/REPORT.md`
2. Check Claude's design recommendations
3. Implement top improvements manually
4. Run again to verify score improvement
5. Iterate until 8.5+/10

## API Usage

To check your Anthropic API usage:

https://console.anthropic.com/settings/usage

## Cost Estimate

- Vision analysis: ~$0.01-0.05 per screenshot
- 3 iterations: ~$0.10-0.30 total
- 10 iterations: ~$0.30-1.00 total
