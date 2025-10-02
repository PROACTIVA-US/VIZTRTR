import { create } from 'zustand';
import {
  evaluatePrompt as apiEvaluatePrompt,
  startBuild as apiStartBuild,
  downloadBuildCode,
  subscribeToBuildStream,
  parseBuildEvent,
  type AIEvaluation,
} from '../api/client';

// Constants
export const MAX_CHARACTERS = 2000;

// Build state matching design doc
export type BuildState =
  | 'initializing'
  | 'planning'
  | 'designing'
  | 'engineering'
  | 'testing'
  | 'refining'
  | 'completed'
  | 'error';

// Agent interface matching design doc
export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  icon: string;
  responsibilities: string[];
  status: 'idle' | 'active' | 'completed' | 'error';
}

export interface AgentConnection {
  from: string;
  to: string;
  status: 'pending' | 'active' | 'completed';
}

export interface ActivityLogEntry {
  id: string;
  agentId: string;
  agentName: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error';
}

export interface DimensionScore {
  name: string;
  score: number;
  weight: number;
}

export interface IterationResult {
  iteration: number;
  beforeScreenshot: string;
  afterScreenshot: string;
  scores: DimensionScore[];
  compositeScore: number;
  timestamp: Date;
}

// BuildStore interface matching design doc
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
  buildState: BuildState | null;
  buildId: string | null;
  currentAgent: string | null;
  activityLog: ActivityLogEntry[];
  isBuilding: boolean;
  eventSource: EventSource | null;

  // Results
  iterations: IterationResult[];
  currentIteration: number;
  finalScore: number | null;

  // Actions
  setPrompt: (text: string) => void;
  uploadPRD: (file: File) => void;
  evaluatePrompt: () => Promise<void>;
  modifyAgent: (agentId: string, updates: Partial<Agent>) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  startBuild: () => Promise<void>;
  pauseBuild: () => void;
  resumeBuild: () => void;
  updateBuildState: (state: BuildState) => void;
  updateCurrentAgent: (agentId: string | null) => void;
  addActivityLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  addIteration: (iteration: IterationResult) => void;
  downloadCode: () => Promise<void>;
  reset: () => void;
}

// Initial agents matching design doc specifications
const initialAgents: Agent[] = [
  {
    id: 'architect',
    name: 'Architect',
    role: 'System Architecture',
    color: '#8b5cf6',
    icon: '🧠',
    responsibilities: [
      'Creates project structure',
      'Defines data models',
      'Plans component hierarchy',
    ],
    status: 'idle',
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'UI/UX Design',
    color: '#ec4899',
    icon: '🎨',
    responsibilities: [
      'Creates layout and wireframes',
      'Defines color scheme',
      'Selects typography',
      'Designs UI components',
    ],
    status: 'idle',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'Code Implementation',
    color: '#10b981',
    icon: '⚙️',
    responsibilities: [
      'Writes actual code',
      'Implements logic',
      'Handles state management',
      'Adds interactivity',
    ],
    status: 'idle',
  },
  {
    id: 'tester',
    name: 'Tester',
    role: 'Quality Assurance',
    color: '#f59e0b',
    icon: '🔍',
    responsibilities: [
      'Writes test cases',
      'Validates functionality',
      'Checks edge cases',
      'Ensures quality',
    ],
    status: 'idle',
  },
  {
    id: 'viztritr',
    name: 'VIZTRTR',
    role: 'UI Improvement',
    color: '#6366f1',
    icon: '✨',
    responsibilities: [
      'Analyzes UI design quality',
      'Scores on 8 dimensions',
      'Suggests improvements',
      'Iteratively refines',
    ],
    status: 'idle',
  },
];

const initialConnections: AgentConnection[] = [
  { from: 'architect', to: 'designer', status: 'pending' },
  { from: 'designer', to: 'engineer', status: 'pending' },
  { from: 'engineer', to: 'tester', status: 'pending' },
  { from: 'tester', to: 'viztritr', status: 'pending' },
  { from: 'viztritr', to: 'engineer', status: 'pending' }, // Feedback loop
];

