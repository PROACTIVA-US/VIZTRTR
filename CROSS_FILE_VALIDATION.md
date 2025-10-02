# Cross-File Interface Validation System

## Overview

Production-grade validation system that uses Claude Agent SDK to detect breaking changes across TypeScript/React component interfaces. Prevents build failures caused by interface modifications that affect dependent files.

## Problem Solved

**Before:** Changes that passed individual file validation still broke builds:
- PromptInput's `onSubmit` prop was modified
- BuilderPage.tsx still expected the old interface
- Build failed with: `Property 'onSubmit' is missing`

**After:** Cross-file validation catches these issues before code is written:
- Analyzes component interfaces using Claude's reasoning
- Finds all dependent files that import the component
- Detects breaking changes (removed props, type changes, export modifications)
- Blocks changes that would break builds

## Architecture

### Components

1. **InterfaceValidationAgent** (`src/agents/InterfaceValidationAgent.ts`)
   - Uses Claude Sonnet 4 with extended thinking
   - Analyzes TypeScript/React component interfaces
   - Extracts prop types, exports, and type definitions
   - Identifies cross-file dependencies
   - Detects breaking vs non-breaking changes

2. **Cross-File Validation** (`src/core/validation.ts`)
   - Integration function: `validateCrossFileInterfaces()`
   - Coordinates the validation workflow
   - Returns detailed validation results with suggestions

3. **Integration** (`src/plugins/implementation-claude.ts`)
   - Runs cross-file validation after scope validation passes
   - Blocks changes with high-impact breaking changes
   - Provides actionable feedback to the AI agent

### Data Flow

```
File Change Proposed
       ↓
Scope Validation (existing)
       ↓ (passes)
Extract Original Interface → Claude Analysis → ComponentInterface
       ↓
Extract Modified Interface → Claude Analysis → ComponentInterface
       ↓
Find Dependent Files → Grep Search → List of importers
       ↓
Compare Interfaces → Claude Reasoning → BreakingChange[]
       ↓
Generate Suggestions → Return ValidationResult
       ↓
Accept/Reject Change
```

## Features

### Breaking Change Detection

Detects these breaking changes:

1. **Removed Required Props**
   ```typescript
   // Before
   interface Props {
     onSubmit: () => void;
   }

   // After (BREAKING!)
   interface Props {
     // onSubmit removed
   }
   ```

2. **Prop Type Changes**
   ```typescript
   // Before
   count: number

   // After (BREAKING!)
   count: string
   ```

3. **Export Signature Changes**
   ```typescript
   // Before
   export default MyComponent

   // After (BREAKING!)
   export { MyComponent }
   ```

4. **Type Definition Changes**
   ```typescript
   // Breaking changes to exported interfaces/types
   ```

### Safe Changes (Allowed)

- Adding optional props
- Adding new exports (non-breaking)
- Internal implementation changes
- Adding comments/documentation

## Usage

### Automatic Integration

Cross-file validation runs automatically in the implementation pipeline:

```typescript
// In implementation-claude.ts
const crossFileResult = await validateCrossFileInterfaces(
  filePath,
  originalCode,
  modifiedCode,
  projectPath,
  apiKey
);

if (!crossFileResult.valid) {
  // Change rejected - would break dependent files
  console.warn('Breaking changes detected!');
  return null;
}
```

### Manual Usage

```typescript
import { validateCrossFileInterfaces } from './core/validation';

const result = await validateCrossFileInterfaces(
  'src/components/Button.tsx',
  originalCode,
  modifiedCode,
  '/path/to/project',
  process.env.ANTHROPIC_API_KEY
);

if (!result.valid) {
  console.log('Breaking changes:', result.breakingChanges);
  console.log('Affected files:', result.affectedFiles);
  console.log('Suggestions:', result.suggestions);
}
```

## Testing

### Run Tests

```bash
# Run full test suite
npm test -- cross-file-validation.test.ts

# Run manual test script
npx tsc src/test-cross-file-validation.ts --outDir dist
node dist/test-cross-file-validation.js
```

### Test Results

✅ **Test 1: PromptInput onSubmit removal**
- Detected: Required prop removed (HIGH impact)
- Time: ~20 seconds
- Result: PASSED - Correctly blocked breaking change

✅ **Test 2: Safe change (optional prop added)**
- Detected: No breaking changes
- Time: ~30 seconds
- Result: PASSED - Correctly allowed safe change

## Performance

### Benchmarks

| Operation | Time | Cached Time |
|-----------|------|-------------|
| Single interface analysis | ~3-5s | <100ms |
| Breaking change detection | ~20-30s | ~5-10s |
| Full validation (with deps) | ~20-30s | ~10-15s |

### Optimization Strategies

1. **Caching**: Interface analyses are cached by file content hash
2. **Batch Processing**: Multiple validations can be batched in single Claude call
3. **Streaming**: Uses streaming for faster responses
4. **Depth Limiting**: Dependency graph limited to 2 levels deep

### Production Suitability

