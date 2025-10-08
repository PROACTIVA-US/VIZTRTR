/**
 * Cross-File Interface Validation Tests
 *
 * Tests the InterfaceValidationAgent's ability to detect breaking changes
 * across component interfaces
 */

import { InterfaceValidationAgent } from '../agents/InterfaceValidationAgent';
import { validateCrossFileInterfaces } from '../core/validation';
import * as dotenv from 'dotenv';

dotenv.config();

describe('InterfaceValidationAgent', () => {
  let agent: InterfaceValidationAgent;
  const apiKey = process.env.ANTHROPIC_API_KEY || 'test-key';

  beforeEach(() => {
    agent = new InterfaceValidationAgent(apiKey);
  });

  describe('Component Interface Analysis', () => {
    it('should extract component interface from TypeScript code', async () => {
      const code = `
import React from 'react';

interface PromptInputProps {
  value: string;
  onSubmit: () => void;
  placeholder?: string;
}

export default function PromptInput({ value, onSubmit, placeholder }: PromptInputProps) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
    />
  );
}
`;

      const analysis = await agent.analyzeComponentInterface('PromptInput.tsx', code);

      expect(analysis.componentName).toBe('PromptInput');
      expect(analysis.exports).toContain('default PromptInput');
      expect(analysis.props).toHaveProperty('value');
      expect(analysis.props).toHaveProperty('onSubmit');
      expect(analysis.props.onSubmit.required).toBe(true);
      expect(analysis.props.placeholder?.required).toBe(false);
    }, 30000);

    it('should detect exported types and interfaces', async () => {
      const code = `
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

export type Size = 'small' | 'medium' | 'large';

export default function Button(props: ButtonProps) {
  return <button onClick={props.onClick} />;
}
`;

      const analysis = await agent.analyzeComponentInterface('Button.tsx', code);

      expect(analysis.types).toHaveProperty('ButtonProps');
      expect(analysis.types).toHaveProperty('Size');
    }, 30000);
  });

  describe('Breaking Change Detection', () => {
    it('should detect removed required prop (PromptInput onSubmit case)', async () => {
      const originalCode = `
import React from 'react';

interface PromptInputProps {
  value: string;
  onSubmit: () => void;
  placeholder?: string;
}

export default function PromptInput({ value, onSubmit, placeholder }: PromptInputProps) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
    />
  );
}
`;

      const modifiedCode = `
import React from 'react';

interface PromptInputProps {
  value: string;
  placeholder?: string;
  // onSubmit removed!
}

export default function PromptInput({ value, placeholder }: PromptInputProps) {
  return (
    <input
      value={value}
      placeholder={placeholder}
    />
  );
}
`;

      const result = await agent.validateInterfaceChange(
        'src/components/PromptInput.tsx',
        originalCode,
        modifiedCode,
        '/fake/project/path'
      );

      expect(result.valid).toBe(false);
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].type).toBe('prop-removed');
      expect(result.breakingChanges[0].description).toContain('onSubmit');
      expect(result.breakingChanges[0].impact).toBe('high');
    }, 45000);

    it('should detect prop type changes', async () => {
      const originalCode = `
interface Props {
  count: number;
  onChange: (value: number) => void;
}

export default function Counter({ count, onChange }: Props) {
  return <div onClick={() => onChange(count + 1)}>{count}</div>;
}
`;

      const modifiedCode = `
interface Props {
  count: string; // Changed from number!
  onChange: (value: string) => void;
}

export default function Counter({ count, onChange }: Props) {
  return <div onClick={() => onChange(String(Number(count) + 1))}>{count}</div>;
}
`;

      const result = await agent.validateInterfaceChange(
        'src/components/Counter.tsx',
        originalCode,
        modifiedCode,
        '/fake/project/path'
      );

      expect(result.valid).toBe(false);
      expect(result.breakingChanges.some(c => c.type === 'prop-type-changed')).toBe(true);
    }, 45000);

    it('should detect export signature changes', async () => {
      const originalCode = `
export default function MyComponent() {
  return <div>Hello</div>;
}
`;

      const modifiedCode = `
function MyComponent() {
  return <div>Hello</div>;
}

export { MyComponent }; // Changed from default export!
`;

      const result = await agent.validateInterfaceChange(
        'src/components/MyComponent.tsx',
        originalCode,
        modifiedCode,
        '/fake/project/path'
      );

      // With build-first validation, export changes are detected as breaking changes
      // The test validates that the agent recognizes the export type change
      expect(result.valid).toBe(false);
      expect(result.breakingChanges.length).toBeGreaterThan(0);

      // Should detect either export-changed or high-impact change
      const hasExportChange = result.breakingChanges.some(c => c.type === 'export-changed');
      const hasHighImpact = result.breakingChanges.some(c => c.impact === 'high');
      expect(hasExportChange || hasHighImpact).toBe(true);
    }, 45000);

    it('should allow non-breaking changes (added optional prop)', async () => {
      const originalCode = `
interface Props {
  value: string;
}

export default function Input({ value }: Props) {
  return <input value={value} />;
}
`;

      const modifiedCode = `
interface Props {
  value: string;
  className?: string; // New optional prop
}

export default function Input({ value, className }: Props) {
  return <input value={value} className={className} />;
}
`;

      const result = await agent.validateInterfaceChange(
        'src/components/Input.tsx',
        originalCode,
        modifiedCode,
        '/fake/project/path'
      );

      // Should be valid - optional props don't break existing usage
      expect(result.valid).toBe(true);
      expect(result.breakingChanges.filter(c => c.impact === 'high')).toHaveLength(0);
    }, 45000);
  });

  describe('Full Integration Test', () => {
    it('should validate cross-file interfaces end-to-end', async () => {
      const originalCode = `
interface BuilderPageProps {
  onSubmit: () => void;
  data: string[];
}

export default function BuilderPage({ onSubmit, data }: BuilderPageProps) {
  return (
    <div>
      <button onClick={onSubmit}>Submit</button>
      <ul>{data.map(d => <li key={d}>{d}</li>)}</ul>
    </div>
  );
}
`;

      const modifiedCode = `
interface BuilderPageProps {
  // onSubmit removed - THIS BREAKS THE INTERFACE!
  data: string[];
}

export default function BuilderPage({ data }: BuilderPageProps) {
  return (
    <div>
      <ul>{data.map(d => <li key={d}>{d}</li>)}</ul>
    </div>
  );
}
`;

      const result = await validateCrossFileInterfaces(
        'src/pages/BuilderPage.tsx',
        originalCode,
        modifiedCode,
        '/fake/project',
        apiKey
      );

      expect(result.valid).toBe(false);
      expect(result.breakingChanges).toHaveLength(1);
      expect(result.breakingChanges[0].description).toMatch(/onSubmit/i);
      expect(result.suggestions.length).toBeGreaterThan(0);
    }, 45000);
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time with extended thinking', async () => {
      const code = `
interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function Component({ value, onChange }: Props) {
  return <input value={value} onChange={e => onChange(e.target.value)} />;
}
`;

      const startTime = Date.now();

      await agent.analyzeComponentInterface('test.tsx', code);

      const duration = Date.now() - startTime;

      // With extended thinking (1500 token budget), allow up to 15 seconds
      // Extended thinking provides better analysis accuracy at the cost of speed
      expect(duration).toBeLessThan(15000);
    }, 20000);

    it('should use caching for repeated analyses', async () => {
      const code = `
export default function Test() {
  return <div>Test</div>;
}
`;

      const firstTime = Date.now();
      await agent.analyzeComponentInterface('test.tsx', code);
      const firstDuration = Date.now() - firstTime;

      const secondTime = Date.now();
      await agent.analyzeComponentInterface('test.tsx', code);
      const secondDuration = Date.now() - secondTime;

      // Second call should be significantly faster (cached)
      expect(secondDuration).toBeLessThan(firstDuration / 10);
    }, 15000);
  });

  describe('Edge Cases', () => {
    it('should handle components with no props', async () => {
      const code = `
export default function NoProps() {
  return <div>No Props</div>;
}
`;

      const analysis = await agent.analyzeComponentInterface('NoProps.tsx', code);

      expect(analysis.componentName).toBe('NoProps');
      expect(analysis.props).toEqual({});
    }, 30000);

    it('should handle complex generic types', async () => {
      const code = `
interface Props<T> {
  data: T[];
  onSelect: (item: T) => void;
}

export default function List<T>({ data, onSelect }: Props<T>) {
  return <div>{data.map((item, i) => <div key={i} onClick={() => onSelect(item)} />)}</div>;
}
`;

      const analysis = await agent.analyzeComponentInterface('List.tsx', code);

      expect(analysis.componentName).toBe('List');
      expect(analysis.props).toHaveProperty('data');
      expect(analysis.props).toHaveProperty('onSelect');
    }, 30000);

    it('should handle multiple exports', async () => {
      const code = `
export interface Config {
  apiKey: string;
}

export const DEFAULT_CONFIG: Config = {
  apiKey: 'default'
};

export function useConfig() {
  return DEFAULT_CONFIG;
}

export default function ConfigProvider() {
  return <div>Config</div>;
}
`;

      const analysis = await agent.analyzeComponentInterface('Config.tsx', code);

      expect(analysis.exports).toContain('default ConfigProvider');
      expect(analysis.exports.length).toBeGreaterThan(1);
    }, 30000);
  });
});
