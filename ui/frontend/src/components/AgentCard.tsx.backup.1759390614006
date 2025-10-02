import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Agent } from '../store/buildStore';

interface AgentCardProps {
  agent: Agent;
  onEdit?: (updates: Partial<Agent>) => void;
}

const statusColors = {
  idle: '#6b7280',
  active: '#10b981',
  completed: '#22c55e',
  error: '#ef4444',
};

export function AgentCard({ agent }: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = agent.color;
  const icon = agent.icon;
  const statusColor = statusColors[agent.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="relative bg-slate-800 rounded-lg overflow-hidden cursor-pointer"
      style={{
        boxShadow:
          agent.status === 'active'
            ? `0 0 20px ${color}40, 0 4px 6px -1px rgb(0 0 0 / 0.1)`
            : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Colored top border */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: color }}
      />

      {/* Card content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon with pulse animation when active */}
            <motion.div
              className="text-3xl"
              animate={
                agent.status === 'active'
                  ? {
                      scale: [1, 1.1, 1],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: agent.status === 'active' ? Infinity : 0,
              }}
            >
              {icon}
            </motion.div>

            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {agent.name}
              </h3>
              <p className="text-xs text-slate-400">
                {agent.role}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <motion.div
            className="flex items-center gap-2"
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
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="text-xs text-slate-400 capitalize">
              {agent.status}
            </span>
          </motion.div>
        </div>

        {/* Responsibilities */}
        <div className="space-y-1.5">
          {agent.responsibilities.slice(0, isExpanded ? undefined : 3).map((task, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-sm text-slate-400"
            >
              <span
                className="mt-1"
                style={{ color }}
              >
                •
              </span>
              <span>{task}</span>
            </div>
          ))}
        </div>

        {/* Expand/collapse indicator */}
        {agent.responsibilities.length > 3 && (
          <motion.div
            className="mt-3 text-center text-xs text-slate-500"
            animate={{ opacity: isExpanded ? 0.5 : 1 }}
          >
            {isExpanded ? '▲ Click to collapse' : `▼ ${agent.responsibilities.length - 3} more...`}
          </motion.div>
        )}


        {/* Completed checkmark */}
        {agent.status === 'completed' && (
          <motion.div
            className="mt-3 flex items-center justify-center gap-2 text-green-400 text-sm font-medium"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Completed</span>
          </motion.div>
        )}
      </div>

      {/* Active glow effect */}
      {agent.status === 'active' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}10, transparent 70%)`,
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
}
