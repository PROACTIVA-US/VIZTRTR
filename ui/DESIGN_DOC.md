# VIZTRTR UI - Complete Design Document

## Vision

An AI-powered development platform where users describe what they want to build, AI evaluates and suggests specialized agents, and users watch their project come to life with real-time agent visualization and VIZTRTR-powered UI improvements.

## Core Innovation

**Self-Improving UI**: This interface will be built WITH VIZTRTR, meaning the AI will iteratively improve its own interface design, creating a perfect dogfooding scenario.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PROJECT INPUT                                            │
│    User types: "Build a snake game with scoring"           │
│    OR uploads PRD document                                  │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AI EVALUATION                                            │
│    Claude analyzes prompt → suggests agents                 │
│    Shows: Project type, complexity, estimated time          │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AGENT ORCHESTRATION                                      │
│    User reviews suggested agents                            │
│    Can add/remove/modify agent roles                        │
│    See what each agent will do                              │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BUILD EXECUTION                                          │
│    Click "Start Build"                                      │
│    Watch live agent animation                               │
│    See agents pass work between each other                  │
│    VIZTRTR runs on output, improving UI                    │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RESULTS & ITERATION                                      │
│    See before/after screenshots                             │
│    Review VIZTRTR scores (8 dimensions)                    │
│    Download code or run another iteration                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Page Structure

```
App
├── Header (logo, nav, settings)
├── MainView (route-based)
│   ├── BuilderPage (main interface)
│   │   ├── PromptInput
│   │   ├── AIEvaluationPanel
│   │   ├── AgentOrchestration
│   │   ├── LiveBuildView
│   │   └── ResultsPanel
│   └── ProjectsPage (list of past projects)
└── Footer
```

---

## Detailed Component Specifications

### 1. PromptInput Component

**Purpose**: Accept user input for what to build

**Location**: Top of BuilderPage

**Features**:

- Large textarea with placeholder: "Describe what you want to build..."
- Character count (max 2000)
- File upload for PRD (accepts .md, .txt, .pdf)
- "Analyze with AI" button (primary CTA)
- Example prompts (clickable, fills textarea)

**States**:

- `idle` - Empty, ready for input
- `typing` - User is typing
- `uploaded` - PRD file uploaded
- `analyzing` - AI is evaluating (loading spinner)
- `evaluated` - Results ready, show next step

**API Integration**:

```typescript
POST /api/evaluate-prompt
Body: { text: string, type: 'prompt' | 'prd' }
Response: AIEvaluation
```

**Design**:

```
┌────────────────────────────────────────────────────────────┐
│ 📝 What do you want to build?                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐
│ │ Build a snake game with:                                │
│ │ - Arrow key controls                                    │
│ │ - Score tracking                                        │
│ │ - Difficulty levels                                     │
│ │                                                         │
│ │                                                  2000   │
│ └─────────────────────────────────────────────────────────┘
│                                                             │
│ OR  [📄 Upload PRD]  •  Examples: [Todo App] [Game] [Blog] │
│                                                             │
│                        [🤖 Analyze with AI]                 │
└────────────────────────────────────────────────────────────┘
```

---

### 2. AIEvaluationPanel Component

**Purpose**: Show AI's analysis and suggested approach

**Visibility**: Appears after prompt analysis

**Features**:

- Project type badge (Game, App, Website, etc.)
- Complexity indicator (Simple/Moderate/Complex)
- Estimated build time
- Key features extracted from prompt
- Technical requirements identified
- "Looks good!" or "Refine Prompt" buttons

**Design**:

```
┌────────────────────────────────────────────────────────────┐
│ AI Analysis                                                 │
│                                                             │
│ 🎮 Game Project  •  ⭐⭐⚪ Moderate  •  ⏱️ ~30 minutes     │
│                                                             │
│ Key Features:                                               │
│ ✓ Snake movement and controls                              │
│ ✓ Food spawning and collision                              │
│ ✓ Score tracking system                                    │
│ ✓ Multiple difficulty levels                               │
│                                                             │
│ Technical Stack:                                            │
│ • HTML5 Canvas for rendering                               │
│ • Vanilla JavaScript for game logic                        │
│ • CSS for UI styling                                       │
│                                                             │
│ [✏️ Refine Prompt]              [✅ Looks Good! Continue →] │
└────────────────────────────────────────────────────────────┘
```

---

### 3. AgentOrchestration Component

**Purpose**: Display and configure the agents that will build the project

**Visibility**: After AI evaluation approval

**Features**:

- Grid of agent cards (Architect, Designer, Engineer, Tester, VIZTRTR)
- Each card shows:
  - Agent icon/avatar
  - Name and role
  - Bullet list of responsibilities
  - Status indicator
- Click to expand and see/edit detailed tasks
- Add custom agent button
- Drag to reorder execution sequence

**Agent Types**:

