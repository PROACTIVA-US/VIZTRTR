/**
 * IterationReview Component
 *
 * Human-in-the-loop approval interface for reviewing iteration changes.
 * Displays before/after screenshots, score comparison, code diffs, and approval controls.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, Edit3, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface Recommendation {
  dimension: string;
  title: string;
  description: string;
  impact: number;
  effort: number;
}

interface ScoreComparison {
  dimension: string;
  before: number;
  after: number;
  delta: number;
}

interface CodeDiff {
  file: string;
  oldContent: string;
  newContent: string;
  diff: string;
}

interface IterationReviewProps {
  runId: string;
  iterationId: number;
  beforeScreenshot: string; // base64 or URL
  afterScreenshot?: string; // base64 or URL (optional if not yet generated)
  recommendations: Recommendation[];
  scoreComparison?: ScoreComparison[];
  codeDiffs?: CodeDiff[];
  risk: 'low' | 'medium' | 'high';
  estimatedCost: number; // cents
  onApprove: (feedback?: string) => void;
  onReject: (reason: string) => void;
  onModify: (modifiedRecommendations: Recommendation[]) => void;
  onSkip: () => void;
}

export const IterationReview: React.FC<IterationReviewProps> = ({
  runId,
  iterationId,
  beforeScreenshot,
  afterScreenshot,
  recommendations,
  scoreComparison,
  codeDiffs,
  risk,
  estimatedCost,
  onApprove,
  onReject,
  onModify,
  onSkip,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'screenshots' | 'diffs'>('overview');
  const [feedback, setFeedback] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [modifiedRecs, setModifiedRecs] = useState<Recommendation[]>(recommendations);

  const riskColors = {
    low: 'text-green-400 bg-green-900/20 border-green-800/50',
    medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
    high: 'text-red-400 bg-red-900/20 border-red-800/50',
  };

  const riskIcons = {
    low: CheckCircle,
    medium: AlertTriangle,
    high: XCircle,
  };

  const RiskIcon = riskIcons[risk];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-7xl w-full border border-slate-700 my-8">
        {/* Header */}
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Iteration {iterationId + 1} Review
              </h2>
              <p className="text-slate-400">Run ID: {runId}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${riskColors[risk]}`}>
                <RiskIcon className="w-4 h-4 inline mr-1.5" />
                {risk.toUpperCase()} RISK
              </div>
              <div className="text-sm text-slate-400">
                Est. Cost: <span className="text-white font-medium">${(estimatedCost / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'screenshots'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Screenshots
            </button>
            {codeDiffs && codeDiffs.length > 0 && (
              <button
                onClick={() => setActiveTab('diffs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'diffs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Code Changes ({codeDiffs.length})
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Recommendations ({recommendations.length})
                </h3>
                <div className="space-y-3">
                  {modifiedRecs.map((rec, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                              {rec.dimension}
                            </span>
                            <h4 className="text-white font-medium">{rec.title}</h4>
                          </div>
                          <p className="text-sm text-slate-400">{rec.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-slate-500">Impact/Effort</div>
                          <div className="text-white font-medium">
                            {rec.impact}/10 · {rec.effort}/10
                          </div>
                          <div className="text-xs text-green-400">
                            ROI: {(rec.impact / rec.effort).toFixed(1)}:1
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Comparison */}
              {scoreComparison && scoreComparison.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Score Comparison</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {scoreComparison.map((score, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <div className="text-sm text-slate-400 mb-1">{score.dimension}</div>
                        <div className="flex items-center justify-between">
                          <div className="text-white font-medium">
                            {score.before.toFixed(1)} → {score.after.toFixed(1)}
                          </div>
                          <div className={`flex items-center text-sm font-medium ${
                            score.delta > 0 ? 'text-green-400' : score.delta < 0 ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {score.delta > 0 ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : score.delta < 0 ? (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            ) : null}
                            {score.delta > 0 ? '+' : ''}{score.delta.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Screenshots Tab */}
          {activeTab === 'screenshots' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Before</h3>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-2">
                    <img
                      src={beforeScreenshot}
                      alt="Before"
                      className="w-full rounded"
                    />
                  </div>
                </div>
                {afterScreenshot && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">After (Preview)</h3>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-2">
                      <img
                        src={afterScreenshot}
                        alt="After"
                        className="w-full rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Diffs Tab */}
          {activeTab === 'diffs' && codeDiffs && (
            <div className="space-y-4">
              {codeDiffs.map((diff, idx) => (
                <div key={idx} className="bg-slate-900 rounded-lg border border-slate-700">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <h4 className="text-white font-medium font-mono text-sm">{diff.file}</h4>
                  </div>
                  <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto">
                    {diff.diff}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-700 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add any comments or feedback about these changes..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Skip Iteration
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => onApprove(feedback || undefined)}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve & Continue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Rejection</h3>
            <p className="text-slate-300 mb-4">
              Are you sure you want to reject these changes? This will end the iteration cycle.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 mb-4 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject(rejectReason || 'No reason provided');
                  setShowRejectModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IterationReview;
