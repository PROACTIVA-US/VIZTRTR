# Git Worktree Strategy for Parallel E2E Development

**Created:** 2025-10-08
**Purpose:** Enable parallel development across 5 phases using git worktrees

---

## Why Git Worktrees?

### **Benefits:**
1. **True Parallelism** - Work on multiple phases simultaneously without branch switching
2. **Isolated Environments** - Each worktree has independent `node_modules`, build artifacts
3. **Fast Context Switching** - No `git checkout` delays, instant directory switching
4. **Independent Testing** - Run tests in Phase 2 while developing Phase 3
5. **No Stash Hell** - Changes in one worktree don't affect others

### **Use Cases:**
- Develop Phase 1 (scoring) while testing Phase 2 (agents)
- Prototype risky features in dedicated worktree
- Run long-running benchmarks without blocking development
- Compare implementations side-by-side

---

## Worktree Architecture

### **Directory Structure**

```
/Users/danielconnolly/Projects/
├── VIZTRTR/                          # Main worktree (main branch)
│   ├── .git/                         # Git repository (shared)
│   ├── src/
│   ├── docs/
│   └── node_modules/
│
├── VIZTRTR-phase1-scoring/           # Phase 1 worktree
│   ├── src/
│   │   ├── agents/experts/           # Expert agents
│   │   └── scoring/                  # Enhanced scoring engine
│   └── node_modules/                 # Independent dependencies
│
├── VIZTRTR-phase2-agents/            # Phase 2 worktree
│   ├── src/
│   │   ├── agents/specialized/       # Specialized agents
│   │   └── tools/                    # Agent toolkits
│   └── node_modules/
│
├── VIZTRTR-phase3-strategy/          # Phase 3 worktree
│   ├── src/
│   │   ├── agents/StrategicPlanner/
│   │   └── utils/StoppingCriteria/
│   └── node_modules/
│
├── VIZTRTR-phase4-multiroute/        # Phase 4 worktree
│   ├── src/
│   │   ├── agents/RouteDiscovery/
│   │   └── orchestrators/Parallel/
│   └── node_modules/
│
├── VIZTRTR-phase5-metalearning/      # Phase 5 worktree
│   ├── src/
│   │   ├── meta/PromptEvolution/
│   │   ├── memory/LessonLibrary/
│   │   └── monitoring/Performance/
│   └── node_modules/
│
├── VIZTRTR-testing/                  # Testing/benchmarking worktree
│   ├── benchmark-projects/
│   ├── test-results/
│   └── node_modules/
│
└── VIZTRTR-hotfix/                   # Emergency hotfix worktree
    └── (clean main branch for urgent fixes)
```

---

## Setup Commands

### **Initial Setup**

```bash
# Navigate to main repository
cd /Users/danielconnolly/Projects/VIZTRTR

# Create Phase 1 worktree (Enhanced Scoring)
git worktree add -b phase1-scoring ../VIZTRTR-phase1-scoring main

# Create Phase 2 worktree (Specialized Agents)
git worktree add -b phase2-agents ../VIZTRTR-phase2-agents main

# Create Phase 3 worktree (Strategic Planning)
git worktree add -b phase3-strategy ../VIZTRTR-phase3-strategy main

# Create Phase 4 worktree (Multi-Route Testing)
git worktree add -b phase4-multiroute ../VIZTRTR-phase4-multiroute main

# Create Phase 5 worktree (Meta-Learning)
git worktree add -b phase5-metalearning ../VIZTRTR-phase5-metalearning main

# Create Testing worktree (always on main)
git worktree add ../VIZTRTR-testing main

# Create Hotfix worktree (always on main)
git worktree add ../VIZTRTR-hotfix main
```

### **Verify Setup**

```bash
# List all worktrees
git worktree list

# Expected output:
# /Users/danielconnolly/Projects/VIZTRTR                      abc123 [main]
# /Users/danielconnolly/Projects/VIZTRTR-phase1-scoring       def456 [phase1-scoring]
# /Users/danielconnolly/Projects/VIZTRTR-phase2-agents        ghi789 [phase2-agents]
# /Users/danielconnolly/Projects/VIZTRTR-phase3-strategy      jkl012 [phase3-strategy]
# /Users/danielconnolly/Projects/VIZTRTR-phase4-multiroute    mno345 [phase4-multiroute]
# /Users/danielconnolly/Projects/VIZTRTR-phase5-metalearning  pqr678 [phase5-metalearning]
# /Users/danielconnolly/Projects/VIZTRTR-testing              stu901 [main]
# /Users/danielconnolly/Projects/VIZTRTR-hotfix               vwx234 [main]
```

