# Project Containment Rules

**Date Created:** 2025-10-08
**Status:** Mandatory
**Severity:** CRITICAL ⚠️

---

## Rule: All Project Files Must Stay Within Project Directory

**Violation:** Creating files or directories outside of `/Users/danielconnolly/Projects/VIZTRTR/`

### Problem

When code uses relative paths like `path.resolve(__dirname, '../..')` in compiled JavaScript, the `__dirname` variable points to the `dist/` directory instead of the source directory. This can cause:

1. **Files created in wrong location** - Output directories created in `/Users/danielconnolly/Projects/` instead of `/Users/danielconnolly/Projects/VIZTRTR/`
2. **Path resolution errors** - Pointing to non-existent directories like `/Users/danielconnolly/Projects/ui/frontend`
3. **Cleanup complexity** - Files scattered outside project requiring manual cleanup

### Examples of Violations

❌ **WRONG:**
```typescript
// In projects/viztrtr-ui/config.ts (compiled to dist/projects/viztrtr-ui/config.js)
const projectRoot = path.resolve(__dirname, '../..'); // Goes to dist/ instead of VIZTRTR/
const output = path.join(projectRoot, 'viztritr-output'); // Creates /Users/.../Projects/dist/viztritr-output
```

✅ **CORRECT:**
```typescript
// In projects/viztrtr-ui/config.ts
const projectRoot = path.resolve(__dirname, '../../..'); // dist/projects/viztrtr-ui -> VIZTRTR/
const output = path.join(projectRoot, 'viztritr-output'); // Creates /Users/.../VIZTRTR/viztritr-output
```

---

## Mandatory Practices

### 1. Always Use Absolute Paths for Project Root

**When writing config files that will be compiled:**

```typescript
// Count levels correctly: dist/projects/viztrtr-ui -> dist/projects -> dist -> VIZTRTR
const projectRoot = path.resolve(__dirname, '../../..');
```

**Verification command:**
```bash
node -e "const path = require('path'); const __dirname = '/path/to/dist/location'; console.log(path.resolve(__dirname, '../../..'));"
```

### 2. Validate Paths Before Use

**Always add path validation:**

```typescript
export const config: VIZTRTRConfig = {
  projectPath: uiFrontendPath,
  outputDir: path.join(projectRoot, 'viztritr-output/test'),
  // ... other config
};

// Validation
if (!config.projectPath.includes('/VIZTRTR/')) {
  throw new Error(`Invalid projectPath: ${config.projectPath} - must be inside VIZTRTR project`);
}

if (!config.outputDir.includes('/VIZTRTR/')) {
  throw new Error(`Invalid outputDir: ${config.outputDir} - must be inside VIZTRTR project`);
}
```

### 3. Add Comments for Path Resolution

**Always document path resolution logic:**

```typescript
// Find the actual project root (where package.json is)
// When compiled, __dirname is in dist/projects/viztrtr-ui
// We need to go up 3 levels: dist/projects/viztrtr-ui -> dist/projects -> dist -> VIZTRTR
const projectRoot = path.resolve(__dirname, '../../..');
```

### 4. Test Path Resolution Before Running

**Before running any test or script:**

```bash
# Dry-run to verify paths
node -e "const config = require('./dist/projects/test/config.js'); console.log('Project:', config.config.projectPath); console.log('Output:', config.config.outputDir);"

# Verify both paths contain /VIZTRTR/
```

---

## Cleanup Strategy

### Automatic Cleanup (On `/end-session`)

The cleanup script (`.claude/cleanup.sh`) now automatically:

1. **Detects project files outside the project directory**
2. **Moves them back into the project**
3. **Removes empty directories**

**Monitored directories:**
- `viztritr-output`
- `viztrtr-output`
- `ui`
- `.viztrtr`
- `.viztritr`

**Cleanup script logic:**
```bash
# Look for common project-specific directories created outside
for dir in "viztritr-output" "viztrtr-output" "ui" ".viztrtr" ".viztritr"; do
  if [ -d "$PARENT_DIR/$dir" ]; then
    echo "  ⚠️  Found '$dir' outside project - moving back into $PROJECT_NAME/"
    rsync -av "$PARENT_DIR/$dir/" "$PROJECT_ROOT/$dir/"
    rm -rf "$PARENT_DIR/$dir"
    echo "  ✅ Moved $dir back into project"
  fi
done
```

### Manual Verification

**Before ending session, always check:**

