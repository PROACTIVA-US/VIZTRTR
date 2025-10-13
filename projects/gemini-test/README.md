# Gemini Computer Use Test Project

Simple test project for validating Gemini 2.5 Computer Use integration.

## Setup

1. **Start local server:**

```bash
cd projects/gemini-test
python3 -m http.server 8080
```

2. **Run test (in new terminal):**

```bash
npm run build
node dist/projects/gemini-test/test.js
```

## What it does

1. Captures screenshot of the test page
1. Analyzes design with Claude Opus 4
1. Implements top 2 recommendations using Gemini Computer Use
1. Shows actions taken in the browser

## Test Page

Simple HTML page with:

- Header text
- Body paragraph
- Input field
- Button

Gemini will interact with the browser to modify the UI based on design recommendations.
