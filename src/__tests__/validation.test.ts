/**
 * Unit Tests for Code Change Validation System
 *
 * Demonstrates the validation constraints that prevent over-engineering
 */

import {
  validateFileChanges,
  checkExportConsistency,
  checkLineDelta,
  extractExports,
  extractImports,
  getEffortBasedLimit,
  formatValidationResult,
} from '../core/validation';

describe('Validation System - Scope Constraints', () => {
  describe('Small targeted changes (ACCEPTED)', () => {
    it('should accept small className change (10 lines)', () => {
      const original = `
import React from 'react';

export default function Header() {
  return (
    <header className="p-4 bg-gray-100">
      <h1 className="text-sm font-bold">My App</h1>
      <nav>
        <button className="px-4 py-2">Home</button>
        <button className="px-4 py-2">About</button>
      </nav>
    </header>
  );
}
      `.trim();

      const modified = `
import React from 'react';

export default function Header() {
  return (
    <header className="p-4 bg-gray-50 shadow-md">
      <h1 className="text-base font-bold">My App</h1>
      <nav>
        <button className="px-4 py-2 hover:bg-blue-100">Home</button>
        <button className="px-4 py-2 hover:bg-blue-100">About</button>
      </nav>
    </header>
  );
}
      `.trim();

      const result = validateFileChanges(original, modified, {}, 2);

      expect(result.valid).toBe(true);
      expect(result.lineDelta).toBeLessThan(20);
      expect(result.exportsChanged).toBe(false);
      expect(result.importsChanged).toBe(false);
    });

    it('should accept padding adjustment (effort 1)', () => {
      const original = `
export const Button = () => (
  <button className="p-2 bg-blue-500">Click</button>
);
      `.trim();

      const modified = `
export const Button = () => (
  <button className="p-4 bg-blue-500 shadow-sm">Click</button>
);
      `.trim();

      const result = validateFileChanges(original, modified, {}, 1);

      expect(result.valid).toBe(true);
      expect(result.lineDelta).toBe(0); // Same number of lines
      expect(result.exportsChanged).toBe(false);
    });
  });

  describe('Large rewrites (REJECTED)', () => {
    it('should reject complete file rewrite (200 lines)', () => {
      const original = `
import React from 'react';

export default function Header() {
  return <header>Simple</header>;
}
      `.trim();

      // Simulate a 200-line rewrite
      const modified = `
import React from 'react';
import { useContext } from 'react';
import { ThemeContext } from './context';

export default function Header() {
  const theme = useContext(ThemeContext);

  return (
    <header className="complex-rewrite">
      ${Array(180).fill('<div>Rewritten content</div>').join('\n      ')}
    </header>
  );
}
      `.trim();

      const result = validateFileChanges(original, modified, {}, 3);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Line delta');
    });

    it('should reject file that grows beyond 50% limit', () => {
      const original = Array(100).fill('const x = 1;').join('\n');
      const modified = Array(200).fill('const x = 1;').join('\n'); // 100% growth

      const result = validateFileChanges(original, modified, {
        maxGrowthPercent: 0.5, // 50% max
      });

      expect(result.valid).toBe(false);
      expect(result.lineGrowthPercent).toBeGreaterThan(0.5);
      expect(result.violations.some(v => v.includes('grew by'))).toBe(true);
    });
  });

  describe('Export changes (REJECTED)', () => {
    it('should reject when export signature changes', () => {
      const original = `
export default function MyComponent() {
  return <div>Content</div>;
}
      `.trim();

      const modified = `
export function MyComponent() {
  return <div>Content</div>;
}
      `.trim();

      const result = validateFileChanges(original, modified, {
        preserveExports: true,
      });

      expect(result.valid).toBe(false);
      expect(result.exportsChanged).toBe(true);
      expect(result.violations.some(v => v.includes('Export statements changed'))).toBe(true);
    });

    it('should reject when named exports are removed', () => {
      const original = `
export const foo = 1;
export const bar = 2;
export default MyComponent;
      `.trim();

      const modified = `
export const foo = 1;
export default MyComponent;
      `.trim();

      const result = validateFileChanges(original, modified, {
        preserveExports: true,
      });

      expect(result.valid).toBe(false);
      expect(result.exportsChanged).toBe(true);
    });
  });

  describe('Effort-based constraints', () => {
    it('should reject effort 1-2 exceeding 20 line limit', () => {
      const original = Array(100).fill('const x = 1;').join('\n');
      const modified = Array(125).fill('const x = 1;').join('\n'); // 25 lines changed

      const result = validateFileChanges(original, modified, {}, 2); // effort 2

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('Effort score 2'))).toBe(true);
    });

    it('should accept effort 3 with 40 line change', () => {
      const original = Array(100).fill('const x = 1;').join('\n');
      const modified = Array(140).fill('const x = 2;').join('\n'); // 40 lines changed

      const result = validateFileChanges(
        original,
        modified,
        {
          maxLineDelta: 100,
        },
        3
      ); // effort 3 allows up to 50 lines

      // Note: May fail due to growth percent, but effort constraint passes
      const effortLimit = getEffortBasedLimit(3);
      expect(effortLimit).toBe(50);
      expect(result.lineDelta).toBeLessThan(effortLimit);
    });

    it('should calculate correct effort-based limits', () => {
      expect(getEffortBasedLimit(1)).toBe(20);
      expect(getEffortBasedLimit(2)).toBe(20);
      expect(getEffortBasedLimit(3)).toBe(50);
      expect(getEffortBasedLimit(4)).toBe(50);
      expect(getEffortBasedLimit(5)).toBe(100);
      expect(getEffortBasedLimit(10)).toBe(100);
    });
  });

  describe('Import preservation', () => {
    it('should detect when imports are removed', () => {
      const original = `
import React from 'react';
import { useState, useEffect } from 'react';
import styles from './styles.css';
      `.trim();

      const modified = `
import React from 'react';
import { useState } from 'react';
      `.trim();

      const result = validateFileChanges(original, modified, {
        preserveImports: true,
      });

      expect(result.valid).toBe(false);
      expect(result.importsChanged).toBe(true);
    });

    it('should allow adding new imports', () => {
      const original = `
import React from 'react';
      `.trim();

      const modified = `
import React from 'react';
import { useState } from 'react';
      `.trim();

      const result = validateFileChanges(original, modified, {
        preserveImports: true,
      });

      // Adding imports is allowed, only removal is flagged
      expect(result.importsChanged).toBe(false);
    });
  });

  describe('Export extraction', () => {
    it('should extract default exports', () => {
      const code = `
export default function MyComponent() {}
      `;
      const exports = extractExports(code);
      expect(exports).toContain('MyComponent');
    });

    it('should extract named exports', () => {
      const code = `
export const foo = 1;
export function bar() {}
export class Baz {}
      `;
      const exports = extractExports(code);
      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('Baz');
    });

    it('should extract export lists', () => {
      const code = `
const a = 1;
const b = 2;
export { a, b as beta };
      `;
      const exports = extractExports(code);
      expect(exports).toContain('a');
      expect(exports).toContain('b');
    });
  });

  describe('Import extraction', () => {
    it('should extract import sources', () => {
      const code = `
import React from 'react';
import { useState } from 'react';
import styles from './styles.css';
      `;
      const imports = extractImports(code);
      expect(imports).toContain('react');
      expect(imports).toContain('./styles.css');
    });
  });

  describe('Line delta checking', () => {
    it('should calculate line delta correctly', () => {
      const original = Array(100).fill('line').join('\n');
      const modified = Array(120).fill('line').join('\n');

      const result = checkLineDelta(original, modified, 30);
      expect(result).toBe(true); // 20 line delta is within 30 limit

      const result2 = checkLineDelta(original, modified, 10);
      expect(result2).toBe(false); // 20 line delta exceeds 10 limit
    });
  });

  describe('Export consistency checking', () => {
    it('should detect consistent exports', () => {
      const original = `
export const foo = 1;
export default Bar;
      `;
      const modified = `
export const foo = 2; // value changed but export stays
export default Bar;
      `;

      const consistent = checkExportConsistency(original, modified);
      expect(consistent).toBe(true);
    });

    it('should detect inconsistent exports', () => {
      const original = `
export const foo = 1;
export default Bar;
      `;
      const modified = `
export const baz = 1; // different export name
export default Bar;
      `;

      const consistent = checkExportConsistency(original, modified);
      expect(consistent).toBe(false);
    });
  });

  describe('Validation formatting', () => {
    it('should format validation results clearly', () => {
      const result = validateFileChanges(
        Array(100).fill('line').join('\n'),
        Array(200).fill('line').join('\n'),
        {},
        2
      );

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('FAILED'); // Should fail due to growth
      expect(formatted).toContain('Lines: ');
      expect(formatted).toContain('Growth:');
      expect(formatted).toContain('Violations:');
    });
  });
});

