# Prompt Evaluation Endpoint

## Overview

The `/api/evaluate-prompt` endpoint uses Claude Sonnet 4 to analyze user prompts and automatically determine the optimal agent configuration needed to complete a project. This enables intelligent project planning and resource allocation.

## Endpoint Details

**URL:** `POST /api/evaluate-prompt`

**Request Body:**
```json
{
  "prompt": "Build an interactive dashboard with real-time data",
  "type": "prompt"  // or "prd"
}
```

**Response:**
```json
{
  "suggestedAgents": [
    {
      "id": "architect-1",
      "type": "architect",
      "name": "System Architect",
      "description": "Plans the technical architecture and component structure",
      "tasks": [
        {
          "description": "Define component hierarchy",
          "priority": "high"
        }
      ]
    },
    {
      "id": "designer-1",
      "type": "designer",
      "name": "UI/UX Designer",
      "description": "Creates design specifications and visual recommendations",
      "tasks": [
        {
          "description": "Design dashboard layout and component structure",
          "priority": "high"
        }
      ]
    },
    {
      "id": "engineer-1",
      "type": "engineer",
      "name": "Implementation Engineer",
      "description": "Implements code changes and features",
      "tasks": [
        {
          "description": "Build dashboard components",
          "priority": "high"
        }
      ]
    },
    {
      "id": "viztritr-1",
      "type": "viztritr",
      "name": "VIZTRTR Quality Evaluator",
      "description": "Evaluates UI quality and iterates until target score is reached",
      "tasks": [
        {
          "description": "Evaluate UI across 8 quality dimensions",
          "priority": "high"
        }
      ]
    }
  ],
  "projectType": "Interactive Dashboard",
  "complexity": "moderate",
  "estimatedDuration": "4-6 iterations",
  "keyFeatures": [
    "Real-time data visualization",
    "Interactive components",
    "Responsive layout"
  ],
  "technicalRequirements": [
    "React",
    "Chart library (D3.js/Chart.js)",
    "WebSocket or polling for real-time updates"
  ]
}
```

## Available Agent Types

### 1. Architect (`architect`)
- **Purpose:** Technical planning and system design
- **When to use:** Complex projects, new features, major refactors
- **Responsibilities:**
  - Plans project structure
  - Defines component hierarchies
  - Specifies data flow
  - Creates technical specifications

### 2. Designer (`designer`)
- **Purpose:** UI/UX design and visual quality
- **When to use:** All projects with visual components
- **Responsibilities:**
  - Analyzes UI/UX quality
  - Creates design recommendations
  - Ensures visual consistency
  - Defines styling guidelines

### 3. Engineer (`engineer`)
- **Purpose:** Code implementation
- **When to use:** All projects requiring code changes
- **Responsibilities:**
  - Implements features
  - Applies design recommendations
  - Writes production code
  - Handles technical implementation

### 4. Tester (`tester`)
- **Purpose:** Quality assurance and validation
- **When to use:** Complex projects, critical features, refactors
- **Responsibilities:**
  - Validates functionality
  - Tests edge cases
  - Ensures accessibility
  - Verifies quality standards

### 5. VIZTRTR (`viztritr`)
- **Purpose:** Final quality evaluation and iteration
- **When to use:** ALL projects (mandatory)
- **Responsibilities:**
  - Scores UI across 8 dimensions
  - Evaluates against quality threshold (8.5+/10)
  - Iterates improvements until target met
  - Generates quality reports

## Complexity Levels

### Simple
- **Characteristics:** Single component, minor UI changes, styling updates
- **Typical Agents:** Designer → Engineer → VIZTRTR
- **Duration:** 2-3 iterations
- **Examples:**
  - Change button colors
  - Adjust spacing
  - Update typography
  - Modify single component

### Moderate
- **Characteristics:** New features, multiple components, moderate scope
- **Typical Agents:** Architect → Designer → Engineer → VIZTRTR
- **Duration:** 4-6 iterations
- **Examples:**
  - Add new feature section
  - Build form with validation
  - Create dashboard widget
  - Implement authentication UI

### Complex
- **Characteristics:** Major features, multiple systems, integrations, large scope
- **Typical Agents:** Architect → Designer → Engineer → Tester → VIZTRTR
- **Duration:** 7-10 iterations
- **Examples:**
  - Complete dashboard system
  - Multi-step checkout flow
  - Real-time collaboration features
  - Complex data visualization platform

## Usage Examples

### Example 1: Simple UI Change
```bash
curl -X POST http://localhost:3001/api/evaluate-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Make the header navigation more prominent with better contrast",
    "type": "prompt"
  }'
```

### Example 2: Feature Request
```bash
curl -X POST http://localhost:3001/api/evaluate-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a user profile page with avatar upload, bio editing, and activity history",
    "type": "prompt"
  }'
```

### Example 3: PRD Document
```bash
curl -X POST http://localhost:3001/api/evaluate-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "# Product Requirements\n\n## Overview\nBuild a real-time chat system\n\n## Features\n- Direct messaging\n- Group chats\n- File sharing\n- Notifications",
    "type": "prd"
  }'
```

## Testing

Run the included test script to verify the endpoint:

```bash
# Start the server
npm run dev

# In another terminal, run tests
npx tsx test-evaluate-endpoint.ts
```

The test script includes three test cases:
1. Simple UI change
2. Complex feature
3. PRD document

## Error Handling

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": [/* Zod validation errors */]
}
```

**Cause:** Missing or invalid request parameters

### 500 Internal Server Error
```json
{
  "error": "Failed to parse AI response",
  "details": "Error message",
  "rawResponse": "..."
}
```

**Causes:**
- Claude API error
- Invalid JSON in AI response
- Missing required fields in response

## Implementation Details

### Model Configuration
- **Model:** `claude-sonnet-4-5`
- **Temperature:** 0.3 (for consistent structured output)
- **Max Tokens:** 4096
- **System Prompt:** Comprehensive instructions for agent selection

### Validation
The endpoint validates:
- Request structure (Zod schema)
- Agent types (must be valid agent type)
- Complexity level (simple/moderate/complex)
- Response structure (required fields present)
- VIZTRTR agent presence (added automatically if missing)

### Logging
The endpoint logs:
- Incoming request type and prompt preview
- Claude API responses
- Successful evaluations with agent summary
- Errors with detailed information

## Integration

To integrate this endpoint into your application:

```typescript
import type { EvaluatePromptRequest, PromptEvaluation } from '@viztritr/shared';

async function evaluatePrompt(
  prompt: string,
  type: 'prompt' | 'prd' = 'prompt'
): Promise<PromptEvaluation> {
  const response = await fetch('/api/evaluate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, type })
  });

  if (!response.ok) {
    throw new Error('Failed to evaluate prompt');
  }

  return response.json();
}

// Usage
const evaluation = await evaluatePrompt(
  'Build a todo list app with drag-and-drop'
);

console.log('Suggested agents:', evaluation.suggestedAgents);
console.log('Complexity:', evaluation.complexity);
console.log('Duration:', evaluation.estimatedDuration);
```

## Files

- **Route:** `/Users/danielconnolly/Projects/VIZTRTR/ui/server/src/routes/evaluate.ts`
- **Types:** `/Users/danielconnolly/Projects/VIZTRTR/ui/shared/types.ts`
- **Test:** `/Users/danielconnolly/Projects/VIZTRTR/ui/server/test-evaluate-endpoint.ts`
- **Server:** `/Users/danielconnolly/Projects/VIZTRTR/ui/server/src/index.ts`
