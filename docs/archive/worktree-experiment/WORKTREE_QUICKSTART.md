# Git Worktree Quick Start Guide

**Created:** 2025-10-08
**Status:** ✅ All 8 worktrees active and ready

---

## ✅ Setup Complete

All worktrees have been created and dependencies installed:

```
/Users/danielconnolly/Projects/
├── VIZTRTR/                      (main branch)        - 1.4GB
├── VIZTRTR-phase1-scoring/       (phase1-scoring)     - 356MB
├── VIZTRTR-phase2-agents/        (phase2-agents)      - 355MB
├── VIZTRTR-phase3-strategy/      (phase3-strategy)    - 356MB
├── VIZTRTR-phase4-multiroute/    (phase4-multiroute)  - 356MB
├── VIZTRTR-phase5-metalearning/  (phase5-metalearning)- 356MB
├── VIZTRTR-testing/              (testing-env)        - 356MB
└── VIZTRTR-hotfix/               (hotfix-env)         - 356MB

Total: ~3.4GB
```

---

## 🚀 Quick Commands

### **List All Worktrees**

```bash
cd /Users/danielconnolly/Projects/VIZTRTR
git worktree list
```

### **Open VS Code Multi-Root Workspace**

```bash
cd /Users/danielconnolly/Projects
code viztrtr-e2e.code-workspace
```

### **Start Working on a Phase**

```bash
# Example: Phase 1 (Enhanced Scoring)
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring
git checkout -b feat/expert-review-panel
code .

# Make changes, commit
git add .
git commit -m "feat: implement TypographyExpertAgent"
git push origin feat/expert-review-panel
```

### **Sync All Worktrees with Remote**

```bash
# Run from any worktree
for dir in /Users/danielconnolly/Projects/VIZTRTR*/; do
  echo "Syncing $dir..."
  (cd "$dir" && git fetch origin)
done
```

### **Check Disk Usage**

```bash
du -sh /Users/danielconnolly/Projects/VIZTRTR*
```

---

## 📂 Worktree Purpose Guide

### **Main (VIZTRTR/)**

- **Purpose:** Production code, main branch
- **Use for:** Final merges, releases, documentation
- **Branch:** `main`
- **Never:** Develop features here

### **Phase 1 (VIZTRTR-phase1-scoring/)**

- **Purpose:** Enhanced scoring system (Week 1-2)
- **Deliverables:** 5 expert agents, EnhancedScoringEngine
- **Branch:** `phase1-scoring`
- **Start with:** `git checkout -b feat/expert-review-panel`

### **Phase 2 (VIZTRTR-phase2-agents/)**

- **Purpose:** Specialized implementation agents (Week 3-4)
- **Deliverables:** Typography, Color, Animation, A11y, Performance agents
- **Branch:** `phase2-agents`
- **Start with:** `git checkout -b feat/typography-agent`

### **Phase 3 (VIZTRTR-phase3-strategy/)**

- **Purpose:** Strategic planning & orchestration (Week 5)
- **Deliverables:** StrategicPlannerAgent, StoppingCriteriaEngine
- **Branch:** `phase3-strategy`
- **Start with:** `git checkout -b feat/strategic-planner`

### **Phase 4 (VIZTRTR-phase4-multiroute/)**

- **Purpose:** Multi-route testing (Week 6)
- **Deliverables:** RouteDiscoveryAgent, ParallelTestOrchestrator
- **Branch:** `phase4-multiroute`
- **Start with:** `git checkout -b feat/route-discovery`

### **Phase 5 (VIZTRTR-phase5-metalearning/)**

- **Purpose:** Self-improvement & meta-learning (Week 7-8)
- **Deliverables:** AgentPerformanceTracker, PromptEvolution, LessonLibrary
- **Branch:** `phase5-metalearning`
- **Start with:** `git checkout -b feat/lesson-library`

### **Testing (VIZTRTR-testing/)**

