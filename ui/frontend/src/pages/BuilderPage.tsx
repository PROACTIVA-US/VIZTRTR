import { motion, AnimatePresence } from 'framer-motion';
import {
  PromptInput,
  AIEvaluationPanel,
  AgentOrchestration,
  LiveBuildView,
  ResultsPanel,
} from '../components';
import { useBuildStore } from '../store/buildStore';

export default function BuilderPage() {
  const { buildState, evaluation } = useBuildStore();

  // Determine which components to show based on build state
  const showPromptInput = !buildState || buildState === 'error';
  const showEvaluation = evaluation !== null && buildState === null;
  const showOrchestration = buildState === null && evaluation !== null;
  const showLiveBuild =
    buildState === 'initializing' ||
    buildState === 'planning' ||
    buildState === 'designing' ||
    buildState === 'engineering' ||
    buildState === 'testing' ||
    buildState === 'refining';
  const showResults = buildState === 'completed';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header with VIZTRTR branding */}
      <header className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-30 animate-pulse" />
              <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 rounded-xl">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  strokeWidth={2}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                VIZTRTR
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                AI-Powered UI Builder with Autonomous Agents
              </p>
            </div>
          </div>

          {/* Build state indicator */}
          {buildState && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  buildState === 'completed'
                    ? 'bg-green-500'
                    : buildState === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500 animate-pulse'
                }`}
              />
              <span className="text-slate-300 capitalize">
                {buildState === 'initializing' && 'Initializing build...'}
                {buildState === 'planning' && 'Architect planning structure...'}
                {buildState === 'designing' && 'Designer creating layout...'}
                {buildState === 'engineering' && 'Engineer writing code...'}
                {buildState === 'testing' && 'Tester validating quality...'}
                {buildState === 'refining' && 'VIZTRTR improving UI...'}
                {buildState === 'completed' && 'Build completed successfully!'}
                {buildState === 'error' && 'Build encountered an error'}
              </span>
            </div>
          )}
        </div>

        {/* Gradient accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
      </header>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Prompt Input - Always visible unless build is in progress or complete */}
          {showPromptInput && (
            <motion.div
              key="prompt-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PromptInput />
            </motion.div>
          )}

          {/* Step 2: AI Evaluation Panel - Show after evaluation, before orchestration */}
          {showEvaluation && (
            <motion.div
              key="evaluation-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <AIEvaluationPanel />
            </motion.div>
          )}

          {/* Step 3: Agent Orchestration - Configure agents before build */}
          {showOrchestration && (
            <motion.div
              key="agent-orchestration"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <AgentOrchestration />
            </motion.div>
          )}

          {/* Step 4: Live Build View - Show during build execution */}
          {showLiveBuild && (
            <motion.div
              key="live-build"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <LiveBuildView />
            </motion.div>
          )}

          {/* Step 5: Results Panel - Show when build is complete */}
          {showResults && (
            <motion.div
              key="results-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background gradient accent */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>
      </main>

      {/* Footer with additional info */}
      <footer className="mt-16 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Claude
              </span>
              <span>+</span>
              <span className="font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                VIZTRTR
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/yourusername/viztritr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-300 transition-colors"
              >
                GitHub
              </a>
              <a
                href="/docs"
                className="hover:text-slate-300 transition-colors"
              >
                Documentation
              </a>
              <a
                href="/about"
                className="hover:text-slate-300 transition-colors"
              >
                About
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Add custom animations to tailwind.config.js */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
