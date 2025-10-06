import { motion, AnimatePresence } from 'framer-motion';
import {
  PromptInput,
  AIEvaluationPanel,
  AgentOrchestration,
  LiveBuildView,
  ResultsPanel,
} from '../components';
import { useBuildStore } from '../store/buildStore';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BuilderPage() {
  const { buildState, evaluation, setPrompt, evaluatePrompt } = useBuildStore();

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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />

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
              <PromptInput
                onSubmit={prompt => {
                  setPrompt(prompt);
                  evaluatePrompt();
                }}
              />
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
              <a href="/docs" className="hover:text-slate-300 transition-colors">
                Documentation
              </a>
              <a href="/about" className="hover:text-slate-300 transition-colors">
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
      <Footer />
    </div>
  );
}
