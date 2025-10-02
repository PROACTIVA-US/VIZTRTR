import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Run } from '../types';

export default function RunPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!runId) return;

    const loadRun = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/runs/${runId}`);
        if (!res.ok) {
          throw new Error('Failed to load run');
        }
        const data = await res.json();
        setRun(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load run');
      } finally {
        setLoading(false);
      }
    };

    loadRun();

    // Poll for updates every 2 seconds
    const interval = setInterval(loadRun, 2000);

    return () => clearInterval(interval);
  }, [runId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Loading run...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card bg-red-500/10 border-red-500">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-slate-400 mb-6">{error || 'Run not found'}</p>
            <button onClick={() => navigate('/projects')} className="btn-secondary">
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '▶️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏸️';
    }
  };

  const progress = (run.currentIteration / run.maxIterations) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Projects
        </button>
      </div>

      {/* Status Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{getStatusIcon(run.status)}</div>
            <div>
              <h1 className="text-2xl font-bold capitalize">{run.status}</h1>
              <p className="text-sm text-slate-400">Run ID: {run.id}</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full ${getStatusColor(run.status)} bg-opacity-20`}>
            <span className="font-semibold capitalize">{run.status}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Iteration {run.currentIteration} of {run.maxIterations}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${getStatusColor(run.status)} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Started:</span>{' '}
            <span>{new Date(run.startedAt).toLocaleString()}</span>
          </div>
          {run.completedAt && (
            <div>
              <span className="text-slate-400">Completed:</span>{' '}
              <span>{new Date(run.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {run.error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-sm font-semibold mb-1">Error:</p>
            <p className="text-sm text-slate-300">{run.error}</p>
          </div>
        )}
      </div>

      {/* Live Updates */}
      {run.status === 'running' && (
        <div className="card bg-blue-500/10 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="animate-pulse text-2xl">⚡</div>
            <div>
              <p className="font-semibold">Live Processing</p>
              <p className="text-sm text-slate-400">
                VIZTRTR is analyzing and improving your UI...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {run.status === 'completed' && (
        <div className="card bg-green-500/10 border-green-500">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-semibold mb-2">Run Completed!</h2>
            <p className="text-slate-400 mb-6">
              Your UI improvements are ready to review.
            </p>
            <button className="btn-primary">
              View Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
