# Production-Grade Scope Constraints Implementation

## Overview

Added multiple layers of validation constraints to prevent over-engineering and file rewrites in the VIZTRTR implementation agents.

**Problem Solved:** Agent was rewriting entire files (108→333 lines) instead of making targeted changes, breaking builds by changing exports.

**Solution:** Multi-layered validation system that enforces surgical, incremental changes.

## Files Created/Modified

### 1. Created: `/src/core/validation.ts` (New File)

**Purpose:** Core validation logic for checking file changes against scope constraints.

**Key Functions:**

```typescript
// Main validation function
validateFileChanges(
  original: string,
  modified: string,
  constraints?: Partial<ChangeConstraints>,
  effortScore?: number
): ValidationResult

// Export/Import checking
checkExportConsistency(original: string, modified: string): boolean
checkLineDelta(original: string, modified: string, maxDelta: number): boolean
extractExports(code: string): string[]
extractImports(code: string): string[]

// Utilities
getEffortBasedLimit(effortScore: number): number
formatValidationResult(result: ValidationResult): string
```

**Validation Constraints Enforced:**

1. **File Size Limits:**
   - Max 100 line delta (absolute)
   - Max 50% file growth
   - Example: 100-line file cannot exceed 150 lines

2. **Effort-Based Limits:**
   - Effort 1-2: Max 20 lines changed
   - Effort 3-4: Max 50 lines changed
   - Effort 5+: Max 100 lines changed

3. **Export Preservation:**
   - All export statements must remain identical
   - Detects: `export default`, `export { }`, `export const/function/class`

4. **Import Preservation:**
   - Warns if imports are removed
   - Allows adding new imports

**Line Counting:** Ignores empty lines and comments for accurate assessment.

---

### 2. Updated: `/src/core/types.ts`

**Added Interfaces:**

```typescript
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  originalLines: number;
  modifiedLines: number;
  lineDelta: number;
  lineGrowthPercent: number;
  exportsChanged: boolean;
  importsChanged: boolean;
  violations: string[];
}

export interface ChangeConstraints {
  maxLineDelta: number;
  maxGrowthPercent: number; // 0.5 = 50% max growth
  preserveExports: boolean;
  preserveImports: boolean;
  requireDiffFormat: boolean;
  effortBasedLineLimits?: {
    low: number;    // effort 1-2
    medium: number; // effort 3-4
    high: number;   // effort 5+
  };
}
```

---

### 3. Updated: `/src/plugins/implementation-claude.ts`

**Key Changes:**

**A. Added Imports:**
```typescript
import { validateFileChanges, formatValidationResult, getEffortBasedLimit } from '../core/validation';
```

**B. Added Validation Stats Tracking:**
```typescript
private validationStats = {
  total: 0,
  passed: 0,
  failed: 0,
  reasons: [] as string[],
};
```

**C. Enhanced Prompt with Scope Constraints:**
```typescript
**CRITICAL SCOPE CONSTRAINTS:**

🚨 MAKE SURGICAL CHANGES ONLY - DO NOT REWRITE FILES!

You MUST follow these constraints:
1. **Maximum Changes Based on Effort:**
   - Effort 1-2: Change at most 20 lines
   - Effort 3-4: Change at most 50 lines
   - Effort 5+: Change at most 100 lines

2. **Preserve Exports:** NEVER modify export statements
3. **Preserve Imports:** Do NOT remove imports
4. **File Growth Limit:** Max 50% larger than original
5. **Targeted Edits:** Modify specific code blocks, not entire files
```

**D. Pre-Implementation Validation:**
```typescript
// Before applying changes
if (oldContent && implementation.newCode) {
  this.validationStats.total++;

  const validationResult = validateFileChanges(
    oldContent,
    implementation.newCode,
    {
      maxLineDelta: 100,
      maxGrowthPercent: 0.5,
      preserveExports: true,
      preserveImports: true,
      effortBasedLineLimits: {
        low: 20,
        medium: 50,
        high: 100,
      },
    },
    recommendation.effort
  );

  console.log('\n' + formatValidationResult(validationResult));

  if (!validationResult.valid) {
    this.validationStats.failed++;
    console.warn(`   ❌ Change REJECTED by validation`);
    return null; // Skip this change
  }

  this.validationStats.passed++;
}
```

**E. Validation Summary Reporting:**
```typescript
console.log('\n   📊 Validation Summary:');
console.log(`      Total attempts: ${this.validationStats.total}`);
console.log(`      Passed: ${this.validationStats.passed}`);
console.log(`      Failed: ${this.validationStats.failed}`);
```

---

### 4. Updated: `/src/agents/specialized/ControlPanelAgent.ts`

**Key Changes:**

**A. Added Validation Imports:**
```typescript
import { validateFileChanges, formatValidationResult } from '../../core/validation';
```

