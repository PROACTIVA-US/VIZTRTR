import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import type { DimensionScore } from '../store/buildStore';

// Confetti animation component
function Confetti() {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    rotation: Math.random() * 360,
    color: ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'][Math.floor(Math.random() * 5)],
    delay: Math.random() * 0.5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            backgroundColor: piece.color,
            left: `${piece.x}%`,
            top: '-10%',
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 100,
            opacity: [1, 1, 0],
            rotate: piece.rotation,
          }}
          transition={{
            duration: 3,
            delay: piece.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// Before/After screenshot slider component
function ScreenshotComparison({ before, after }: { before: string; after: string }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div
      className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Before screenshot */}
      <div className="absolute inset-0">
        <img src={before} alt="Before" className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-md">
          <span className="text-sm font-medium text-slate-300">Before</span>
        </div>
      </div>

      {/* After screenshot (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={after} alt="After" className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur-sm px-3 py-1.5 rounded-md">
          <span className="text-sm font-medium text-white">After</span>
        </div>
      </div>

      {/* Slider handle */}
      <div
        className="absolute inset-y-0 w-1 bg-white shadow-lg cursor-col-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Score bar component
function ScoreBar({ dimension }: { dimension: DimensionScore }) {
  const percentage = (dimension.score / 10) * 100;
  const isHighScore = dimension.score >= 8.5;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-300">{dimension.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{dimension.score.toFixed(1)}</span>
          {isHighScore && <span className="text-yellow-400">⭐</span>}
        </div>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Iteration timeline component
function IterationTimeline() {
  const iterations = useBuildStore((state) => state.iterations);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-100">Score Progression</h3>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {iterations.map((iteration, index) => (
          <motion.div
            key={iteration.iteration}
            className="flex flex-col items-center gap-1 min-w-[80px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                  iteration.compositeScore >= 8.5
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {iteration.compositeScore.toFixed(1)}
              </div>
              {index < iterations.length - 1 && (
                <div className="absolute top-1/2 left-full w-8 h-0.5 bg-slate-700 -translate-y-1/2" />
              )}
            </div>
            <span className="text-xs text-slate-400">
              {iteration.iteration === 0 ? 'Initial' : `Iter ${iteration.iteration}`}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Detailed iteration breakdown (expandable)
function DetailedReport() {
  const iterations = useBuildStore((state) => state.iterations);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Iteration Details</h3>
      <div className="space-y-4">
        {iterations.map((iteration) => (
          <motion.div
            key={iteration.iteration}
            className="bg-slate-800 rounded-lg p-4 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-slate-100">
                {iteration.iteration === 0 ? 'Initial Analysis' : `Iteration ${iteration.iteration}`}
              </h4>
              <span className="text-sm text-slate-400">
                {new Date(iteration.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {iteration.scores.map((dimension) => (
                <div key={dimension.name} className="flex justify-between text-sm">
                  <span className="text-slate-400">{dimension.name}</span>
                  <span className="font-medium text-slate-200">{dimension.score.toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-300">Composite Score</span>
                <span className="text-lg font-bold text-indigo-400">
                  {iteration.compositeScore.toFixed(1)} / 10
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Main ResultsPanel component
export function ResultsPanel() {
  const buildState = useBuildStore((state) => state.buildState);
  const iterations = useBuildStore((state) => state.iterations);
  const finalScore = useBuildStore((state) => state.finalScore);
  const downloadCode = useBuildStore((state) => state.downloadCode);
  const reset = useBuildStore((state) => state.reset);

  const [showConfetti, setShowConfetti] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isComplete = buildState === 'completed';
  const hasIterations = iterations.length > 0;
  const lastIteration = hasIterations ? iterations[iterations.length - 1] : null;
  const firstIteration = hasIterations ? iterations[0] : null;

  // Calculate composite score from last iteration
  const compositeScore = lastIteration?.compositeScore ?? finalScore ?? 0;
  const targetReached = compositeScore >= 8.5;

  // Show confetti when target is reached
  useEffect(() => {
    if (isComplete && targetReached && !showConfetti) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, targetReached, showConfetti]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCode();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartNew = () => {
    reset();
  };

  if (!isComplete || !hasIterations) {
    return null;
  }

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Confetti celebration */}
      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-4xl font-bold text-slate-100 flex items-center justify-center gap-3">
          Build Complete!
          {targetReached && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              🎉
            </motion.span>
          )}
        </h1>
        <div className="flex items-center justify-center gap-3">
          <span className="text-lg text-slate-300">VIZTRTR Quality Score:</span>
          <motion.span
            className={`text-3xl font-bold ${
              targetReached ? 'text-green-400' : 'text-yellow-400'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
          >
            {compositeScore.toFixed(1)} / 10
          </motion.span>
          {targetReached && (
            <motion.span
              className="text-2xl text-green-400"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.4 }}
            >
              ✓
            </motion.span>
          )}
        </div>
        {targetReached && (
          <p className="text-sm text-green-400">Target score of 8.5 achieved!</p>
        )}
      </motion.div>

      {/* Before/After Screenshots */}
      {firstIteration && lastIteration && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ScreenshotComparison
            before={firstIteration.beforeScreenshot}
            after={lastIteration.afterScreenshot}
          />
        </motion.div>
      )}

      {/* Iteration Timeline */}
      {iterations.length > 1 && (
        <motion.div
          className="bg-slate-800 rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <IterationTimeline />
        </motion.div>
      )}

      {/* 8-Dimension Score Breakdown */}
      {lastIteration && (
        <motion.div
          className="bg-slate-800 rounded-lg p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-slate-100">Design Quality Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lastIteration.scores.map((dimension, index) => (
              <motion.div
                key={dimension.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <ScoreBar dimension={dimension} />
              </motion.div>
            ))}
          </div>
          {lastIteration.scores.some((d) => d.score >= 8.5) && (
            <div className="pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <span>⭐</span>
                <span>Highest scoring dimensions (8.5+)</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Detailed Report (Expandable) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={() => setShowDetailedReport(!showDetailedReport)}
          className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg p-4 flex items-center justify-between transition-colors"
        >
          <span className="text-lg font-semibold text-slate-100">View Full Report</span>
          <motion.svg
            className="w-6 h-6 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: showDetailedReport ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {showDetailedReport && (
            <motion.div
              className="mt-4 bg-slate-800 rounded-lg p-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DetailedReport />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/50"
        >
          {isDownloading ? (
            <>
              <motion.svg
                className="w-5 h-5"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </motion.svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Code
            </>
          )}
        </button>

        {!targetReached && (
          <button
            onClick={() => {
              /* TODO: Implement run another iteration */
            }}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Run Another Iteration
          </button>
        )}

        <button
          onClick={handleStartNew}
          className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Start New Build
        </button>
      </motion.div>
    </motion.div>
  );
}