---

## Worktree Workflow

### **Phase 1: Enhanced Scoring (Week 1-2)**

#### **Setup Phase 1 Environment**

```bash
# Switch to Phase 1 worktree
cd ../VIZTRTR-phase1-scoring

# Install dependencies (independent from main)
npm install

# Create feature branch for expert agents
git checkout -b feat/expert-review-panel

# Start development
code .
```

#### **Development Workflow**

```bash
# Week 1, Day 1-2: Typography & Color Experts
# Work in: src/agents/experts/

# Create TypographyExpertAgent
code src/agents/experts/TypographyExpertAgent.ts

# Build and test in isolation
npm run build
npm test -- --testPathPattern=TypographyExpertAgent

# Commit progress
git add src/agents/experts/TypographyExpertAgent.ts
git commit -m "feat: implement TypographyExpertAgent with readability scoring"

# Continue with ColorTheoryExpertAgent
# ...
```

#### **Merge to Main**

```bash
# When milestone 1.1 complete
git push origin feat/expert-review-panel

# Create PR on GitHub
gh pr create --title "Phase 1: Expert Review Panel" \
  --body "Implements 5 expert agents for enhanced scoring"

# After PR approval, merge via GitHub UI or:
gh pr merge --squash

# Update main worktree
cd /Users/danielconnolly/Projects/VIZTRTR
git pull origin main
```

---

### **Phase 2: Specialized Agents (Week 3-4)**

#### **Parallel Development Strategy**

While Phase 1 is in code review, start Phase 2:

```bash
# Switch to Phase 2 worktree
cd ../VIZTRTR-phase2-agents

# Rebase on latest main (includes Phase 1 if merged)
git pull origin main
git rebase main

# Create feature branch
git checkout -b feat/typography-agent

# Install dependencies
npm install

# Develop TypographyMasterAgent
code src/agents/specialized/TypographyMasterAgent.ts
```

#### **Cross-Worktree Dependencies**

If Phase 2 depends on Phase 1 (not yet merged):

```bash
# Option 1: Cherry-pick specific commits from Phase 1
cd ../VIZTRTR-phase2-agents
git cherry-pick <commit-hash-from-phase1>

# Option 2: Merge Phase 1 branch temporarily
git merge phase1-scoring --no-commit
# Work on Phase 2
# Before pushing, rebase to remove merge commit

# Option 3: Wait for Phase 1 merge, then rebase
git fetch origin
git rebase origin/main
```

---

### **Phase 3-5: Concurrent Development**

#### **Parallel Workflow Example (Week 5)**

**Terminal 1 - Phase 3 (Strategic Planner):**
```bash
cd ../VIZTRTR-phase3-strategy
git checkout -b feat/strategic-planner
code src/agents/StrategicPlannerAgent.ts
npm run dev
```

**Terminal 2 - Phase 4 (Route Discovery):**
```bash
cd ../VIZTRTR-phase4-multiroute
git checkout -b feat/route-discovery
code src/agents/RouteDiscoveryAgent.ts
npm test -- --watch
```

**Terminal 3 - Phase 5 (Lesson Library):**
```bash
cd ../VIZTRTR-phase5-metalearning
git checkout -b feat/lesson-library
code src/memory/LessonLibrary.ts
npm run build
```

**Terminal 4 - Testing:**
```bash
cd ../VIZTRTR-testing
npm run test:performia  # Run benchmarks without interrupting dev
```

---

## Merge Strategy

### **Option 1: Sequential Merges (Safer)**

Merge phases in order to minimize conflicts:

```
Phase 1 (Week 2) → main
Phase 2 (Week 4) → main (rebased on Phase 1)
Phase 3 (Week 5) → main (rebased on Phase 2)
Phase 4 (Week 6) → main (rebased on Phase 3)
Phase 5 (Week 8) → main (rebased on Phase 4)
```

**Benefits:**
- Cleaner history
- Easier conflict resolution
- Dependencies naturally resolved

**Workflow:**
```bash
# Week 2: Merge Phase 1
cd ../VIZTRTR-phase1-scoring
git push origin phase1-scoring
gh pr merge --squash

# Week 4: Rebase Phase 2 on latest main, then merge
cd ../VIZTRTR-phase2-agents
git fetch origin
git rebase origin/main
git push origin phase2-agents --force-with-lease
gh pr merge --squash

# Repeat for Phase 3, 4, 5
```