**B. Enhanced Prompt Constraints:**
```typescript
**CRITICAL CONSTRAINTS:**
🚨 MAKE SURGICAL CHANGES ONLY - DO NOT REWRITE FILES!

1. **Make SURGICAL changes only**
2. **PRESERVE all export statements exactly**
3. **Maximum ${this.getMaxLinesForEffort(rec.effort)} lines changed**
4. **Use targeted edits: find specific code blocks**
5. **Do NOT rewrite components from scratch**
6. **Focus on className changes for visual improvements**

Examples of GOOD changes:
- Change className="text-sm" to className="text-base"
- Add shadow-md to a button's className
- Update padding from p-2 to p-4

Examples of BAD changes:
- Rewriting entire component
- Changing export statements
- Adding new components
```

**C. Pre-Write Validation:**
```typescript
// Before writing file
const validationResult = validateFileChanges(
  oldContent,
  implementation.newCode,
  {
    maxLineDelta: 100,
    maxGrowthPercent: 0.5,
    preserveExports: true,
    preserveImports: true,
    effortBasedLineLimits: { low: 20, medium: 50, high: 100 },
  },
  recommendation.effort
);

console.log('\n' + formatValidationResult(validationResult));

if (!validationResult.valid) {
  this.validationStats.failed++;
  console.warn(`   ❌ Change REJECTED: ${validationResult.reason}`);
  return null;
}
```

**D. Effort-Based Helper:**
```typescript
private getMaxLinesForEffort(effortScore: number): number {
  if (effortScore <= 2) return 20;
  if (effortScore <= 4) return 50;
  return 100;
}
```

---

### 5. Created: `/src/__tests__/validation.test.ts` (New File)

**Test Coverage:**

✅ **23 tests, all passing**

**Test Categories:**

1. **Small Targeted Changes (ACCEPTED)**
   - className modifications
   - Padding adjustments
   - Shadow additions

2. **Large Rewrites (REJECTED)**
   - Complete file rewrites
   - Files exceeding 50% growth

3. **Export Changes (REJECTED)**
   - Export signature modifications
   - Named export removals

4. **Effort-Based Constraints**
   - Effort-appropriate changes
   - Effort limit violations

5. **Import Preservation**
   - Import removal detection
   - New import addition (allowed)

6. **Integration Tests**
   - Real-world valid scenarios
   - Real-world invalid scenarios

**Example Test Output:**

```
✅ EXAMPLE 1: Valid targeted update
Validation: ✅ PASSED
  Lines: 11 → 11 (Δ0)
  Growth: 0.0%

❌ EXAMPLE 2: Invalid complete rewrite
Validation: ❌ FAILED
  Lines: 4 → 29 (Δ25)
  Growth: 625.0%
  Violations:
    - File grew by 625.0%, exceeds maximum 50%

❌ EXAMPLE 3: Export signature changed
Validation: ❌ FAILED
  Lines: 3 → 3 (Δ0)
  Growth: 0.0%
  ⚠️  Exports modified
  Violations:
    - Export statements changed
```

---

## Validation Flow

### Before This Implementation:
```
Agent generates code → Write to file → Build breaks → Rollback
```

### After This Implementation:
```
Agent generates code
  ↓
Validate changes
  ↓
[PASS] → Create backup → Write file → Success
[FAIL] → Reject change → Log reason → Skip
```

---

## Validation Examples

### ✅ ACCEPTED: Targeted className Change
```typescript
// Original (100 lines)
<button className="p-2 bg-blue-500">Click</button>

// Modified (100 lines)
<button className="p-4 bg-blue-600 shadow-md">Click</button>

// Validation Result:
// ✅ PASSED
// Lines: 100 → 100 (Δ0)
// Growth: 0.0%
// Exports: Preserved ✓
```

### ❌ REJECTED: Complete Rewrite
```typescript
// Original (108 lines)
export default function Header() {
  return <header>Simple</header>;
}

// Modified (333 lines) - Complete rewrite with new features
export default function Header() {
  // 300+ lines of new implementation
}

// Validation Result:
// ❌ FAILED
// Lines: 108 → 333 (Δ225)
// Growth: 208.3% (exceeds 50% limit)
// Violations:
//   - Line delta (225) exceeds maximum (100)
//   - File grew by 208.3%, exceeds maximum 50%
```

### ❌ REJECTED: Export Changed
```typescript
// Original
export default function MyComponent() {}

// Modified
export const MyComponent = () => {}

// Validation Result:
// ❌ FAILED
// Violations:
//   - Export statements changed
//   - Original exports: [MyComponent, function]
//   - Modified exports: [MyComponent]
```

