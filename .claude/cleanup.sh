#!/bin/bash
# Smart Context-Aware Cleanup Script
# Reads .claude/CLAUDE.md to determine project type and cleanup needs

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"

# Silent operation - only show errors
exec 2>&1

echo "🧹 Running smart cleanup..."

# CRITICAL: Check for and move any project files created outside the project directory
PARENT_DIR="$(dirname "$PROJECT_ROOT")"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

# Look for common project-specific directories that may have been created outside
for dir in "viztritr-output" "viztrtr-output" "ui" ".viztrtr" ".viztritr"; do
  if [ -d "$PARENT_DIR/$dir" ]; then
    echo "  ⚠️  Found '$dir' outside project - moving back into $PROJECT_NAME/"
    rsync -av "$PARENT_DIR/$dir/" "$PROJECT_ROOT/$dir/" 2>/dev/null || true
    rm -rf "$PARENT_DIR/$dir" 2>/dev/null || true
    echo "  ✅ Moved $dir back into project"
  fi
done

# Always clean these universal temp files
find "$PROJECT_ROOT" -type f \( \
  -name ".DS_Store" \
  -o -name "*.tmp" \
  -o -name "*.swp" \
  -o -name "*~" \
  -o -name ".*.swp" \
\) -delete 2>/dev/null || true

# Detect project type and clean accordingly
if [ -f "$CLAUDE_MD" ]; then
  CONTENT=$(cat "$CLAUDE_MD")

  # Python project
  if echo "$CONTENT" | grep -qi "python\|\.py\|backend"; then
    echo "  → Python cleanup"
    find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -type f -name "*.pyc" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type f -name "*.pyo" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type f -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
  fi

  # Node.js/Frontend project
  if echo "$CONTENT" | grep -qi "node\|npm\|frontend\|react\|vite"; then
    echo "  → Node.js cleanup"
    find "$PROJECT_ROOT" -type f -name "*.log" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type d -name ".vite" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -type d -name "dist" -path "*/tmp/*" -exec rm -rf {} + 2>/dev/null || true
  fi

  # C++ project
  if echo "$CONTENT" | grep -qi "c++\|juce\|\.cpp"; then
    echo "  → C++ cleanup"
    find "$PROJECT_ROOT" -type f -name "*.o" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type f -name "*.obj" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type d -name "build" -path "*/tmp/*" -exec rm -rf {} + 2>/dev/null || true
  fi

  # Audio project
  if echo "$CONTENT" | grep -qi "audio\|wav\|mp3\|song"; then
    echo "  → Audio temp cleanup"
    find "$PROJECT_ROOT" -type f -name "*.tmp.wav" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -type f -name "*.tmp.mp3" -delete 2>/dev/null || true
  fi
fi

# Note: We do NOT update timestamps in memory.md here
# memory.md timestamps should only be updated during session documentation,
# not during cleanup. Cleanup script should only remove temp files.

# Remove empty directories (except protected ones)
find "$PROJECT_ROOT" -type d -empty \
  -not -path "*/.git/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/venv/*" \
  -not -path "*/__pycache__/*" \
  -delete 2>/dev/null || true

# Archive old markdown docs (>30 days) if docs/ exists
if [ -d "$PROJECT_ROOT/docs" ]; then
  mkdir -p "$PROJECT_ROOT/docs/archive"
  find "$PROJECT_ROOT/docs" -maxdepth 1 -type f -name "*.md" \
    ! -name "README.md" \
    ! -name "STATUS.md" \
    -mtime +30 \
    -exec mv {} "$PROJECT_ROOT/docs/archive/" \; 2>/dev/null || true
fi

echo "✅ Cleanup complete"