---

### **Option 2: Parallel Merges (Faster)**

Merge phases as soon as ready, handle conflicts on rebase:

```
Phase 1 (Week 2) → main
Phase 2 (Week 4) → main (parallel to Phase 3)
Phase 3 (Week 5) → main (parallel to Phase 4)
Phase 4 (Week 6) → main (parallel to Phase 5)
Phase 5 (Week 8) → main
```

**Benefits:**
- Faster integration
- Immediate validation on main
- Continuous deployment possible

**Conflict Resolution:**
```bash
# If Phase 3 conflicts with Phase 2 (both merged to main)
cd ../VIZTRTR-phase3-strategy
git fetch origin
git rebase origin/main  # Resolve conflicts here

# Use VS Code merge editor
code .

# After resolving
git add .
git rebase --continue
git push origin phase3-strategy --force-with-lease
```

---

## Dependency Management

### **Strategy 1: Lock Dependencies**

Each worktree has independent `package.json`:

```bash
# Phase 1 worktree
cd ../VIZTRTR-phase1-scoring
npm install
# Creates VIZTRTR-phase1-scoring/node_modules

# Phase 2 worktree
cd ../VIZTRTR-phase2-agents
npm install
# Creates VIZTRTR-phase2-agents/node_modules (separate)
```

**Benefit:** Complete isolation, no version conflicts

**Drawback:** Disk space (5-7 GB per worktree)

---

### **Strategy 2: Symlink node_modules (Not Recommended)**

Share `node_modules` from main worktree:

```bash
# In each worktree
cd ../VIZTRTR-phase1-scoring
rm -rf node_modules
ln -s /Users/danielconnolly/Projects/VIZTRTR/node_modules node_modules
```

**Benefit:** Saves disk space

**Drawback:** Dependency conflicts, version hell

**Recommendation:** Only use for read-only worktrees (testing, hotfix)

---

### **Strategy 3: pnpm Workspaces (Hybrid)**

Use pnpm for shared dependency storage:

```bash
# Install pnpm globally
npm install -g pnpm

# Each worktree uses pnpm
cd ../VIZTRTR-phase1-scoring
pnpm install  # Uses shared store, unique node_modules

cd ../VIZTRTR-phase2-agents
pnpm install  # Shares common deps, isolates differences
```

**Benefit:** 50% disk space savings, still isolated

**Recommendation:** Migrate to pnpm if disk space is concern

---

## Testing Across Worktrees

### **Scenario 1: Test Phase 2 with Phase 1 Features**

```bash
# Build Phase 1 components
cd ../VIZTRTR-phase1-scoring
npm run build

# Copy build artifacts to Phase 2
cd ../VIZTRTR-phase2-agents
cp -r ../VIZTRTR-phase1-scoring/dist/agents/experts ./dist/agents/

# Test Phase 2 with Phase 1 experts
npm test
```

---

### **Scenario 2: Integration Testing**

```bash
# Use testing worktree for cross-phase integration
cd ../VIZTRTR-testing

# Merge all phase branches locally (no push)
git merge phase1-scoring --no-commit
git merge phase2-agents --no-commit
git merge phase3-strategy --no-commit

# Run full integration tests
npm run build
npm run test:integration

# Discard merge (keep testing clean)
git reset --hard main
```

---

## Cleanup & Maintenance

### **Remove Completed Worktree**

```bash
# After Phase 1 merged to main
cd /Users/danielconnolly/Projects/VIZTRTR

# Remove worktree (keeps branch)
git worktree remove ../VIZTRTR-phase1-scoring

# Delete remote branch
git push origin --delete phase1-scoring

# Delete local branch
git branch -d phase1-scoring
```

### **Prune Stale Worktrees**

```bash
# If worktree directory deleted manually
git worktree prune

# List remaining worktrees
git worktree list
```

### **Disk Space Management**

```bash
# Check worktree sizes
du -sh /Users/danielconnolly/Projects/VIZTRTR*

# Clean build artifacts in all worktrees
for dir in /Users/danielconnolly/Projects/VIZTRTR*/; do
  cd "$dir"
  npm run clean:all
done
```

---

## Best Practices

### **1. Name Branches Consistently**

```
phase1-scoring            (main feature branch)
├── feat/expert-panel     (sub-feature)
├── fix/typography-bug    (bug fix)
└── docs/scoring-guide    (documentation)
```

### **2. Keep Worktrees Synced**