### ❌ REJECTED: Effort Mismatch
```typescript
// Effort Score: 2 (allows max 20 lines)
// Original: 100 lines
// Modified: 135 lines (35 line delta)

// Validation Result:
// ❌ FAILED
// Violations:
//   - Effort score 2 allows max 20 lines changed
//   - But 35 lines were changed
//   - Make more targeted changes
```

---

## Key Constraint Logic

### 1. File Size Validation
```typescript
// Absolute delta check
if (lineDelta > 100) {
  reject("Too many lines changed");
}

// Growth percentage check
const growthPercent = (modifiedLines - originalLines) / originalLines;
if (growthPercent > 0.5) {
  reject("File grew by more than 50%");
}
```

### 2. Effort-Based Validation
```typescript
const maxLinesForEffort = {
  '1-2': 20,
  '3-4': 50,
  '5+': 100
};

if (lineDelta > maxLinesForEffort[effortScore]) {
  reject("Exceeds effort-based line limit");
}
```

### 3. Export Validation
```typescript
const originalExports = extractExports(original);
const modifiedExports = extractExports(modified);

if (!arraysEqual(originalExports, modifiedExports)) {
  reject("Export statements changed");
}
```

### 4. Import Validation
```typescript
const removedImports = originalImports.filter(
  imp => !modifiedImports.includes(imp)
);

if (removedImports.length > 0) {
  reject(`Imports removed: ${removedImports.join(', ')}`);
}
```

---

## Integration Points

### When Validation Runs:
1. **Implementation Plugin:** Before writing any file changes
2. **Control Panel Agent:** Before modifying managed components
3. **Any Future Agents:** Reusable validation module

### Validation Stats Tracking:
```typescript
{
  total: 5,      // Total change attempts
  passed: 3,     // Accepted changes
  failed: 2,     // Rejected changes
  reasons: [     // Failure reasons
    "Header.tsx: Line delta (225) exceeds maximum (100)",
    "Footer.tsx: Export statements changed"
  ]
}
```

### Console Output:
```
📊 Validation Summary:
   Total attempts: 5
   Passed: 3
   Failed: 2
   Failure reasons:
     - Header.tsx: Line delta (225) exceeds maximum (100)
     - Footer.tsx: Export statements changed
```

---

## Benefits

### 1. **Prevents Over-Engineering**
- Forces surgical, targeted changes
- No more complete file rewrites
- Maintains codebase stability

### 2. **Protects Build Integrity**
- Preserves export signatures
- Prevents breaking changes
- Catches issues before file write

### 3. **Effort-Appropriate Changes**
- Low effort → Small changes only
- High effort → Larger changes allowed
- Prevents scope creep

### 4. **Clear Feedback**
- Detailed violation messages
- Actionable suggestions
- Validation statistics

### 5. **Testable & Reliable**
- 23 passing unit tests
- Real-world scenario coverage
- Consistent enforcement

---

## Testing

### Run Validation Tests:
```bash
npm test -- validation.test.ts
```

### Test Results:
```
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total

✓ Small targeted changes (ACCEPTED)
✓ Large rewrites (REJECTED)
✓ Export changes (REJECTED)
✓ Effort-based constraints
✓ Import preservation
✓ Export extraction
✓ Import extraction
✓ Line delta checking
✓ Export consistency checking
✓ Validation formatting
✓ Integration scenarios
```

---

## Future Enhancements

### Potential Additions:
1. **Diff-based validation** - Parse actual diffs instead of full file comparison
2. **AST-based validation** - Use TypeScript AST for more accurate export detection
3. **Custom constraint profiles** - Per-agent or per-file-type constraints
4. **Validation bypass** - Allow override with explicit flag for special cases
5. **Metrics tracking** - Store validation stats in iteration reports

---

## Summary

### Files Created:
1. `/src/core/validation.ts` - Core validation logic (400+ lines)
2. `/src/__tests__/validation.test.ts` - Comprehensive tests (500+ lines)
3. `/SCOPE_CONSTRAINTS_IMPLEMENTATION.md` - This documentation

### Files Modified:
1. `/src/core/types.ts` - Added ValidationResult and ChangeConstraints interfaces
2. `/src/plugins/implementation-claude.ts` - Integrated validation before file writes
3. `/src/agents/specialized/ControlPanelAgent.ts` - Added validation and enhanced prompts

### Constraints Enforced:
✅ Maximum 100 line delta (absolute)
✅ Maximum 50% file growth
✅ Effort-based line limits (20/50/100)
✅ Export preservation (no signature changes)
✅ Import preservation (warn on removal)
✅ Pre-write validation (reject before file modification)
✅ Detailed logging and statistics

### Test Coverage:
✅ 23 unit tests, all passing
✅ Integration scenarios validated
✅ Real-world examples documented

**Result:** Production-grade scope constraints that prevent over-engineering and ensure surgical, incremental changes.
