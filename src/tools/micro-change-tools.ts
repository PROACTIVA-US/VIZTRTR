/**
 * Claude Agent SDK Tool Definitions for Micro-Change Toolkit
 *
 * These tools are provided to Claude agents to enforce atomic,
 * surgical changes to code files.
 */

import Anthropic from '@anthropic-ai/sdk';

export const MICRO_CHANGE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'updateClassName',
    description: `Update a single className in a React/HTML element.

**When to use:**
- Changing Tailwind CSS classes (e.g., text-sm → text-base)
- Modifying spacing classes (e.g., py-2 → py-3)
- Updating color classes (e.g., text-gray-500 → text-gray-700)

**Important:**
- Changes EXACTLY ONE className on ONE line
- Must specify exact old className to replace
- Cannot add/remove classes, only replace
- If oldClassName appears multiple times on the line, the change will fail`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description:
            'Relative path to file from project root (e.g., "src/components/Header.tsx")',
        },
        lineNumber: {
          type: 'number',
          description: 'Line number where the className appears (1-indexed)',
        },
        oldClassName: {
          type: 'string',
          description: 'Exact className to replace (e.g., "text-sm")',
        },
        newClassName: {
          type: 'string',
          description: 'New className to use (e.g., "text-base")',
        },
      },
      required: ['filePath', 'lineNumber', 'oldClassName', 'newClassName'],
    },
  },
  {
    name: 'updateStyleValue',
    description: `Update a single CSS property value in inline styles or style objects.

**When to use:**
- Changing fontSize values (e.g., '14px' → '16px')
- Modifying colors (e.g., '#666' → '#333')
- Updating padding/margin (e.g., '8px' → '12px')

**Important:**
- Changes EXACTLY ONE CSS property on ONE line
- Works with both quoted ('14px') and unquoted (14px) values
- Must specify exact property name and old value
- Cannot change multiple properties at once`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Relative path to file from project root',
        },
        lineNumber: {
          type: 'number',
          description: 'Line number where the style property appears (1-indexed)',
        },
        property: {
          type: 'string',
          description: 'CSS property name (e.g., "fontSize", "color", "padding")',
        },
        oldValue: {
          type: 'string',
          description: 'Current value to replace (e.g., "14px", "#666")',
        },
        newValue: {
          type: 'string',
          description: 'New value to use (e.g., "16px", "#333")',
        },
      },
      required: ['filePath', 'lineNumber', 'property', 'oldValue', 'newValue'],
    },
  },
  {
    name: 'updateTextContent',
    description: `Update text content within an element.

**When to use:**
- Changing button labels (e.g., "Submit" → "Save")
- Modifying headings (e.g., "Dashboard" → "Overview")
- Updating placeholder text

**Important:**
- Changes EXACTLY ONE text occurrence on ONE line
- Must specify exact old text to replace
- If oldText appears multiple times on the line, the change will fail
- Does not modify JSX/HTML structure, only text content`,
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Relative path to file from project root',
        },
        lineNumber: {
          type: 'number',
          description: 'Line number where the text appears (1-indexed)',
        },
        oldText: {
          type: 'string',
          description: 'Exact text to replace (e.g., "Submit", "Old Title")',
        },
        newText: {
          type: 'string',
          description: 'New text to use (e.g., "Save", "New Title")',
        },
      },
      required: ['filePath', 'lineNumber', 'oldText', 'newText'],
    },
  },
];

/**
 * Get tool definitions for Claude Agent SDK
 */
export function getMicroChangeTools(): Anthropic.Tool[] {
  return MICRO_CHANGE_TOOLS;
}

/**
 * Get tool names for easy reference
 */
export const TOOL_NAMES = {
  UPDATE_CLASS_NAME: 'updateClassName',
  UPDATE_STYLE_VALUE: 'updateStyleValue',
  UPDATE_TEXT_CONTENT: 'updateTextContent',
} as const;

/**
 * Type guard to check if a tool name is a micro-change tool
 */
export function isMicroChangeTool(toolName: string): boolean {
  return Object.values(TOOL_NAMES).includes(toolName as any);
}
