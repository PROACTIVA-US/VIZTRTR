import { motion, AnimatePresence } from 'framer-motion';
import { useBuildStore } from '../store/buildStore';

/**
 * AIEvaluationPanel Component
 *
 * Shows AI's analysis after prompt evaluation
 * - Project type, complexity, estimated duration
 * - Key features with animated checkmarks
 * - Technical requirements with icons
 * - Suggested agents display
 * - Action buttons to proceed or refine
 */
export default function AIEvaluationPanel() {
  const { evaluation, agents } = useBuildStore();

  // Don't render if no evaluation
  if (!evaluation) return null;

  // Get complexity badge styling
  const getComplexityStyle = () => {
    switch (evaluation.complexity) {
      case 'Simple':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'Complex':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // Get complexity stars
  const getComplexityStars = () => {
    switch (evaluation.complexity) {
      case 'Simple':
        return '⭐☆☆';
      case 'Moderate':
        return '⭐⭐☆';
      case 'Complex':
        return '⭐⭐⭐';
      default:
        return '☆☆☆';
    }
  };

  // Get project type emoji
  const getProjectTypeEmoji = () => {
    const type = evaluation.projectType.toLowerCase();
    if (type.includes('game')) return '🎮';
    if (type.includes('app')) return '📱';
    if (type.includes('website') || type.includes('blog')) return '🌐';
    if (type.includes('tool')) return '🔧';
    if (type.includes('dashboard')) return '📊';
    return '✨';
  };

  // Get technical requirement icon
  const getTechIcon = (tech: string) => {
    const lowerTech = tech.toLowerCase();
    if (lowerTech.includes('html') || lowerTech.includes('canvas')) return '🎨';
    if (lowerTech.includes('javascript') || lowerTech.includes('js')) return '⚡';
    if (lowerTech.includes('react')) return '⚛️';
    if (lowerTech.includes('css') || lowerTech.includes('style')) return '💅';
    if (lowerTech.includes('typescript')) return '📘';
    if (lowerTech.includes('node')) return '🟢';
    if (lowerTech.includes('database') || lowerTech.includes('db')) return '🗄️';
    if (lowerTech.includes('api')) return '🔌';
    return '•';
  };

  const handleProceed = () => {
    // This will be handled by parent component showing AgentOrchestration
    // The presence of evaluation already triggers the next step
    console.log('Proceeding with evaluation');
  };

  const handleRefine = () => {
    // Reset evaluation to allow user to refine prompt
    useBuildStore.getState().reset();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-4xl mx-auto mt-8"
      >
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-3xl"
            >
              🤖
            </motion.span>
            <h2 className="text-2xl font-bold text-white">AI Analysis</h2>
          </div>

          {/* Project Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 mb-6"
          >
            {/* Project Type Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 shadow-md">
              <span className="text-xl">{getProjectTypeEmoji()}</span>
              <span className="text-white font-medium">{evaluation.projectType}</span>
            </div>

            <span className="text-gray-500">•</span>

            {/* Complexity Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getComplexityStyle()}`}
            >
              <span className="text-lg">{getComplexityStars()}</span>
              <span className="font-medium">{evaluation.complexity}</span>
            </div>

            <span className="text-gray-500">•</span>

            {/* Estimated Time */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 shadow-md">
              <span className="text-xl">⏱️</span>
              <span className="text-white font-medium">{evaluation.estimatedTime}</span>
            </div>
          </motion.div>

          {/* Key Features */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Key Features:</h3>
            <div className="space-y-2">
              {evaluation.keyFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.6 + index * 0.1,
                      type: 'spring',
                      stiffness: 200,
                    }}
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <span className="text-green-400 text-base">✓</span>
                  </motion.div>
                  <span className="text-gray-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Technical Stack */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Technical Stack:</h3>
            <div className="space-y-2">
              {evaluation.technicalStack.map((tech, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-lg">{getTechIcon(tech)}</span>
                  <span className="text-gray-300">{tech}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Suggested Agents */}
          {agents && agents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-white mb-3">Suggested Build Team:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {agents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1.0 + index * 0.1,
                      type: 'spring',
                      stiffness: 150,
                    }}
                    className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-all duration-200"
                    style={{
                      boxShadow: `0 0 20px ${agent.color}20`,
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <span className="text-3xl mb-2">{agent.icon}</span>
                      <span className="font-medium text-base mb-1" style={{ color: agent.color }}>
                        {agent.name}
                      </span>
                      <span className="text-xs text-gray-300">{agent.role}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 mt-8"
          >
            {/* Refine Button (Secondary) */}
            <motion.button
              onClick={handleRefine}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold
                bg-slate-700 hover:bg-slate-600 text-white
                border border-slate-600 hover:border-slate-500
                transition-all duration-200
                flex items-center justify-center gap-2"
            >
              <span>✏️</span>
              <span>Refine Prompt</span>
            </motion.button>

            {/* Proceed Button (Primary) */}
            <motion.button
              onClick={handleProceed}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold
                bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400
                text-white shadow-lg shadow-green-500/50
                transition-all duration-200
                flex items-center justify-center gap-2"
            >
              <span>✅</span>
              <span>Looks Good! Continue</span>
              <span>→</span>
            </motion.button>
          </motion.div>

          {/* Info Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-6 pt-6 border-t border-slate-700"
          >
            <p className="text-sm text-gray-300 text-center">
              The agents listed above will collaborate to build your project. You can customize
              their roles in the next step.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
