#!/usr/bin/env node

/**
 * Repository cleanup utility for VIZTRTR
 * Identifies and optionally removes unnecessary files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Files/patterns to check for removal
const CLEANUP_PATTERNS = {
  logs: ['*.log', '*.tmp'],
  temp: ['test-*.md', 'RESUME_HERE.md'],
  build: ['dist/', 'coverage/'],
  cache: ['.tsbuildinfo', '.eslintcache'],
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function findFiles(pattern) {
  try {
    const cmd = process.platform === 'win32'
      ? `dir /b /s "${pattern}" 2>nul`
      : `find . -maxdepth 1 -name "${pattern}" -not -path "./node_modules/*" 2>/dev/null`;
    
    const output = execSync(cmd, { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      try {
        const cmd = process.platform === 'win32'
          ? `powershell -command "(Get-ChildItem -Path '${filePath}' -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB"`
          : `du -sh "${filePath}" | cut -f1`;
        return execSync(cmd, { encoding: 'utf8' }).trim();
      } catch {
        return 'unknown';
      }
    }
    return `${(stats.size / 1024).toFixed(2)} KB`;
  } catch (error) {
    return 'unknown';
  }
}

async function analyzeRepository() {
  log('\n📊 Repository Analysis\n', 'blue');

  const findings = {};

  for (const [category, patterns] of Object.entries(CLEANUP_PATTERNS)) {
    findings[category] = [];
    
    for (const pattern of patterns) {
      const files = findFiles(pattern);
      findings[category].push(...files);
    }
  }

  // Display findings
  let totalFiles = 0;
  for (const [category, files] of Object.entries(findings)) {
    if (files.length > 0) {
      log(`\n${category.toUpperCase()}:`, 'yellow');
      files.forEach(file => {
        const size = getFileSize(file);
        log(`  - ${file} (${size})`, 'reset');
        totalFiles++;
      });
    }
  }

  if (totalFiles === 0) {
    log('\n✨ Repository is clean! No files to remove.\n', 'green');
    return null;
  }

  log(`\n📦 Total files found: ${totalFiles}\n`, 'yellow');
  return findings;
}

async function cleanupRepository(dryRun = true) {
  const findings = await analyzeRepository();
  
  if (!findings) return;

  if (dryRun) {
    log('\n🔍 DRY RUN MODE - No files will be deleted\n', 'blue');
    log('Run with --execute to actually delete files\n', 'yellow');
    return;
  }

  log('\n🗑️  Deleting files...\n', 'red');

  for (const [category, files] of Object.entries(findings)) {
    for (const file of files) {
      try {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
        log(`  ✓ Deleted: ${file}`, 'green');
      } catch (error) {
        log(`  ✗ Failed: ${file} - ${error.message}`, 'red');
      }
    }
  }

  log('\n✨ Cleanup complete!\n', 'green');
}

// Main execution
const isDryRun = !process.argv.includes('--execute');
cleanupRepository(isDryRun).catch(error => {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
});
