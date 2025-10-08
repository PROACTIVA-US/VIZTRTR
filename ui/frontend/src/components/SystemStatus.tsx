/**
 * System Status Indicator
 * Monitors VIZTRTR backend health and displays status with interactive controls
 */

import { useState, useEffect } from 'react';

interface SystemStatusData {
  backend: {
    status: 'online' | 'offline' | 'error';
    uptime?: number;
    message?: string;
  };
}

export default function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData>({
    backend: { status: 'offline' },
  });
  const [isRestarting, setIsRestarting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Poll backend health every 10 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch('http://localhost:3001/health', {
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          setStatus({
            backend: {
              status: 'online',
              uptime: data.uptime,
              message: data.message,
            },
          });
        } else {
          setStatus({
            backend: {
              status: 'error',
              message: 'Backend returned error status',
            },
          });
        }
      } catch (error) {
        setStatus({
          backend: {
            status: 'offline',
            message: error instanceof Error ? error.message : 'Connection failed',
          },
        });
      }
    };

    // Initial check
    checkHealth();

    // Poll every 10 seconds
    const interval = setInterval(checkHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
    setIsRestarting(true);
    const isOffline = status.backend.status === 'offline';
    try {
      const endpoint = isOffline ? 'start' : 'restart';

      // Call manager server (port 3002) to start/restart backend
      const res = await fetch(`http://localhost:3002/api/server/${endpoint}`, {
        method: 'POST',
      });

      if (res.ok) {
        const result = await res.json();

        if (result.success) {
          // Server is starting/restarting
          setStatus({
            backend: {
              status: 'offline',
              message: isOffline
                ? 'Server is starting... Please wait.'
                : 'Server is restarting... Please wait.',
            },
          });

          // Poll for server to come back online
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds
          const pollInterval = setInterval(async () => {
            attempts++;

            try {
              const healthRes = await fetch('http://localhost:3001/health', {
                signal: AbortSignal.timeout(2000),
              });

              if (healthRes.ok) {
                clearInterval(pollInterval);
                setIsRestarting(false);
                setShowDetails(false);
                // Health check will update status
              }
            } catch (e) {
              // Still starting/restarting
            }

            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setIsRestarting(false);
              setStatus({
                backend: {
                  status: 'error',
                  message: 'Timeout waiting for server. Check manager logs.',
                },
              });
            }
          }, 1000);
        } else {
          throw new Error(result.message || 'Failed to start/restart server');
        }
      } else {
        throw new Error('Manager server not responding. Is it running?');
      }
    } catch (error) {
      console.error('Restart failed:', error);
      setStatus({
        backend: {
          status: 'error',
          message:
            error instanceof Error ? error.message : isOffline ? 'Start failed' : 'Restart failed',
        },
      });
      setIsRestarting(false);
    }
  };

  const getStatusColor = () => {
    switch (status.backend.status) {
      case 'online':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'offline':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'error':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    }
  };

  const getStatusIcon = () => {
    switch (status.backend.status) {
      case 'online':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="6" className="animate-pulse" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="6" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <path d="M6 0L0 6l6 6 6-6z" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (status.backend.status) {
      case 'online':
        return 'System Online';
      case 'offline':
        return 'System Offline';
      case 'error':
        return 'System Error';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${getStatusColor()} hover:opacity-80`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {status.backend.status === 'online' && status.backend.uptime && (
          <span className="text-xs opacity-70">({formatUptime(status.backend.uptime)})</span>
        )}
      </button>

      {/* Status Details Dropdown */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />

          {/* Details Panel */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">System Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Backend Status */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Backend API</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span
                    className={
                      status.backend.status === 'online' ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {status.backend.status}
                  </span>
                </div>
              </div>

              {status.backend.status === 'online' && status.backend.uptime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-slate-300">{formatUptime(status.backend.uptime)}</span>
                </div>
              )}

              {status.backend.message && (
                <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-900 rounded">
                  {status.backend.message}
                </div>
              )}
            </div>

            {/* Actions */}
            {status.backend.status !== 'online' && (
              <div className="pt-3 border-t border-slate-700">
                <button
                  onClick={handleRestart}
                  disabled={isRestarting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRestarting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {status.backend.status === 'offline' ? 'Starting...' : 'Restarting...'}
                    </span>
                  ) : status.backend.status === 'offline' ? (
                    'Start Backend'
                  ) : (
                    'Restart Backend'
                  )}
                </button>
              </div>
            )}

            {/* Endpoint Info */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-500">
                <div className="flex items-center justify-between mb-1">
                  <span>API Endpoint</span>
                  <code className="text-slate-400">localhost:3001</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Frontend</span>
                  <code className="text-slate-400">localhost:5173</code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