export const useBuildStore = create<BuildStore>((set, get) => ({
  // Initial state
  prompt: '',
  promptType: 'prompt',
  prdFile: null,
  evaluation: null,
  isEvaluating: false,
  agents: initialAgents,
  agentConnections: initialConnections,
  buildState: null,
  buildId: null,
  currentAgent: null,
  activityLog: [],
  isBuilding: false,
  eventSource: null,
  iterations: [],
  currentIteration: 0,
  finalScore: null,

  // Actions
  setPrompt: (text: string) => {
    set({ prompt: text, promptType: 'prompt', prdFile: null });
  },

  uploadPRD: (file: File) => {
    set({ prdFile: file, promptType: 'prd' });
  },

  evaluatePrompt: async () => {
    const { prompt, prdFile, promptType } = get();

    set({ isEvaluating: true });

    try {
      const evaluation = await apiEvaluatePrompt({
        text: prdFile ? '' : prompt,
        type: promptType,
        file: prdFile || undefined,
      });

      set({ evaluation, isEvaluating: false });
    } catch (error) {
      console.error('Evaluation failed:', error);
      set({ isEvaluating: false });
      throw error;
    }
  },

  modifyAgent: (agentId: string, updates: Partial<Agent>) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
    }));
  },

  addAgent: (agent: Agent) => {
    set((state) => ({
      agents: [...state.agents, agent],
    }));
  },

  removeAgent: (agentId: string) => {
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== agentId),
      agentConnections: state.agentConnections.filter(
        (conn) => conn.from !== agentId && conn.to !== agentId
      ),
    }));
  },

  startBuild: async () => {
    const { prompt, agents, addActivityLog } = get();

    set({ isBuilding: true, buildState: 'initializing' });

    try {
      const result = await apiStartBuild({ prompt, agents });

      set({ buildId: result.buildId, buildState: 'planning' });

      // Set up SSE connection for build updates
      const eventSource = subscribeToBuildStream(result.buildId);

      eventSource.onmessage = (event) => {
        const buildEvent = parseBuildEvent(event.data);
        if (buildEvent) {
          switch (buildEvent.type) {
            case 'state':
              get().updateBuildState(buildEvent.data);
              break;
            case 'agent':
              get().updateCurrentAgent(buildEvent.data);
              break;
            case 'log':
              get().addActivityLog(buildEvent.data);
              break;
            case 'iteration':
              get().addIteration(buildEvent.data);
              break;
            case 'complete':
              set({ buildState: 'completed', isBuilding: false });
              eventSource.close();
              break;
            case 'error':
              set({ buildState: 'error', isBuilding: false });
              addActivityLog({
                agentId: 'system',
                agentName: 'System',
                message: `Build error: ${buildEvent.data}`,
                type: 'error',
              });
              eventSource.close();
              break;
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        set({ buildState: 'error', isBuilding: false });
        eventSource.close();
      };

      set({ eventSource });

      addActivityLog({
        agentId: 'system',
        agentName: 'System',
        message: 'Build started successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Build start failed:', error);
      set({ isBuilding: false, buildState: 'error' });

      get().addActivityLog({
        agentId: 'system',
        agentName: 'System',
        message: `Build failed to start: ${error}`,
        type: 'error',
      });

      throw error;
    }
  },

  pauseBuild: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null });
    }
    set({ isBuilding: false });

    get().addActivityLog({
      agentId: 'system',
      agentName: 'System',
      message: 'Build paused by user',
      type: 'info',
    });
  },

  resumeBuild: () => {
    set({ isBuilding: true });

    get().addActivityLog({
      agentId: 'system',
      agentName: 'System',
      message: 'Build resumed',
      type: 'info',
    });
  },

  updateBuildState: (state: BuildState) => {
    set({ buildState: state });
  },

  updateCurrentAgent: (agentId: string | null) => {
    set({ currentAgent: agentId });

    // Update agent statuses
    set((state) => ({
      agents: state.agents.map((agent) => ({
        ...agent,
        status:
          agent.id === agentId
            ? 'active'
            : state.currentAgent && agent.id === state.currentAgent
            ? 'completed'
            : agent.status,
      })),
    }));
  },

  addActivityLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    set((state) => ({
      activityLog: [
        ...state.activityLog,
        {
          ...entry,
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
        },
      ],
    }));
  },

  addIteration: (iteration: IterationResult) => {
    set((state) => ({
      iterations: [...state.iterations, iteration],
      currentIteration: iteration.iteration,
      finalScore: iteration.compositeScore,
    }));
  },

  downloadCode: async () => {
    const { buildId } = get();

    if (!buildId) {
      throw new Error('No build ID available');
    }

    try {
      await downloadBuildCode(buildId);

      get().addActivityLog({
        agentId: 'system',
        agentName: 'System',
        message: 'Code downloaded successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Download failed:', error);

      get().addActivityLog({
        agentId: 'system',
        agentName: 'System',
        message: `Download failed: ${error}`,
        type: 'error',
      });

      throw error;
    }
  },

  reset: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }

    set({
      prompt: '',
      promptType: 'prompt',
      prdFile: null,
      evaluation: null,
      isEvaluating: false,
      agents: initialAgents,
      agentConnections: initialConnections,
      buildState: null,
      buildId: null,
      currentAgent: null,
      activityLog: [],
      isBuilding: false,
      eventSource: null,
      iterations: [],
      currentIteration: 0,
      finalScore: null,
    });
  },
}));
