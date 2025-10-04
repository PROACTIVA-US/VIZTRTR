# Claude Code Configuration

This directory contains Claude Code configuration for this project.

## Files

- **`cleanup.sh`** - Smart cleanup script that runs on `/exit`
  - Context-aware: reads `CLAUDE.md` to detect project type
  - Cleans temp files, cache, build artifacts
  - Updates timestamps in memory.md and STATUS.md

- **`hooks.json`** - Hook configuration
  - Triggers cleanup on `/exit`, `/quit`, `exit`, `quit`

- **`CLAUDE.md`** - Project context for Claude Code
  - Update this with project details
  - Used by cleanup script to determine what to clean

## Usage

When you type `/exit` in Claude Code, the cleanup script runs automatically.

To manually run cleanup:
```bash
./.claude/cleanup.sh
```

## Customization

Edit `CLAUDE.md` to describe your project. The cleanup script will adapt based on keywords:
- Python → cleans `__pycache__`, `.pyc` files
- Node.js → cleans `.log`, `.vite` cache
- C++ → cleans `.o`, build artifacts
- Audio → cleans temporary audio files
