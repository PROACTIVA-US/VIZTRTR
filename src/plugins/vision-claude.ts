/**
 * Claude Opus Vision Plugin
 *
 * Uses Claude Opus 4 with vision capabilities to analyze UI screenshots
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Screenshot,
  DesignSpec,
  Issue,
  Recommendation,
  VIZTRTRPlugin,
  ProjectContext,
} from '../core/types';
import * as fs from 'fs';

export class ClaudeOpusVisionPlugin implements VIZTRTRPlugin {
  name = 'claude-opus-vision';
  version = '1.0.0';
  type = 'vision' as const;

  private client: Anthropic;
  private model = 'claude-opus-4-20250514';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeScreenshot(
    screenshot: Screenshot,
    memoryContext?: string,
    projectContext?: ProjectContext,
    avoidedComponents?: string[]
  ): Promise<DesignSpec> {
    console.log(`🔍 Analyzing screenshot with ${this.model}...`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot.data,
              },
            },
            {
              type: 'text',
              text: this.getAnalysisPrompt(memoryContext, projectContext, avoidedComponents),
            },
          ],
        },
      ],
    });

    // Parse Claude's response into structured DesignSpec
    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAnalysis(analysisText);
  }

  private getAnalysisPrompt(
    memoryContext?: string,
    projectContext?: ProjectContext,
    avoidedComponents?: string[]
  ): string {
    // Layer 1.1: Project Context Injection
    const projectSection = projectContext
      ? `
**PROJECT CONTEXT:**
You are analyzing: ${projectContext.name}
Project Type: ${projectContext.type}
Description: ${projectContext.description}

FOCUS YOUR ANALYSIS ON:
${projectContext.focusAreas.map(area => `- ${area}`).join('\n')}

DO NOT GENERATE RECOMMENDATIONS FOR:
${projectContext.avoidAreas.map(area => `- ${area}`).join('\n')}

**IMPORTANT:** This is ${projectContext.type === 'web-builder' ? 'a web development tool interface' : projectContext.type === 'teleprompter' ? 'a stage performance display' : 'a desktop application'}.
Tailor your recommendations accordingly.

---
`
      : `
**CRITICAL: Context Detection First**
Before analyzing, identify the UI context from the screenshot:
- **WEB BUILDER/TOOL:** Development interface with forms, buttons, status displays (1-2 ft viewing)
- **TELEPROMPTER:** Large text display for stage performance (3-10 ft viewing distance)
- **SETTINGS PANEL:** Desktop control panel with buttons, sliders, tabs (1-2 ft viewing distance)
- **BLUEPRINT VIEW:** Song structure editing interface (1-2 ft viewing distance)

`;

    // Layer 1.2: Component Exclusion
    const exclusionSection =
      avoidedComponents && avoidedComponents.length > 0
        ? `
🚫 **COMPONENTS TO AVOID - DO NOT GENERATE RECOMMENDATIONS FOR:**
${avoidedComponents.map(comp => `- ${comp}`).join('\n')}

**CRITICAL:** These components have failed ${avoidedComponents.length >= 5 ? 'multiple times' : 'previously'}.
Focus on OTHER UI elements instead. Look for:
- Alternative components not in the above list
- Different UI regions (Header, Navigation, Cards, Forms, etc.)
- Untouched areas of the interface

If you cannot find other components to improve, state this explicitly.

---
`
        : '';

    const contextSection = memoryContext
      ? `
**ITERATION MEMORY:**
${memoryContext}

**IMPORTANT:** Do NOT recommend changes that have already been attempted without success.
Focus on NEW approaches or DIFFERENT UI contexts than what has been tried before.

---
`
      : '';

    return `You are a world-class UI/UX designer and accessibility expert analyzing this user interface.
${projectSection}${exclusionSection}${contextSection}

**Your Task:**
Identify the UI context, then analyze across 8 critical dimensions with context-appropriate criteria.

**8 Design Dimensions:**

1. **Visual Hierarchy** (weight: 1.2×)
   - Clear primary/secondary/tertiary elements
   - Size scaling and differentiation
   - Effective use of contrast to establish priority
   - Logical flow and grouping

2. **Typography** (weight: 1.0×)
   - Readable font sizes (16px+ for body, 14px+ mobile)
   - Consistent type scale with clear hierarchy
   - Appropriate line height (1.5-1.8 for body)
   - Font weight hierarchy (3-4 weights max)
   - Sufficient text contrast

3. **Color & Contrast** (weight: 1.0×)
   - WCAG 2.1 AA compliance (4.5:1 normal, 3:1 large text)
   - Color harmony and balance
   - Brand consistency
   - Semantic color usage (success/error/warning)

4. **Spacing & Layout** (weight: 1.1×)
   - Consistent spacing scale (8px grid system)
   - Adequate breathing room around elements
   - Proper grid alignment
   - Responsive padding
   - Logical grouping

5. **Component Design** (weight: 1.0×)
   - Clear button hierarchy (primary, secondary, tertiary)
   - Interactive states (hover, active, focus, disabled)
   - Touch targets adequate (44x44px minimum)
   - Consistent border radius
   - Coherent shadow system

6. **Animation & Interaction** (weight: 0.9×)
   - Smooth transitions (200-300ms)
   - Natural easing functions
   - Motion serves clear purpose
   - Delightful micro-interactions
   - 60fps performance

7. **Accessibility** (weight: 1.3×) ← HIGHEST PRIORITY
   - WCAG 2.1 AA compliance minimum
   - Full keyboard navigation
   - Visible focus indicators
   - Screen reader compatible (ARIA labels)
   - 44x44px touch targets
   - Color not sole differentiator

8. **Overall Aesthetic** (weight: 1.0×)
   - Professional, credible appearance
   - Modern, contemporary feel
   - Cohesive design language
   - Strong brand alignment
   - Visual confidence and polish

**Output Format (JSON):**

Please respond with a JSON object in this exact format:

\`\`\`json
{
  "currentScore": 6.5,
  "estimatedNewScore": 8.2,
  "issues": [
    {
      "dimension": "accessibility",
      "severity": "critical",
      "description": "No visible focus indicators on interactive elements",
      "location": "Upload button and Cancel button"
    }
  ],
  "recommendations": [
    {
      "dimension": "accessibility",
      "title": "Add focus indicators",
      "description": "Add visible focus rings (outline or box-shadow) to all interactive elements. Use focus-visible for keyboard-only focus indicators.",
      "impact": 9,
      "effort": 2,
      "code": "className='... focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2'"
    }
  ]
}
\`\`\`

**Rules:**
- Be specific and actionable
- Include code snippets when helpful (Tailwind CSS preferred)
- Prioritize by impact/effort ratio
- Score each dimension 1-10
- Estimate realistic score improvement
- Focus on WCAG accessibility (highest weight)

Analyze the screenshot now and respond with JSON only.`;
  }

  private parseAnalysis(text: string): DesignSpec {
    // Extract JSON from Claude's response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return {
      iteration: 0,
      timestamp: new Date(),
      currentScore: parsed.currentScore || 0,
      currentIssues: parsed.issues || [],
      recommendations: parsed.recommendations || [],
      prioritizedChanges: this.prioritizeChanges(parsed.recommendations || []),
      estimatedNewScore: parsed.estimatedNewScore || 0,
    };
  }

  private prioritizeChanges(recommendations: Recommendation[]): Recommendation[] {
    // Sort by impact/effort ratio (highest first)
    return recommendations.sort((a, b) => {
      const ratioA = a.impact / Math.max(a.effort, 1);
      const ratioB = b.impact / Math.max(b.effort, 1);
      return ratioB - ratioA;
    });
  }
}
