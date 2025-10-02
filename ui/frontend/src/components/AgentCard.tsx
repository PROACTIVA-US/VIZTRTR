import React from 'react';
import { Agent } from '../types/Agent';

interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
  isSelected?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: '✓',
        label: 'Success'
      };
    case 'error':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: '✗',
        label: 'Error'
      };
    case 'running':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: '⟳',
        label: 'Running'
      };
    case 'pending':
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: '⏳',
        label: 'Pending'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: '◯',
        label: 'Unknown'
      };
  }
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, isSelected = false }) => {
  const statusConfig = getStatusConfig(agent.status || 'unknown');
  
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect?.(agent)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900">{agent.name}</h3>
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
          statusConfig.bgColor
        } ${
          statusConfig.textColor
        } ${
          statusConfig.borderColor
        }`}>
          <span className="mr-1" aria-hidden="true">{statusConfig.icon}</span>
          <span>{statusConfig.label}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{agent.description}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Version: {agent.version || '1.0.0'}</span>
        <span>Updated: {agent.lastUpdated || 'Unknown'}</span>
      </div>
    </div>
  );
};