- **Purpose:** Benchmarks, integration tests
- **Use for:** Running tests without interrupting development
- **Branch:** `testing-env` (tracks main)
- **Never:** Commit feature code here

### **Hotfix (VIZTRTR-hotfix/)**

- **Purpose:** Emergency production fixes
- **Use for:** Critical bugs in main branch
- **Branch:** `hotfix-env` (tracks main)
- **Workflow:** Create `hotfix/issue-name` branch, fix, merge to main ASAP

---

## 🔄 Typical Workflow

### **Day 1: Start New Feature**

```bash
# 1. Go to appropriate phase worktree
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring

# 2. Create feature branch
git checkout -b feat/typography-expert

# 3. Make changes
code src/agents/experts/TypographyExpertAgent.ts

# 4. Build and test
npm run build
npm test -- --testPathPattern=TypographyExpert

# 5. Commit
git add .
git commit -m "feat: implement TypographyExpertAgent with readability scoring"
```

### **Day 2-3: Continue Development**

```bash
# Continue in same worktree, same branch
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring

# Pull latest main (if needed)
git fetch origin
git rebase origin/main

# Continue work
code .
```

### **Day 4: Ready for PR**

```bash
# Push feature branch
git push origin feat/typography-expert

# Create PR
gh pr create --title "Phase 1: TypographyExpertAgent" \
  --body "Implements readability scoring and font pairing analysis"

# Continue to next feature in parallel (different worktree!)
cd /Users/danielconnolly/Projects/VIZTRTR-phase2-agents
git checkout -b feat/color-palette-agent
```

### **After PR Merge**

```bash
# Update main worktree
cd /Users/danielconnolly/Projects/VIZTRTR
git pull origin main

# Update phase worktree with merged changes
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring
git fetch origin
git rebase origin/main

# Delete merged local branch
git branch -d feat/typography-expert

# Start next feature
git checkout -b feat/color-expert
```

---

## 🧪 Testing Across Worktrees

### **Scenario: Test Phase 2 with Phase 1 Features**

```bash
# Build Phase 1
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring
npm run build

# Go to testing worktree
cd /Users/danielconnolly/Projects/VIZTRTR-testing

# Merge both phases locally (no push)
git merge phase1-scoring --no-commit
git merge phase2-agents --no-commit

# Run integration tests
npm run build
npm test

# Discard merge (keep testing clean)
git reset --hard main
```

### **Scenario: Run Long Benchmarks**

```bash
# In testing worktree (doesn't block development)
cd /Users/danielconnolly/Projects/VIZTRTR-testing
npm run benchmark:performia  # Takes 30 minutes

# Meanwhile, continue development in phase worktrees
cd /Users/danielconnolly/Projects/VIZTRTR-phase2-agents
# Work continues without interruption
```

---

## 🚨 Emergency Hotfix Workflow

```bash
# 1. Go to hotfix worktree
cd /Users/danielconnolly/Projects/VIZTRTR-hotfix

# 2. Ensure on latest main
git pull origin main

# 3. Create hotfix branch
git checkout -b hotfix/critical-orchestrator-bug

# 4. Fix bug
code src/core/orchestrator.ts
git add .
git commit -m "fix: resolve critical orchestrator bug"

# 5. Push and merge immediately
git push origin hotfix/critical-orchestrator-bug
gh pr create --title "HOTFIX: Critical orchestrator bug" --base main
gh pr merge --squash

# 6. Update all other worktrees
cd /Users/danielconnolly/Projects/VIZTRTR && git pull origin main
cd /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring && git fetch origin && git rebase origin/main
cd /Users/danielconnolly/Projects/VIZTRTR-phase2-agents && git fetch origin && git rebase origin/main
# ... repeat for all worktrees
```

---

## 🧹 Cleanup & Maintenance

### **Remove Completed Phase Worktree**

```bash
# After phase1 merged to main
cd /Users/danielconnolly/Projects/VIZTRTR
git worktree remove ../VIZTRTR-phase1-scoring

# Delete remote branch
git push origin --delete phase1-scoring

# Delete local branch
git branch -d phase1-scoring
```