```bash
# Daily: Fetch latest from origin in each worktree
cd ../VIZTRTR-phase1-scoring && git fetch origin
cd ../VIZTRTR-phase2-agents && git fetch origin
cd ../VIZTRTR-phase3-strategy && git fetch origin
```

### **3. Use .gitignore per Worktree**

Each worktree can have independent `.gitignore`:

```bash
# VIZTRTR-phase1-scoring/.gitignore
# Ignore phase-specific files
benchmark-results-phase1/
*.phase1.log
```

### **4. Commit Often, Push Deliberately**

```bash
# Commit frequently in worktree
git commit -m "wip: partial implementation"

# Squash before pushing
git rebase -i origin/main
# Mark all "wip" commits as "squash"

# Push clean history
git push origin phase1-scoring
```

---

## Emergency Hotfix Workflow

### **Production Bug in Main**

```bash
# Use dedicated hotfix worktree (always on main)
cd ../VIZTRTR-hotfix

# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix bug
code src/core/orchestrator.ts
git add .
git commit -m "fix: resolve critical orchestrator bug"

# Push and merge immediately
git push origin hotfix/critical-bug
gh pr create --title "HOTFIX: Critical orchestrator bug" --base main
gh pr merge --squash

# Update all other worktrees
cd ../VIZTRTR && git pull origin main
cd ../VIZTRTR-phase1-scoring && git fetch origin && git rebase origin/main
cd ../VIZTRTR-phase2-agents && git fetch origin && git rebase origin/main
# ... repeat for all worktrees
```

---

## VS Code Integration

### **Multi-Root Workspace**

Create `.code-workspace` file:

```json
{
  "folders": [
    {
      "name": "Main",
      "path": "/Users/danielconnolly/Projects/VIZTRTR"
    },
    {
      "name": "Phase 1: Scoring",
      "path": "/Users/danielconnolly/Projects/VIZTRTR-phase1-scoring"
    },
    {
      "name": "Phase 2: Agents",
      "path": "/Users/danielconnolly/Projects/VIZTRTR-phase2-agents"
    },
    {
      "name": "Phase 3: Strategy",
      "path": "/Users/danielconnolly/Projects/VIZTRTR-phase3-strategy"
    },
    {
      "name": "Testing",
      "path": "/Users/danielconnolly/Projects/VIZTRTR-testing"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  }
}
```

**Usage:**
```bash
code viztrtr-e2e.code-workspace
```

**Benefits:**
- See all phases in one window
- Search across all worktrees
- Unified terminal tabs
- Compare implementations side-by-side

---

## Troubleshooting

### **Problem: "fatal: 'phase1-scoring' is already checked out"**

**Cause:** Trying to checkout branch already used by another worktree

**Solution:**
```bash
# List worktrees to find which one uses the branch
git worktree list

# Remove old worktree or use different branch
git worktree remove ../VIZTRTR-phase1-scoring
```

---

### **Problem: "Cannot remove worktree, uncommitted changes"**

**Solution:**
```bash
# Commit or stash changes first
cd ../VIZTRTR-phase1-scoring
git add .
git commit -m "wip: save progress"

# Or discard changes
git reset --hard

# Then remove
cd /Users/danielconnolly/Projects/VIZTRTR
git worktree remove ../VIZTRTR-phase1-scoring
```

---

### **Problem: Merge conflicts across phases**

**Solution:**
```bash
# In conflicting worktree
git fetch origin
git rebase origin/main

# VS Code will show conflicts
code .

# After resolving
git add .
git rebase --continue
```

---

## Summary

### **Recommended Setup for E2E Development:**

1. **Create 5 phase worktrees** (phase1-5)
2. **Create 1 testing worktree** (always on main)
3. **Create 1 hotfix worktree** (always on main)
4. **Use VS Code multi-root workspace** for unified view
5. **Merge phases sequentially** to minimize conflicts
6. **Keep worktrees synced daily** with `git fetch`
7. **Remove worktrees** after phase merges to main

### **When to Use Worktrees:**

✅ **Use Worktrees For:**
- Parallel phase development
- Long-running benchmarks
- Feature prototyping
- Hotfix isolation
- Cross-phase testing

❌ **Don't Use Worktrees For:**
- Simple bug fixes (use `git stash`)
- Single-feature development (use regular branches)
- Short-lived experiments (use `git stash`)

---

**Document Owner:** Claude Code
**Created:** 2025-10-08
**Status:** Recommended Strategy
**Next Action:** Run initial worktree setup commands
