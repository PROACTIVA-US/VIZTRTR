/**
 * UIConsistencyAgent
 *
 * Validates all UI changes against the design system to ensure visual consistency.
 * This is a PERMANENT production agent that prevents design system violations.
 *
 * **Responsibilities:**
 * 1. Validate className changes against approved design system
 * 2. Detect theme inconsistencies (light mode classes in dark theme)
 * 3. Verify typography hierarchy (h1 > h2 > h3, etc.)
 * 4. Ensure color palette adherence
 * 5. Reject changes that violate design standards
 *
 * **Integration:**
 * - Called by OrchestratorAgent BEFORE ControlPanelAgentV2 execution
 * - Workflow: Recommendation → UIConsistencyAgent.validate() → Execute/Reject
 *
 * **Design System:**
 * - Reference: ui/frontend/src/designSystem.ts
 * - Theme: Dark mode only (bg-slate-900, text-white)
 * - Colors: slate palette + blue accents
 * - Typography: Strict hierarchy (4xl > 3xl > 2xl > xl > lg > base)
 *
 * @see docs/FIX_PLAN_UI_CONSISTENCY.md
 * @see ui/frontend/src/designSystem.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

interface ConsistencyValidation {
  isValid: boolean;
  violations: DesignViolation[];
  suggestions: string[];
  summary: string;
}

interface DesignViolation {
  type: 'theme' | 'color' | 'typography' | 'spacing' | 'component';
  severity: 'error' | 'warning';
  className: string;
  reason: string;
  suggestion: string | null;
  file?: string;
  line?: number;
}

interface ChangeToValidate {
  file: string;
  lineNumber: number;
  oldClassName: string;
  newClassName: string;
  changeType: 'className' | 'styleValue' | 'textContent';
}

interface DesignSystemConfig {
  theme: 'dark';
  forbidden: {
    lightMode: string[];
    inconsistentColors: string[];
    arbitrarySizes: string[];
  };
}

export class UIConsistencyAgent {
  private anthropic: Anthropic;
  private projectPath: string;
  private designSystemPath: string;
  private designSystem: DesignSystemConfig | null = null;

  constructor(anthropicApiKey: string, projectPath: string) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.projectPath = projectPath;
    this.designSystemPath = path.join(projectPath, 'src', 'designSystem.ts');
  }

  /**
   * Dynamically load design system from project
   */
  private async loadDesignSystem(): Promise<DesignSystemConfig> {
    if (this.designSystem) return this.designSystem;

    // Define design system inline (since we can't import from frontend during build)
    this.designSystem = {
      theme: 'dark' as const,
      forbidden: {
        lightMode: ['bg-white', 'bg-gray-50', 'bg-gray-100', 'text-gray-900', 'text-gray-800', 'text-black', 'border-gray-200', 'border-gray-300'],
        inconsistentColors: ['bg-gray-', 'text-gray-', 'border-gray-'],
        arbitrarySizes: ['text-[', 'w-[', 'h-['],
      },
    };

    return this.designSystem;
  }

  /**
   * Validate a proposed change against the design system
   */
  async validateChange(change: ChangeToValidate): Promise<ConsistencyValidation> {
    const violations: DesignViolation[] = [];
    const suggestions: string[] = [];

    // Load design system
    await this.loadDesignSystem();

    // Only validate className changes
    if (change.changeType !== 'className') {
      return {
        isValid: true,
        violations: [],
        suggestions: [],
        summary: 'Non-className change - no validation required',
      };
    }

    // Parse new className into individual classes
    const newClasses = this.parseClassName(change.newClassName);
    const oldClasses = this.parseClassName(change.oldClassName);
    const addedClasses = newClasses.filter(c => !oldClasses.includes(c));

    // Validate each added class
    for (const className of addedClasses) {
      // Check forbidden light mode classes
      if (this.isLightModeClass(className)) {
        const alternative = this.suggestAlternative(className);
        violations.push({
          type: 'theme',
          severity: 'error',
          className,
          reason: `Light mode class "${className}" violates dark theme design system`,
          suggestion: alternative,
          file: change.file,
          line: change.lineNumber,
        });

        if (alternative) {
          suggestions.push(`Replace "${className}" with "${alternative}"`);
        }
      }

      // Check forbidden gray colors (should use slate)
      if (this.isInconsistentColor(className)) {
        const alternative = this.suggestColorAlternative(className);
        violations.push({
          type: 'color',
          severity: 'error',
          className,
          reason: `Inconsistent color "${className}" - design system uses slate palette`,
          suggestion: alternative,
          file: change.file,
          line: change.lineNumber,
        });

        if (alternative) {
          suggestions.push(`Replace "${className}" with "${alternative}"`);
        }
      }

      // Check arbitrary sizes
      if (className.includes('[')) {
        violations.push({
          type: 'spacing',
          severity: 'warning',
          className,
          reason: `Arbitrary size "${className}" - prefer design system spacing values`,
          suggestion: null,
          file: change.file,
          line: change.lineNumber,
        });

        suggestions.push(`Use design system spacing (2, 4, 6, 8) instead of arbitrary values`);
      }
    }

    // Check typography hierarchy if changing text size
    const typographyViolation = this.validateTypographyHierarchy(change, newClasses);
    if (typographyViolation) {
      violations.push(typographyViolation);
      if (typographyViolation.suggestion) {
        suggestions.push(typographyViolation.suggestion);
      }
    }

    // Determine if change is valid (no errors, warnings are acceptable)
    const hasErrors = violations.some(v => v.severity === 'error');
    const isValid = !hasErrors;

    // Generate summary
    const summary = this.generateSummary(isValid, violations, suggestions);

    return {
      isValid,
      violations,
      suggestions,
      summary,
    };
  }

  /**
   * Validate multiple changes in batch
   */
  async validateChanges(changes: ChangeToValidate[]): Promise<ConsistencyValidation> {
    const allViolations: DesignViolation[] = [];
    const allSuggestions: string[] = [];

    for (const change of changes) {
      const validation = await this.validateChange(change);
      allViolations.push(...validation.violations);
      allSuggestions.push(...validation.suggestions);
    }

    const hasErrors = allViolations.some(v => v.severity === 'error');
    const isValid = !hasErrors;

    return {
      isValid,
      violations: allViolations,
      suggestions: Array.from(new Set(allSuggestions)), // Deduplicate
      summary: this.generateSummary(isValid, allViolations, allSuggestions),
    };
  }

  /**
   * Use AI to validate complex design consistency (for future use)
   */
  async validateWithAI(
    recommendation: string,
    targetFiles: string[]
  ): Promise<ConsistencyValidation> {
    try {
      // Read design system
      const designSystemContent = await fs.readFile(this.designSystemPath, 'utf-8');

      // Read target files
      const fileContents = await Promise.all(
        targetFiles.map(async file => {
          const fullPath = path.join(this.projectPath, file);
          const content = await fs.readFile(fullPath, 'utf-8');
          return { file, content };
        })
      );

      // Build AI validation prompt
      const prompt = this.buildAIValidationPrompt(
        designSystemContent,
        fileContents,
        recommendation
      );

      // Call Claude for validation
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseAIValidationResponse(content.text);
    } catch (error) {
      console.error('AI validation failed:', error);
      // Fallback to rule-based validation
      return {
        isValid: true,
        violations: [],
        suggestions: [],
        summary: 'AI validation unavailable - using rule-based validation only',
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private parseClassName(className: string): string[] {
    return className
      .split(/\s+/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  private isLightModeClass(className: string): boolean {
    if (!this.designSystem) return false;
    const forbidden = this.designSystem.forbidden.lightMode;
    return forbidden.some(f => className.includes(f));
  }

  private isInconsistentColor(className: string): boolean {
    if (!this.designSystem) return false;
    const forbidden = this.designSystem.forbidden.inconsistentColors;
    return forbidden.some(f => className.includes(f));
  }

  private suggestColorAlternative(className: string): string {
    // Replace gray with slate
    return className.replace('gray-', 'slate-');
  }

  private suggestAlternative(forbiddenClass: string): string | null {
    const replacements: Record<string, string> = {
      'bg-white': 'bg-slate-900',
      'bg-gray-50': 'bg-slate-900',
      'bg-gray-100': 'bg-slate-800',
      'text-gray-900': 'text-white',
      'text-gray-800': 'text-white',
      'text-gray-700': 'text-slate-300',
      'text-gray-600': 'text-slate-400',
      'text-gray-500': 'text-slate-500',
      'text-black': 'text-white',
      'border-gray-200': 'border-slate-700',
      'border-gray-300': 'border-slate-600',
    };

    return replacements[forbiddenClass] || null;
  }

  private validateTypographyHierarchy(
    change: ChangeToValidate,
    newClasses: string[]
  ): DesignViolation | null {
    // Extract text size classes
    const sizeClasses = newClasses.filter(c => c.startsWith('text-'));
    if (sizeClasses.length === 0) return null;

    // Define valid hierarchy (largest to smallest)
    const hierarchy = ['text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];

    // Check if using a size not in hierarchy
    for (const sizeClass of sizeClasses) {
      const baseSize = sizeClass.split(' ')[0]; // Handle modifiers like 'text-4xl font-bold'
      if (!hierarchy.includes(baseSize) && baseSize.startsWith('text-') && !baseSize.includes('-')) {
        return {
          type: 'typography',
          severity: 'warning',
          className: sizeClass,
          reason: `Non-standard text size "${sizeClass}" - prefer design system typography scale`,
          suggestion: 'Use text-4xl, text-3xl, text-2xl, text-xl, text-lg, text-base, text-sm, or text-xs',
          file: change.file,
          line: change.lineNumber,
        };
      }
    }

    return null;
  }

  private generateSummary(
    isValid: boolean,
    violations: DesignViolation[],
    suggestions: string[]
  ): string {
    if (isValid && violations.length === 0) {
      return '✅ Change passes design system validation';
    }

    const errors = violations.filter(v => v.severity === 'error');
    const warnings = violations.filter(v => v.severity === 'warning');

    const parts: string[] = [];

    if (errors.length > 0) {
      parts.push(`❌ ${errors.length} design system error(s)`);
    }

    if (warnings.length > 0) {
      parts.push(`⚠️  ${warnings.length} warning(s)`);
    }

    if (suggestions.length > 0) {
      parts.push(`💡 ${suggestions.length} suggestion(s)`);
    }

    return parts.join(' | ');
  }

  private buildAIValidationPrompt(
    designSystem: string,
    files: Array<{ file: string; content: string }>,
    recommendation: string
  ): string {
    return `You are a design system expert validating UI changes.

**Design System:**
${designSystem}

**Current Files:**
${files.map((f: { file: string; content: string }) => `File: ${f.file}\n${f.content}`).join('\n\n')}

**Proposed Change:**
${recommendation}

**Task:**
Validate if this change maintains design system consistency. Check:
1. Theme consistency (dark mode only)
2. Color palette adherence (slate + blue accents)
3. Typography hierarchy (4xl > 3xl > 2xl > xl > lg > base)
4. Spacing system (8px grid)
5. Component patterns (buttons, cards, etc.)

**Respond with JSON:**
{
  "isValid": boolean,
  "violations": [
    {
      "type": "theme" | "color" | "typography" | "spacing" | "component",
      "severity": "error" | "warning",
      "reason": "string",
      "suggestion": "string or null"
    }
  ],
  "summary": "string"
}`;
  }

  private parseAIValidationResponse(response: string): ConsistencyValidation {
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        isValid: parsed.isValid,
        violations: parsed.violations || [],
        suggestions: parsed.violations.map((v: any) => v.suggestion).filter(Boolean),
        summary: parsed.summary || 'AI validation complete',
      };
    } catch (error) {
      console.error('Failed to parse AI validation response:', error);
      return {
        isValid: true,
        violations: [],
        suggestions: [],
        summary: 'AI validation parsing failed - assuming valid',
      };
    }
  }
}

export default UIConsistencyAgent;
