import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useBuildStore } from '../store/buildStore';

const agentColors: Record<string, string> = {
  architect: '#8b5cf6', // Purple
  designer: '#ec4899', // Pink
  engineer: '#10b981', // Green
  tester: '#f59e0b', // Orange
  viztritr: '#6366f1', // Indigo
  system: '#64748b', // Slate
};

export function LiveBuildView() {
  const {
    buildState,
    activityLog,
    iterations,
    currentIteration,
    pauseBuild,
    resumeBuild,
    isBuilding,
    agents,
  } = useBuildStore();

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new log entries arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog]);

  // Don't render if build hasn't started
  if (!buildState) {
    return null;
  }
  const currentIterationData = iterations.find(it => it.iteration === currentIteration);
  const maxIterations = 5; // Default max iterations

  // Calculate overall composite score
  const compositeScore = currentIterationData?.compositeScore || 0;
  const targetScore = 8.5;

  const handlePauseResume = () => {
    if (isBuilding) {
      pauseBuild();
    } else if (buildState !== 'completed' && buildState !== 'error') {
      resumeBuild();
    }
  };

  const handleStop = () => {
    pauseBuild();
    useBuildStore.getState().reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-7xl mx-auto p-6 space-y-8"
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-100">
            {buildState === 'completed' ? 'Build Complete!' : 'Building...'}
          </h2>
          {buildState !== 'completed' && buildState !== 'error' && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>
                Iteration {currentIteration + 1} of {maxIterations}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {buildState !== 'completed' && buildState !== 'error' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePauseResume}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {isBuilding ? '⏸ Pause' : '▶ Resume'}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
          >
            ⏹ Stop
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Activity Log */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Live Activity Log</h3>

          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            <AnimatePresence mode="popLayout">
              {activityLog.map(entry => {
                const agentColor = agentColors[entry.agentId] || agentColors.system;
                const statusIcon =
                  entry.type === 'success' ? '✓' : entry.type === 'error' ? '✗' : '●';

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors hover:shadow-md hover:scale-[1.01]"
                  >
                    <div
                      className="flex-shrink-0 w-1 h-full rounded-full"
                      style={{ backgroundColor: agentColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium" style={{ color: agentColor }}>
                          {entry.agentName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.message}</p>
                    </div>
                    <div
                      className={`flex-shrink-0 text-sm ${
                        entry.type === 'success'
                          ? 'text-green-400'
                          : entry.type === 'error'
                            ? 'text-red-400'
                            : 'text-blue-400'
                      }`}
                    >
                      {statusIcon}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Right column: Screenshot Preview & Score Progress */}
        <div className="space-y-6">
          {/* Screenshot Preview */}
          {currentIterationData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Screenshot Preview</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Before */}
                {currentIterationData.beforeScreenshot && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Before</p>
                    <div className="rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={currentIterationData.beforeScreenshot}
                        alt="Before screenshot"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {/* After */}
                {currentIterationData.afterScreenshot && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">After</p>
                    <div className="rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={currentIterationData.afterScreenshot}
                        alt="After screenshot"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Overall Composite Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-lg p-6 shadow-xl shadow-blue-500/20 border border-slate-700"
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-4">Overall Quality Score</h3>

            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="12" fill="none" />
                  {/* Progress circle */}
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={compositeScore >= targetScore ? '#22c55e' : '#3b82f6'}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 440' }}
                    animate={{
                      strokeDasharray: `${(compositeScore / 10) * 440} 440`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>

                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    className="text-6xl font-bold text-slate-100"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    {compositeScore.toFixed(1)}
                  </motion.div>
                  <div className="text-lg text-slate-200">/ 10.0</div>
                  {compositeScore >= targetScore && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-green-400 font-medium mt-1"
                    >
                      ✓ Target reached!
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Score Dimensions */}
      {currentIterationData && currentIterationData.scores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800 rounded-lg p-6 role-region aria-labelledby"
        >
          <h3 className="text-lg font-semibold text-slate-100 mb-4 role-heading aria-level-3">Quality Dimensions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 role-list">
            {currentIterationData.scores.map((dimension, idx) => {
              const isHighest =
                dimension.score === Math.max(...currentIterationData.scores.map(d => d.score));

              return (
                <motion.div
                  key={dimension.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx, duration: 0.3 }}
                  className="space-y-2 role-listitem focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-medium text-base">
                      {dimension.name}
                      {isHighest && (
                        <span className="ml-2 text-xs text-yellow-400">⭐ Highest</span>
                      )}
                    </span>
                    <span className="text-xl font-semibold text-slate-100">
                      {dimension.score.toFixed(1)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          dimension.score >= 8.5
                            ? '#22c55e'
                            : dimension.score >= 7.0
                              ? '#3b82f6'
                              : '#f59e0b',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(dimension.score / 10) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * idx }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Active Agents Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Agent Status</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {agents.map(agent => {
            const agentColor = agentColors[agent.id] || agentColors.system;

            return (
              <motion.div
                key={agent.id}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-700/50 relative"
                style={{
                  boxShadow: agent.status === 'active' ? `0 0 20px ${agentColor}40` : undefined,
                }}
              >
                {/* Icon */}
                <motion.div
                  className="text-3xl"
                  animate={
                    agent.status === 'active'
                      ? {
                          scale: [1, 1.2, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: agent.status === 'active' ? Infinity : 0,
                  }}
                >
                  {agent.icon}
                </motion.div>

                {/* Name */}
                <div className="text-sm font-medium text-slate-100 text-center">{agent.name}</div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        agent.status === 'active'
                          ? '#10b981'
                          : agent.status === 'completed'
                            ? '#22c55e'
                            : agent.status === 'error'
                              ? '#ef4444'
                              : '#6b7280',
                    }}
                    animate={
                      agent.status === 'active'
                        ? {
                            opacity: [1, 0.5, 1],
                          }
                        : {}
                    }
                    transition={{
                      duration: 1.5,
                      repeat: agent.status === 'active' ? Infinity : 0,
                    }}
                  />
                  <span className="text-xs text-slate-400 capitalize">{agent.status}</span>
                </div>

                {/* Completed checkmark */}
                {agent.status === 'completed' && (
                  <motion.div
                    className="absolute top-2 right-2 text-green-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}

                {/* Active glow effect */}
                {agent.status === 'active' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    style={{
                      background: `radial-gradient(circle at center, ${agentColor}10, transparent 70%)`,
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