### **Clean Build Artifacts (All Worktrees)**

```bash
for dir in /Users/danielconnolly/Projects/VIZTRTR*/; do
  echo "Cleaning $dir..."
  (cd "$dir" && npm run clean:all)
done
```

### **Prune Stale Worktrees**

```bash
# If worktree directory deleted manually
git worktree prune
git worktree list
```

---

## 📊 VS Code Multi-Root Workspace Features

Open the workspace:

```bash
code /Users/danielconnolly/Projects/viztrtr-e2e.code-workspace
```

### **Features Available:**

1. **Sidebar Navigation** - All 8 worktrees in one view
2. **Global Search** - Search across all phases simultaneously
3. **Split Editors** - Compare implementations side-by-side
4. **Integrated Terminals** - One terminal per worktree
5. **Tasks** - Pre-configured build/test/sync tasks
6. **Debug Configurations** - Debug any phase tests
7. **Git Graph** - See all branches and worktrees visually

### **Keyboard Shortcuts:**

- `Cmd+P` → Quick file search across all worktrees
- `Cmd+Shift+F` → Global search
- `Ctrl+` \` → Toggle terminal (one per worktree)
- `Cmd+Shift+P` → Tasks: Run Build All Phases

---

## 🎯 Best Practices

### **DO:**

✅ Create feature branches in phase worktrees
✅ Commit frequently (squash before pushing)
✅ Keep worktrees synced with `git fetch` daily
✅ Use testing worktree for long-running tests
✅ Use hotfix worktree for emergencies only
✅ Remove worktrees after phase completion

### **DON'T:**

❌ Develop in main worktree
❌ Commit directly to phase branches (use feature branches)
❌ Share node_modules (keep isolated)
❌ Delete worktree directories manually (use `git worktree remove`)
❌ Checkout same branch in multiple worktrees

---

## 📈 Current Status

### **Week 1-2 (Current):**

- **Active:** Phase 1 worktree (enhanced scoring)
- **Focus:** Implement 5 expert agents
- **Next:** Create TypographyExpertAgent, ColorTheoryExpertAgent

### **Week 3-4 (Next):**

- **Activate:** Phase 2 worktree (specialized agents)
- **Parallel:** Phase 1 in code review, Phase 2 in development

### **Week 5+:**

- **Activate:** Remaining phase worktrees as needed
- **Strategy:** Sequential merges to minimize conflicts

---

## 🆘 Troubleshooting

### **Problem: "Cannot checkout branch, already in use"**

```bash
git worktree list  # Find which worktree uses the branch
```

### **Problem: "Working tree has modifications"**

```bash
git stash  # Or commit/discard changes
git worktree remove ../VIZTRTR-phase1-scoring
```

### **Problem: "Disk space running low"**

```bash
# Clean all worktrees
for dir in /Users/danielconnolly/Projects/VIZTRTR*/; do
  (cd "$dir" && npm run clean:all)
done

# Or remove completed phase worktrees
git worktree remove ../VIZTRTR-phase1-scoring
```

### **Problem: "Merge conflicts across phases"**

```bash
cd /Users/danielconnolly/Projects/VIZTRTR-phase2-agents
git fetch origin
git rebase origin/main  # VS Code shows conflicts
# Resolve in VS Code
git add .
git rebase --continue
```

---

## 📚 Additional Resources

- **Full Strategy:** `docs/GIT_WORKTREE_STRATEGY.md`
- **E2E Plan:** `docs/E2E_AUTOMATION_PLAN.md`
- **Roadmap:** `docs/IMPLEMENTATION_ROADMAP.md`
- **VS Code Workspace:** `/Users/danielconnolly/Projects/viztrtr-e2e.code-workspace`

---

**Status:** ✅ All worktrees operational and ready for parallel development
**Next Step:** Open VS Code workspace and begin Phase 1 development
**Command:** `code /Users/danielconnolly/Projects/viztrtr-e2e.code-workspace`
