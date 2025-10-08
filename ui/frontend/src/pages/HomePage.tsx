import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Zap, GitBranch, Activity } from 'lucide-react';

const HomePage: React.FC = () => {
  const metrics = [
    { label: 'Active Projects', value: 3, icon: GitBranch },
    { label: 'Total Builds', value: 0, icon: Zap },
    { label: 'Success Rate', value: 0, icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to VIZTRTR</h1>
          <p className="text-lg text-gray-600 mb-8">
            Build, test, and deploy AI agents with confidence
          </p>
          <Link
            to="/projects/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Project
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const isZero = metric.value === 0;
            return (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-sm p-6 transition-all ${
                  isZero ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isZero ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {metric.label}
                    </p>
                    <p
                      className={`text-3xl font-bold mt-2 ${
                        isZero ? 'text-gray-300' : 'text-gray-900'
                      }`}
                    >
                      {metric.value}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${isZero ? 'text-gray-300' : 'text-blue-600'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/projects"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <GitBranch className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">View Projects</h3>
                <p className="text-sm text-gray-600">Manage your AI agent projects</p>
              </div>
            </Link>
            <Link
              to="/builder"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Zap className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Agent Builder</h3>
                <p className="text-sm text-gray-600">Create and configure agents</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
