# End Session Checklist

This checklist MUST be followed completely when ending a Claude Code session.

## ✅ Required Steps (DO NOT SKIP ANY)

### 1. Document Session in memory.md
- [ ] Run `git log --oneline -10` to see recent commits
- [ ] Run `git status` to see uncommitted work
- [ ] Update `.claude/memory.md` with new dated section:
  - What was accomplished
  - What was tested/verified
  - Key decisions made
  - Files created/modified with line numbers
  - Commits made during session
  - What's left to do
- [ ] Update "Last Updated" timestamp
- [ ] Update "Next Session Recommendations"

### 2. Commit Session Documentation
- [ ] Run `git add .claude/memory.md`
- [ ] Commit with format: `docs: session [date] - [brief summary]`
- [ ] Verify commit succeeded

### 3. Run Cleanup Script
- [ ] Execute `bash .claude/cleanup.sh`
- [ ] Verify cleanup completed successfully
- [ ] Check if cleanup modified any files (timestamp updates)

### 4. Commit Cleanup Changes
- [ ] Run `git status` to check for cleanup modifications
- [ ] If files modified: `git add -A && git commit -m "docs: update timestamp after session cleanup"`
- [ ] Verify commit succeeded

### 5. Kill Background Processes
- [ ] Check for running background shells with `/bashes` or similar
- [ ] Kill ALL background shells before pushing
- [ ] Verify no servers running on localhost (3000, 3001, 5001, 5173, etc.)

### 6. Push to Origin
- [ ] Check current branch: `git branch --show-current`
- [ ] If on `main`/`master`: Push with `git push origin main --no-verify`
  - Use `--no-verify` to skip pre-push hooks (already validated in pre-commit)
  - Pre-push hooks often timeout and cause confusion
- [ ] If on feature branch: Offer to create PR (see step 7)
- [ ] Verify push succeeded (check output)
- [ ] Run `git status` to confirm "up to date with origin"

### 7. Create PR (Feature Branches Only)
- [ ] Only if NOT on `main`/`master`
- [ ] Ask user: "Create PR for this work? (y/n)"
- [ ] If yes: Use session summary for PR description
- [ ] Use `gh pr create --title "[title]" --body "[description]"`

### 8. Final Verification
- [ ] Run `git status` - should show "working tree clean" and "up to date"
- [ ] Confirm all background processes killed
- [ ] Provide session summary to user:
  - What was accomplished
  - Commits pushed
  - Current branch status
  - Next actions

## 🚨 Common Mistakes to Avoid

1. **DON'T skip pushing** - Session is not complete until commits are on origin
2. **DON'T leave background processes running** - Kill them BEFORE pushing
3. **DON'T use pre-push hooks** - Use `--no-verify` to avoid timeouts
4. **DON'T forget to document** - Memory.md MUST be updated every session
5. **DON'T assume cleanup is optional** - Always run cleanup.sh

## 📋 Quick Verification Commands

```bash
# Check commits not yet pushed
git log origin/main..HEAD --oneline

# Check for uncommitted changes
git status --short

# Check current branch
git branch --show-current

# List background processes
# (Use Claude Code's /bashes command or similar)

# Verify nothing listening on common ports
lsof -ti:3000,3001,5001,5173 2>/dev/null || echo "All ports clear"
```

## 🎯 Success Criteria

Session is ONLY complete when ALL of these are true:

- ✅ memory.md updated with session notes
- ✅ All changes committed (git status shows "working tree clean")
- ✅ All commits pushed to origin (git status shows "up to date")
- ✅ All background processes killed
- ✅ Cleanup script executed
- ✅ User provided with session summary

---

**If ANY step fails, STOP and fix it before proceeding to next step.**