```bash
# List all directories in parent folder
ls -la /Users/danielconnolly/Projects/ | grep -v "^d.*\s\.$"

# Should NOT see:
# - viztritr-output
# - ui
# - Any VIZTRTR-related directories

# If found, move back:
rsync -av /Users/danielconnolly/Projects/viztritr-output/ /Users/danielconnolly/Projects/VIZTRTR/viztritr-output/
rm -rf /Users/danielconnolly/Projects/viztritr-output
```

---

## Prevention Methods

### Method 1: Use Hardcoded Project Root (Safest)

```typescript
// For critical production configs, use hardcoded absolute path
const VIZTRTR_ROOT = '/Users/danielconnolly/Projects/VIZTRTR';
const config: VIZTRTRConfig = {
  projectPath: path.join(VIZTRTR_ROOT, 'ui/frontend'),
  outputDir: path.join(VIZTRTR_ROOT, 'viztritr-output/test'),
};
```

**Pros:** Zero risk of path errors
**Cons:** Not portable across machines

### Method 2: Environment Variable

```typescript
// Use env var for project root
const VIZTRTR_ROOT = process.env.VIZTRTR_ROOT || path.resolve(__dirname, '../../..');

if (!VIZTRTR_ROOT.endsWith('/VIZTRTR')) {
  throw new Error('VIZTRTR_ROOT must point to VIZTRTR project directory');
}
```

**Set in `.env`:**
```
VIZTRTR_ROOT=/Users/danielconnolly/Projects/VIZTRTR
```

### Method 3: package.json Script with --cwd

```json
{
  "scripts": {
    "test:viztrtr-ui": "npm run build && node --require dotenv/config dist/projects/viztrtr-ui/test.js"
  }
}
```

**Then in code:**
```typescript
const projectRoot = process.cwd(); // Will be VIZTRTR/ when run via npm script
```

---

## Checklist for New Scripts/Configs

Before creating any new test configuration or script:

- [ ] Identify where `__dirname` will be when compiled
- [ ] Calculate correct number of `../` to reach project root
- [ ] Add comment documenting path resolution logic
- [ ] Add validation checks that paths contain `/VIZTRTR/`
- [ ] Test path resolution with `node -e` before running
- [ ] Verify output directory will be inside project
- [ ] Add to cleanup script if new directory patterns created

---

## Examples of Correct Configurations

### Example 1: Test Config in `projects/*/config.ts`

```typescript
import { VIZTRTRConfig } from '../../src/core/types';
import * as path from 'path';

// Compiled to: dist/projects/test-name/config.js
// __dirname will be: /Users/.../VIZTRTR/dist/projects/test-name
// Need to go up 3 levels to reach VIZTRTR/
const projectRoot = path.resolve(__dirname, '../../..');

// Validation
if (!projectRoot.endsWith('/VIZTRTR')) {
  throw new Error(`Project root calculation error: ${projectRoot}`);
}

export const config: VIZTRTRConfig = {
  projectPath: path.join(projectRoot, 'ui/frontend'),
  outputDir: path.join(projectRoot, 'viztritr-output/test-name'),
};

// Double-check on export
console.log('✅ Config Validation:');
console.log(`   Project Root: ${projectRoot}`);
console.log(`   Project Path: ${config.projectPath}`);
console.log(`   Output Dir: ${config.outputDir}`);
```

### Example 2: Example Script in `examples/*.ts`

```typescript
import * as path from 'path';

// Compiled to: dist/examples/demo.js
// __dirname will be: /Users/.../VIZTRTR/dist/examples
// Need to go up 2 levels to reach VIZTRTR/
const projectRoot = path.resolve(__dirname, '../..');

const outputDir = path.join(projectRoot, 'viztritr-output/demo');
```

---

## Emergency Recovery

If files are created outside the project:

```bash
# 1. Stop all running processes
/end-session

# 2. Manually move files back
rsync -av /Users/danielconnolly/Projects/viztritr-output/ /Users/danielconnolly/Projects/VIZTRTR/viztritr-output/
rsync -av /Users/danielconnolly/Projects/ui/ /Users/danielconnolly/Projects/VIZTRTR/ui/

# 3. Remove external directories
rm -rf /Users/danielconnolly/Projects/viztritr-output
rm -rf /Users/danielconnolly/Projects/ui

# 4. Verify cleanup
ls -la /Users/danielconnolly/Projects/
```

---

**Last Updated:** 2025-10-08
**Reviewed By:** Claude Code
**Status:** Mandatory for all new code