1. **🧠 Architect Agent**
   - Creates project structure
   - Defines data models
   - Plans component hierarchy
   - Color: Purple (#8b5cf6)

2. **🎨 Designer Agent**
   - Creates layout and wireframes
   - Defines color scheme
   - Selects typography
   - Designs UI components
   - Color: Pink (#ec4899)

3. **⚙️ Engineer Agent**
   - Writes actual code
   - Implements game logic
   - Handles state management
   - Adds interactivity
   - Color: Green (#10b981)

4. **🔍 Tester Agent**
   - Writes test cases
   - Validates functionality
   - Checks edge cases
   - Ensures quality
   - Color: Orange (#f59e0b)

5. **✨ VIZTRTR Agent**
   - Analyzes UI design quality
   - Scores on 8 dimensions
   - Suggests improvements
   - Iteratively refines
   - Color: Indigo (#6366f1)

**Design**:

```
┌────────────────────────────────────────────────────────────┐
│ Your Build Team                                             │
│                                                             │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │ 🧠       │  │ 🎨       │  │ ⚙️       │  │ 🔍       │   │
│ │Architect │  │ Designer │  │ Engineer │  │  Tester  │   │
│ │          │  │          │  │          │  │          │   │
│ │• Structure│  │• Layout  │  │• Code    │  │• Tests   │   │
│ │• Models  │  │• Colors  │  │• Logic   │  │• Quality │   │
│ │• Plan    │  │• Fonts   │  │• State   │  │• Verify  │   │
│ │          │  │          │  │          │  │          │   │
│ │ ○ Ready  │  │ ○ Ready  │  │ ○ Ready  │  │ ○ Ready  │   │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│ ┌──────────┐                                               │
│ │ ✨       │                                               │
│ │VIZTRTR  │  Continuous UI improvement (8-dim scoring)    │
│ │ ○ Ready  │                                               │
│ └──────────┘                                               │
│                                                             │
│ [+ Add Agent]  [✏️ Customize Roles]    [▶️ Start Build]    │
└────────────────────────────────────────────────────────────┘
```

---

### 4. LiveBuildView Component

**Purpose**: Animated visualization of agents working

**Visibility**: During build execution

**Features**:

- Animated flow diagram showing agent activity
- Real-time status updates
- Progress indicators
- Live code preview (optional)
- Console/log output
- Pause/resume controls

**Animation System**:

- Agents pulse when active
- "Data" flows between agents (animated particles)
- Check marks appear when tasks complete
- VIZTRTR shows iteration count and score
- Smooth transitions between states

**States**:

```typescript
type BuildState =
  | 'initializing'   // Setting up agents
  | 'planning'       // Architect working
  | 'designing'      // Designer working
  | 'engineering'    // Engineer working
  | 'testing'        // Tester working
  | 'refining'       // VIZTRTR improving
  | 'completed'      // Build finished
  | 'error';         // Something failed
```

**Design**:

```
┌────────────────────────────────────────────────────────────┐
│ Building: Snake Game                           [⏸ Pause]    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│    🧠 Architect ─────✓─────> 🎨 Designer                   │
│         │                         │                         │
│         │                         ├──────●─────> ⚙️ Engineer│
│         ✓                         │                ↑        │
│                                   ✓                │        │
│                                                    ●        │
│         ✨ VIZTRTR ◀──────────────────────────────┘        │
│         Iteration 2/5                                       │
│         Score: 7.8/10 ↑+0.6                                │
│                                                             │
│ Latest Activity:                                            │
│ ✓ Architect: Created component structure                   │
│ ✓ Designer: Applied color scheme (#4ade80, #22c55e)        │
│ ● Engineer: Implementing snake movement logic...           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

### 5. ResultsPanel Component

**Purpose**: Show final output and VIZTRTR analysis

**Visibility**: After build completes

**Features**:

- Side-by-side before/after screenshots
- VIZTRTR score breakdown (8 dimensions)
- Score progression chart
- Download code button
- Run another iteration button
- Deploy options (future)

**Design**:

```
┌────────────────────────────────────────────────────────────┐
│ Build Complete! 🎉                                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────┬─────────────────────────┐     │
│ │  Initial (Score: 7.2)   │   Final (Score: 8.6) ✓  │     │
│ │ ┌─────────────────────┐ │ ┌─────────────────────┐ │     │
│ │ │                     │ │ │                     │ │     │
│ │ │   [Screenshot]      │ │ │   [Screenshot]      │ │     │
│ │ │                     │ │ │                     │ │     │
│ │ └─────────────────────┘ │ └─────────────────────┘ │     │
│ └─────────────────────────┴─────────────────────────┘     │
│                                                             │
│ VIZTRTR Quality Score: 8.6/10  (Target: 8.5 ✓)           │
│                                                             │
│ Accessibility      ████████░ 8.8 ⭐ Highest Score          │
│ Visual Hierarchy   ████████░ 8.5                           │
│ Typography         ████████░ 8.4                           │
│ Spacing & Layout   ████████░ 8.7                           │
│ Color & Contrast   ████████░ 8.3                           │
│ Component Design   ████████░ 8.6                           │
│ Animation          ████████░ 8.9                           │
│ Overall Aesthetic  ████████░ 8.5                           │
│                                                             │
│ [📥 Download Code]  [🔄 Run Another Iteration]  [🚀 Deploy]│
└────────────────────────────────────────────────────────────┘
```

---

## State Management (Zustand)

### Build Store

```typescript
interface BuildStore {
  // Input
  prompt: string;
  promptType: 'prompt' | 'prd';
  prdFile: File | null;

  // Evaluation
  evaluation: AIEvaluation | null;
  isEvaluating: boolean;

  // Agents
  agents: Agent[];
  agentConnections: AgentConnection[];

  // Build
  buildState: BuildState;
  currentAgent: string | null;
  activityLog: ActivityLogEntry[];

  // Results
  iterations: IterationResult[];
  currentIteration: number;
  finalScore: number | null;

  // Actions
  setPrompt: (text: string) => void;
  uploadPRD: (file: File) => void;
  evaluatePrompt: () => Promise<void>;
  modifyAgent: (agentId: string, updates: Partial<Agent>) => void;
  startBuild: () => Promise<void>;
  pauseBuild: () => void;
  downloadCode: () => void;
}
```

---

## API Endpoints Needed

### Backend (Express)

```typescript
// Evaluate prompt with Claude
POST /api/evaluate-prompt
Body: { text: string, type: 'prompt' | 'prd' }
Response: AIEvaluation

// Start build with agents
POST /api/builds
Body: { prompt: string, agents: Agent[] }
Response: { buildId: string }

// Stream build progress (SSE)
GET /api/builds/:id/stream
Response: Server-Sent Events

// Get build result
GET /api/builds/:id/result
Response: BuildResult
```

---

## Animation Specifications

### Agent Activity Animation

**Idle State**:

- Agent card has subtle shadow
- Icon is static
- Status dot is gray

**Active State**:

- Agent card glows (box-shadow with color)
- Icon pulses gently
- Status dot turns green and pulses
- Progress bar animates

**Completed State**:

- Checkmark animation (scale + fade in)
- Status dot turns solid green
- Glow fades out

### Data Flow Animation

- Small circles (particles) flow along connecting lines
- Use SVG path animation
- Speed: 2 seconds per transfer
- Color matches the sending agent
- Fades in at start, fades out at end

### VIZTRTR Iteration Animation

- Score counter animates to new value
- Progress bar fills smoothly
- Screenshot crossfades (before → after)
- Dimension bars update with spring animation

---

## Color Palette

```css
/* Agents */
--agent-architect: #8b5cf6;   /* Purple */
--agent-designer: #ec4899;     /* Pink */
--agent-engineer: #10b981;     /* Green */
--agent-tester: #f59e0b;       /* Orange */
--agent-viztritr: #6366f1;     /* Indigo */

/* Status */
--status-idle: #6b7280;        /* Gray */
--status-active: #10b981;      /* Green */
--status-completed: #22c55e;   /* Light green */
--status-error: #ef4444;       /* Red */

/* UI */
--bg-primary: #0f172a;         /* Dark blue */
--bg-secondary: #1e293b;       /* Lighter dark blue */
--text-primary: #f1f5f9;       /* Almost white */
--text-secondary: #94a3b8;     /* Gray */
--accent: #3b82f6;             /* Blue */
```

---

## Responsive Breakpoints

- Mobile: < 640px (stack components vertically)
- Tablet: 640px - 1024px (2-column grid)
- Desktop: > 1024px (full layout)

---

## Implementation Priority

### Phase 1: Core Scaffold (Agents will build this)

1. ✓ Project structure
2. ✓ Tailwind setup
3. PromptInput component
4. Basic routing

### Phase 2: AI Integration (Agents will build this)

5. Backend `/api/evaluate-prompt` endpoint
6. AIEvaluationPanel component
7. API client utilities

### Phase 3: Agent System (Agents will build this)

8. AgentOrchestration component
9. Agent card sub-components
10. State management setup

### Phase 4: Live Build (Agents will build this)

11. LiveBuildView component
12. Animation system
13. SSE integration
14. Activity log

### Phase 5: Results (Agents will build this)

15. ResultsPanel component
16. Screenshot comparison
17. Score visualization
18. Download functionality

### Phase 6: VIZTRTR Self-Improvement

19. Configure VIZTRTR to run on itself
20. Document iterations
21. Apply improvements
22. Case study writeup

---

## Success Metrics

1. **User completes prompt → build flow** in under 2 minutes
2. **AI evaluation accuracy** > 90% (user approves without refinement)
3. **Agent visualization is clear** - users understand what's happening
4. **VIZTRTR achieves 9.0+ score** on its own UI
5. **Zero user confusion** - no need for documentation to use

---

## Next Steps

1. Use Task agents to build components in parallel
2. Test each component independently
3. Integrate with backend
4. Run VIZTRTR on the complete UI
5. Iterate based on AI recommendations
6. Deploy demo

---

**This UI will be the first app built by AI that was also designed by AI (itself).**
