import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Run } from '../types';
import { IterationReview } from '../components/IterationReview';

export default function RunPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [startingServer, setStartingServer] = useState(false);
  const [_serverStatus, setServerStatus] = useState<{ running: boolean; url?: string } | null>(
    null
  );
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [beforeScreenshot, setBeforeScreenshot] = useState<string>('');
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

    // SSE for real-time approval events
    const eventSource = new EventSource(`http://localhost:3001/api/runs/${runId}/stream`);

    eventSource.addEventListener('approval_required', ((event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setPendingApproval(data);

      // Fetch before screenshot for the current iteration
      const iterationNum = data.iteration || 0;
      setBeforeScreenshot(`http://localhost:3001/outputs/${runId}/iteration_${iterationNum}/before.png`);
    }) as EventListener);

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
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

  const handleRetry = async () => {
    if (!runId) return;
    setRetrying(true);
    try {
      const res = await fetch(`http://localhost:3001/api/projects/runs/${runId}/retry`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to retry run');
      }
      const newRun = await res.json();
      // Navigate to the new run
      navigate(`/runs/${newRun.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry run');
    } finally {
      setRetrying(false);
    }
  };

  const handleViewResults = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/runs/${runId}/result`);
      if (!res.ok) {
        throw new Error('Failed to load results');
      }
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load results');
    }
  };

  const handleStartServer = async () => {
    if (!run?.projectId) return;
    setStartingServer(true);
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${run.projectId}/server/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start server');
      }

      const data = await res.json();
      setServerStatus({ running: true, url: data.url });
      alert(`Server started successfully at ${data.url}. You can now retry the run.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start server');
    } finally {
      setStartingServer(false);
    }
  };

  const handleApprove = async (feedback?: string) => {
    if (!runId || !pendingApproval) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/runs/${runId}/iterations/${pendingApproval.iteration}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', feedback }),
        }
      );
      if (!res.ok) throw new Error('Failed to approve');
      setPendingApproval(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (reason: string) => {
    if (!runId || !pendingApproval) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/runs/${runId}/iterations/${pendingApproval.iteration}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', reason }),
        }
      );
      if (!res.ok) throw new Error('Failed to reject');
      setPendingApproval(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleSkip = async () => {
    if (!runId || !pendingApproval) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/runs/${runId}/iterations/${pendingApproval.iteration}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'skip' }),
        }
      );
      if (!res.ok) throw new Error('Failed to skip');
      setPendingApproval(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to skip');
    }
  };

  const handleModify = async (modifiedRecommendations: any[]) => {
    if (!runId || !pendingApproval) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/runs/${runId}/iterations/${pendingApproval.iteration}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'modify', modifiedRecommendations }),
        }
      );
      if (!res.ok) throw new Error('Failed to modify');
      setPendingApproval(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to modify');
    }
  };

  const isConnectionError =
    run?.error?.includes('ERR_CONNECTION_REFUSED') ||
    run?.error?.includes('Failed to fetch') ||
    run?.error?.includes('ECONNREFUSED');

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

      {/* Status Header - Compact for Failed */}
      {run.status === 'failed' ? (
        <div className="card bg-red-500/10 border-red-500 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">❌</div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">Run Failed</h1>
                <p className="text-sm text-slate-400 mb-3">Run ID: {run.id}</p>
                {run.error && (
                  <div className="p-3 bg-slate-900/50 rounded text-sm text-slate-300 mb-4">
                    <span className="font-semibold text-red-400">Error: </span>
                    {run.error}
                  </div>
                )}
                {isConnectionError && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300 mb-4">
                    <p className="font-semibold mb-2">🔌 Connection Error Detected</p>
                    <p className="text-xs text-slate-400">
                      {run.projectId
                        ? "The project's frontend server is not running. Start it below to continue."
                        : 'This run is missing a project association. Create a new run from the Projects page to use the auto-start feature.'}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  {isConnectionError && run.projectId && (
                    <button
                      onClick={handleStartServer}
                      disabled={startingServer}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {startingServer ? '⏳ Starting Server...' : '▶️ Start Project Server'}
                    </button>
                  )}
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {retrying ? 'Retrying...' : '🔄 Retry Run'}
                  </button>
                  <button
                    onClick={() => navigate('/projects')}
                    className="bg-slate-700 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-600 transition-all text-sm"
                  >
                    Back to Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-3 border-t border-slate-700">
            Started: {new Date(run.startedAt).toLocaleString()} • Failed:{' '}
            {run.completedAt && new Date(run.completedAt).toLocaleString()}
          </div>
        </div>
      ) : (
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
              <span>
                Iteration {run.currentIteration + 1} of {run.maxIterations}
              </span>
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
        </div>
      )}

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
      {run.status === 'completed' && !showResults && (
        <div className="card bg-green-500/10 border-green-500">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-semibold mb-2">Run Completed!</h2>
            <p className="text-slate-400 mb-6">Your UI improvements are ready to review.</p>
            <button
              onClick={handleViewResults}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {showResults && results && (
        <div className="space-y-4">
          <div className="card bg-green-500/10 border-green-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">📊 Run Results</h2>
                <p className="text-sm text-slate-400">
                  Final score:{' '}
                  <span className="text-green-400 font-bold text-lg">
                    {results.finalScore?.toFixed(1) || 'N/A'}/10
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {results.iterations && results.iterations.length > 0 && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-300">
                  Iterations ({results.iterations.length})
                </h3>
                {results.iterations.map((iter: any, idx: number) => (
                  <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-semibold text-lg">Iteration {idx + 1}</span>
                      <span className="text-sm px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                        Score: {iter.evaluation?.compositeScore?.toFixed(1) || 'N/A'}
                      </span>
                    </div>

                    {iter.designSpec?.recommendation && (
                      <div className="mb-3 p-3 bg-slate-900/50 rounded">
                        <p className="text-sm font-semibold text-slate-300 mb-1">Recommendation:</p>
                        <p className="text-sm text-slate-400">{iter.designSpec.recommendation}</p>
                      </div>
                    )}

                    {/* Before/After Screenshots */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-2 font-semibold">Before</p>
                        <img
                          src={`http://localhost:3001/outputs/${runId}/iteration_${idx}/before.png`}
                          alt={`Iteration ${idx} - Before`}
                          className="w-full rounded border border-slate-600 hover:scale-105 transition-transform cursor-pointer"
                          onClick={e => window.open((e.target as HTMLImageElement).src, '_blank')}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-2 font-semibold">After</p>
                        <img
                          src={`http://localhost:3001/outputs/${runId}/iteration_${idx}/after.png`}
                          alt={`Iteration ${idx} - After`}
                          className="w-full rounded border border-slate-600 hover:scale-105 transition-transform cursor-pointer"
                          onClick={e => window.open((e.target as HTMLImageElement).src, '_blank')}
                        />
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {iter.evaluation?.scores && (
                      <details className="mt-3">
                        <summary className="text-xs cursor-pointer text-slate-400 hover:text-white">
                          View Score Breakdown
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(iter.evaluation.scores).map(
                            ([key, value]: [string, any]) => (
                              <div
                                key={key}
                                className="flex justify-between bg-slate-900/30 p-2 rounded"
                              >
                                <span className="text-slate-400">{key}:</span>
                                <span className="text-slate-200 font-semibold">
                                  {value.toFixed(1)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            <details className="text-sm mt-6 pt-4 border-t border-slate-700">
              <summary className="cursor-pointer text-slate-400 hover:text-white">
                View Full JSON
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {pendingApproval && runId && (
        <IterationReview
          runId={runId}
          iterationId={pendingApproval.iteration}
          beforeScreenshot={beforeScreenshot}
          recommendations={pendingApproval.recommendations || []}
          risk={pendingApproval.risk || 'medium'}
          estimatedCost={pendingApproval.estimatedCost || 0}
          onApprove={handleApprove}
          onReject={handleReject}
          onModify={handleModify}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