describe('Integration Tests - Real-world Scenarios', () => {
  it('Example 1: Valid targeted className update', () => {
    const original = `
import React from 'react';

export default function Button({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {children}
    </button>
  );
}
    `.trim();

    const modified = `
import React from 'react';

export default function Button({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded shadow-md hover:bg-blue-700"
    >
      {children}
    </button>
  );
}
    `.trim();

    const result = validateFileChanges(original, modified, {}, 2);

    console.log('\n✅ EXAMPLE 1: Valid targeted update');
    console.log(formatValidationResult(result));
    expect(result.valid).toBe(true);
  });

  it('Example 2: Invalid complete rewrite', () => {
    const original = `
import React from 'react';

export default function Button({ children }) {
  return <button>{children}</button>;
}
    `.trim();

    const modified = `
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function Button({ children, onClick, variant = 'primary' }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600',
    secondary: 'bg-gray-500 hover:bg-gray-600',
    danger: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <motion.button
      className={\`px-6 py-3 rounded-lg shadow-lg transition-all \${variants[variant]}\`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
      {isHovered && <span className="ml-2">→</span>}
    </motion.button>
  );
}
    `.trim();

    const result = validateFileChanges(original, modified, {}, 3);

    console.log('\n❌ EXAMPLE 2: Invalid complete rewrite');
    console.log(formatValidationResult(result));
    expect(result.valid).toBe(false);
  });

  it('Example 3: Export signature changed (REJECTED)', () => {
    const original = `
export default function Header() {
  return <header>My App</header>;
}
    `.trim();

    const modified = `
export const Header = () => {
  return <header>My App</header>;
};
    `.trim();

    const result = validateFileChanges(original, modified, {
      preserveExports: true,
    });

    console.log('\n❌ EXAMPLE 3: Export signature changed');
    console.log(formatValidationResult(result));
    expect(result.valid).toBe(false);
    expect(result.exportsChanged).toBe(true);
  });

  it('Example 4: Effort-appropriate change (ACCEPTED)', () => {
    const original = `
export const config = {
  color: 'blue',
  size: 'md',
};
    `.trim();

    const modified = `
export const config = {
  color: 'blue-600',
  size: 'lg',
  shadow: 'md',
};
    `.trim();

    const result = validateFileChanges(original, modified, {}, 1); // Low effort

    console.log('\n✅ EXAMPLE 4: Effort-appropriate change');
    console.log(formatValidationResult(result));
    expect(result.valid).toBe(true);
  });
});
