# Gemini Integration Guide

This guide explains how to use Google Gemini models with VIZTRTR, including the new Gemini 2.5 Computer Use Preview model.

## Overview

VIZTRTR now supports Google Gemini models for:

- **Vision Analysis**: Gemini 2.0 Flash Exp, Gemini 1.5 Pro/Flash
- **Implementation**: Gemini 2.5 Computer Use Preview (browser automation)
- **Evaluation**: Gemini 1.5 Pro

## Quick Start

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or select a project
3. Generate an API key
4. Add to your `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
# or
GOOGLE_API_KEY=your_api_key_here
```

### 2. Configure VIZTRTR

Create a configuration with Gemini models:

```typescript
import type { VIZTRTRConfig } from 'viztrtr';

const config: VIZTRTRConfig = {
  projectPath: '/path/to/your/project',
  frontendUrl: 'http://localhost:5173',
  targetScore: 8.5,
  maxIterations: 5,

  providers: {
    google: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
  },

  models: {
    // Vision: Fast, cost-effective analysis
    vision: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.3,
    },

    // Implementation: Browser automation with Computer Use
    implementation: {
      provider: 'google',
      model: 'gemini-2.5-computer-use-preview-10-2025',
      temperature: 0.2,
    },

    // Evaluation: Detailed scoring
    evaluation: {
      provider: 'google',
      model: 'gemini-1.5-pro',
      temperature: 0.1,
    },
  },

  screenshotConfig: {
    width: 1920,
    height: 1080,
  },

  outputDir: './viztritr-output',
  verbose: true,
};
```

### 3. Run VIZTRTR

```bash
npm run build
node dist/examples/gemini-demo.js
```

## Available Gemini Models

### Vision Models

| Model                  | Description                          | Best For                                 |
| ---------------------- | ------------------------------------ | ---------------------------------------- |
| `gemini-2.0-flash-exp` | Latest experimental model, very fast | General vision analysis, high throughput |
| `gemini-1.5-pro`       | High-quality multimodal model        | Detailed analysis, complex UIs           |
| `gemini-1.5-flash`     | Faster version of 1.5 Pro            | Balanced speed/quality                   |
| `gemini-1.0-pro`       | Original production model            | Stable, proven performance               |

### Implementation Models

| Model                                     | Description              | Capabilities                                         |
| ----------------------------------------- | ------------------------ | ---------------------------------------------------- |
| `gemini-2.5-computer-use-preview-10-2025` | Browser automation model | Direct UI interaction, file editing, code generation |

**Note**: Computer Use model is in preview and requires special access. Features:

- Screenshot-based UI understanding
- Browser automation (click, type, scroll)
- File system access for code changes
- Action planning and execution

### Evaluation Models

Use any vision model for evaluation. Recommended: `gemini-1.5-pro` for detailed assessments.

## Gemini Computer Use

The Gemini 2.5 Computer Use Preview model brings unique capabilities:

### How It Works

1. **Screenshot Analysis**: Gemini analyzes UI screenshots
2. **Action Planning**: Generates step-by-step implementation plan
3. **File Modifications**: Applies surgical code changes
4. **Browser Control**: Can interact with running frontend (future feature)

### Example Implementation Flow

```typescript
import { createGeminiImplementationPlugin } from 'viztrtr';

const plugin = createGeminiImplementationPlugin();

// Gemini analyzes the recommendation and generates file changes
const changes = await plugin.implementChanges(designSpec, projectPath);

console.log(changes.summary);
// "Implemented 'Improve button color contrast': 2 files edited"
```

### Limitations

- **Preview Model**: API may change, request rate limits
- **File Focus**: Best at editing existing files, not complex refactors
- **Security**: Respects project path boundaries for safety

## Hybrid Configurations

Mix and match providers for optimal results:

### Claude Vision + Gemini Implementation

```typescript
{
  providers: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    google: { apiKey: process.env.GEMINI_API_KEY }
  },
  models: {
    vision: {
      provider: 'anthropic',
      model: 'claude-opus-4-20250514' // Best-in-class analysis
    },
    implementation: {
      provider: 'google',
      model: 'gemini-2.5-computer-use-preview-10-2025' // Automation
    },
    evaluation: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5-20250402' // Fast scoring
    }
  }
}
```

### Gemini Everything (Cost-Effective)

```typescript
{
  providers: {
    google: { apiKey: process.env.GEMINI_API_KEY }
  },
  models: {
    vision: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp' // Fastest
    },
    implementation: {
      provider: 'google',
      model: 'gemini-2.5-computer-use-preview-10-2025'
    },
    evaluation: {
      provider: 'google',
      model: 'gemini-1.5-flash' // Good balance
    }
  }
}
```

## Cost Comparison

Gemini models are generally more cost-effective than Claude:

| Provider  | Model                | Input (per 1M tokens) | Output (per 1M tokens) |
| --------- | -------------------- | --------------------- | ---------------------- |
| Google    | gemini-2.0-flash-exp | $0.10                 | $0.40                  |
| Google    | gemini-1.5-pro       | $1.25                 | $5.00                  |
| Google    | gemini-1.5-flash     | $0.15                 | $0.60                  |
| Anthropic | claude-opus-4        | $15.00                | $75.00                 |
| Anthropic | claude-sonnet-4.5    | $3.00                 | $15.00                 |

> **Note**: Prices approximate, check current provider pricing

## Performance Tips

### Speed Optimization

1. **Use Flash models** for vision/evaluation (faster, cheaper)
2. **Lower temperature** (0.1-0.3) for consistent outputs
3. **Reduce maxTokens** to minimum needed
4. **Enable caching** if available

### Quality Optimization

1. **Use Pro models** for complex UIs
2. **Provide detailed project context** in config
3. **Use higher temperature** (0.5-0.7) for creative suggestions
4. **Enable verbose logging** to debug issues

## Troubleshooting

### API Key Issues

```bash
# Check environment variable
echo $GEMINI_API_KEY

# Test API access
curl https://generativelanguage.googleapis.com/v1beta/models \
  -H "x-goog-api-key: $GEMINI_API_KEY"
```

### Rate Limiting

Gemini has per-minute request limits. If you hit limits:

1. Add delay between iterations
2. Use Flash models (higher limits)
3. Request quota increase in Google Cloud Console

### Model Access

Computer Use Preview model may require:

- Waitlist approval
- Special project configuration
- Updated API client library

Check [Google AI Studio](https://makersuite.google.com) for access status.

## Example: Full Workflow

```typescript
import { VIZTRTROrchestrator } from 'viztrtr';
import { geminiConfig } from './examples/gemini-config-example';

async function improveUI() {
  const orchestrator = new VIZTRTROrchestrator(geminiConfig);

  const report = await orchestrator.run();

  console.log(`Final score: ${report.finalScore}/10`);
  console.log(`Iterations: ${report.totalIterations}`);
  console.log(`Target reached: ${report.targetReached}`);
}

improveUI().catch(console.error);
```

## Next Steps

- **Review examples**: Check `examples/gemini-config-example.ts`
- **Run demo**: `npm run build && node dist/examples/gemini-demo.js`
- **Monitor costs**: Track API usage in Google Cloud Console
- **Experiment**: Try different model combinations
- **Contribute**: Share your Gemini configurations!

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Computer Use Preview](https://ai.google.dev/docs/computer_use)
- [Pricing](https://ai.google.dev/pricing)
- [Model Capabilities](https://ai.google.dev/models)

## Support

Questions or issues? Open an issue on GitHub or check the main VIZTRTR documentation.