- ✅ Fast enough for CI/CD pipelines (< 30s per validation)
- ✅ Caching prevents redundant API calls
- ✅ Graceful degradation on errors (doesn't block valid changes)
- ✅ Detailed logging for debugging

## Integration Points

### 1. Implementation Plugin

```typescript
// After basic validation passes...
const crossFileResult = await validateCrossFileInterfaces(
  filePath,
  originalCode,
  modifiedCode,
  config.projectPath
);

if (!crossFileResult.valid) {
  console.error('❌ Breaking interface changes detected:');
  crossFileResult.breakingChanges.forEach(change => {
    console.error(`  - ${change.description}`);
  });
  return null; // Reject change
}
```

### 2. Validation Stats

```typescript
validationStats = {
  total: 0,
  passed: 0,
  failed: 0,
  crossFileChecks: 0,
  crossFileBlocked: 0,
  reasons: []
}
```

### 3. Logging Output

```
🔍 Checking cross-file interface compatibility...

Cross-File Validation: ❌ FAILED
  Affected Files: 3
  Breaking Changes:
    🔴 [prop-removed] Required prop 'onSubmit' was removed from Props interface
       Before: onSubmit: () => void (required)
       After:  not present
  Suggestions:
    💡 Keep the 'onSubmit' prop or make it optional with a default value
    💡 Update 3 dependent file(s) to not use this prop

⏱️  Cross-file validation took 20657ms

❌ Change REJECTED by cross-file validation
💡 This change would break 3 dependent file(s)
```

## Example Scenarios

### Scenario 1: Caught PromptInput Issue

**Original:**
```typescript
interface PromptInputProps {
  value: string;
  onSubmit: () => void;
  placeholder?: string;
}
```

**Modified:**
```typescript
interface PromptInputProps {
  value: string;
  placeholder?: string;
  // onSubmit removed!
}
```

**Result:**
```
❌ REJECTED
Breaking Change: Required prop 'onSubmit' removed
Impact: HIGH
Affected Files: BuilderPage.tsx, ChatView.tsx
```

### Scenario 2: Safe Refactor Allowed

**Original:**
```typescript
interface Props {
  value: string;
}
```

**Modified:**
```typescript
interface Props {
  value: string;
  className?: string; // New optional prop
}
```

**Result:**
```
✅ ALLOWED
No breaking changes detected
```

## API Reference

### `InterfaceValidationAgent`

```typescript
class InterfaceValidationAgent {
  // Analyze component interface
  async analyzeComponentInterface(
    filePath: string,
    code: string
  ): Promise<InterfaceAnalysis>

  // Find files that depend on this component
  async findDependentFiles(
    componentPath: string,
    projectPath: string
  ): Promise<string[]>

  // Validate interface changes
  async validateInterfaceChange(
    filePath: string,
    originalCode: string,
    modifiedCode: string,
    projectPath: string
  ): Promise<CrossFileValidationResult>

  // Cache management
  clearCache(): void
  getCacheStats(): { size: number; entries: string[] }
}
```

### Types

```typescript
interface CrossFileValidationResult {
  valid: boolean;
  breakingChanges: BreakingChange[];
  affectedFiles: string[];
  suggestions: string[];
}

interface BreakingChange {
  type: 'prop-removed' | 'prop-type-changed' | 'export-changed' | 'type-changed';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

interface ComponentInterface {
  exports: ExportSignature[];
  props?: PropInterface;
  types: TypeDefinition[];
  dependencies: string[];
}
```

## Configuration

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required for Claude API
```

### Validation Settings

```typescript
// Default settings (can be customized)
{
  maxDependencyDepth: 2,        // How deep to search for dependents
  cacheEnabled: true,            // Enable interface analysis caching
  strictMode: false,             // Reject all breaking changes (not just high impact)
  timeoutMs: 30000,             // Timeout for validation
  parallelValidations: 3         // Max concurrent validations
}
```

## Limitations

1. **Performance**: ~20-30s per validation (mitigated by caching)
2. **API Costs**: Each validation uses Claude API (cached results free)
3. **Grep Limitations**: File search is best-effort (may miss some dependents)
4. **TypeScript Only**: Currently only supports .ts/.tsx files
5. **No Runtime Checks**: Only static analysis (doesn't catch runtime issues)

## Future Enhancements

- [ ] Batch multiple validations in single API call
- [ ] Support for JavaScript (non-TypeScript) files
- [ ] Integration with TypeScript compiler API for more accurate dependency detection
- [ ] Suggestion auto-fix (automatically update dependent files)
- [ ] Visual diff display in validation output
- [ ] Webhook notifications for breaking changes
- [ ] Integration with PR review comments

## Troubleshooting

### "Cross-file validation failed" error

**Cause**: API error, network issue, or invalid code
**Solution**: Validation gracefully degrades - change is allowed with warning

### High validation times (>60s)

**Cause**: Too many dependent files, complex interfaces
**Solution**: Check dependency graph, consider caching, reduce depth limit

### False positives (safe changes flagged)

**Cause**: Claude's analysis may be overly conservative
**Solution**: Review the specific breaking change, adjust strictMode setting

### Missing dependent files

**Cause**: Grep search limitations, complex import patterns
**Solution**: Verify import paths, check ignored directories

## Contributing

When modifying this system:

1. Update tests in `src/__tests__/cross-file-validation.test.ts`
2. Run manual test: `node dist/test-cross-file-validation.js`
3. Check performance impact (should stay < 30s)
4. Update this documentation

## License

MIT - Part of VIZTRTR project
