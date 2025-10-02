import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { AgentCard } from './AgentCard';

export function AgentOrchestration() {
  const {
    agents,
    modifyAgent,
    startBuild,
    buildState,
  } = useBuildStore();

  const [showAddAgent, setShowAddAgent] = useState(false);

  const handleStartBuild = () => {
    if (buildState === null) {
      startBuild();
    }
  };

  const canStartBuild = buildState === null && agents.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Your Build Team
        </h2>
        <p className="text-slate-400">
          AI agents working together to build your project
        </p>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatePresence mode="popLayout">
          {agents
            .filter((agent) => agent.id !== 'viztritr')
            .map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={(updates) => modifyAgent(agent.id, updates)}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* VIZTRTR Agent - Full Width */}
      <AnimatePresence>
        {agents.find((a) => a.id === 'viztritr') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-6"
          >
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              {/* Colored top border */}
              <div className="h-1 w-full bg-indigo-500" />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <motion.div
                    className="text-4xl"
                    animate={
                      agents.find((a) => a.id === 'viztritr')?.status === 'active'
                        ? { scale: [1, 1.1, 1] }
                        : {}
                    }
                    transition={{
                      duration: 2,
                      repeat:
                        agents.find((a) => a.id === 'viztritr')?.status === 'active'
                          ? Infinity
                          : 0,
                    }}
                  >
                    ✨
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-100">
                          VIZTRTR Agent
                        </h3>
                        <p className="text-sm text-slate-400">
                          Continuous UI improvement (8-dimensional scoring)
                        </p>
                      </div>

                      {/* Status */}
                      <motion.div
                        className="flex items-center gap-2"
                        animate={
                          agents.find((a) => a.id === 'viztritr')?.status === 'active'
                            ? { opacity: [1, 0.5, 1] }
                            : {}
                        }
                        transition={{
                          duration: 1.5,
                          repeat:
                            agents.find((a) => a.id === 'viztritr')?.status === 'active'
                              ? Infinity
                              : 0,
                        }}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            agents.find((a) => a.id === 'viztritr')?.status === 'active'
                              ? 'bg-green-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 capitalize">
                          {agents.find((a) => a.id === 'viztritr')?.status || 'idle'}
                        </span>
                      </motion.div>
                    </div>

                    {/* Tasks in horizontal layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {agents
                        .find((a) => a.id === 'viztritr')
                        ?.responsibilities.map((task, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-400"
                          >
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>{task}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {/* Add Agent Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddAgent(!showAddAgent)}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Agent
        </motion.button>

        {/* Customize Roles Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Customize Roles
        </motion.button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Start Build Button */}
        <motion.button
          whileHover={canStartBuild ? { scale: 1.05 } : {}}
          whileTap={canStartBuild ? { scale: 0.95 } : {}}
          onClick={handleStartBuild}
          disabled={!canStartBuild}
          className={`px-8 py-3 rounded-lg font-semibold text-white text-lg flex items-center gap-3 transition-all ${
            canStartBuild
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {buildState === null ? 'Start Build' : 'Building...'}
        </motion.button>
      </div>

      {/* Add Agent Modal (placeholder) */}
      <AnimatePresence>
        {showAddAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddAgent(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-xl font-semibold text-slate-100 mb-4">
                Add Custom Agent
              </h3>
              <p className="text-slate-400 mb-4">
                Custom agent creation coming soon! You'll be able to define specialized
                agents with custom roles and responsibilities.
              </p>
              <button
                onClick={() => setShowAddAgent(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
