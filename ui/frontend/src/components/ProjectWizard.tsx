import { useState } from 'react';
import type { DetectedProject } from '../types';

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function ProjectWizard({ onClose, onComplete }: ProjectWizardProps) {
  const [step, setStep] = useState<'path' | 'prd' | 'configure'>('path');
  const [projectPath, setProjectPath] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('http://localhost:3000');
  const [prdText, setPrdText] = useState('');
  const [prdFilePath, setPrdFilePath] = useState('');
  const [prdSource, setPrdSource] = useState<'text' | 'file'>('text');
  const [detection, setDetection] = useState<DetectedProject | null>(null);
  const [name, setName] = useState('');
  const [targetScore, setTargetScore] = useState(8.5);
  const [maxIterations, setMaxIterations] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNextFromPath = () => {
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }
    setError('');
    setStep('prd');
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/projects/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prd: prdSource === 'text' ? (prdText.trim() || undefined) : undefined,
          prdFilePath: prdSource === 'file' ? (prdFilePath.trim() || undefined) : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze project');
      }

      const data = await res.json();
      setDetection(data);

      // Pre-fill form with detected values
      if (data.suggestedUrl) {
        setFrontendUrl(data.suggestedUrl);
      }

      // Suggest a name from the path
      const pathParts = projectPath.split('/');
      const suggestedName = pathParts[pathParts.length - 1] || 'My Project';
      setName(suggestedName);

      setStep('configure');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          projectPath,
          frontendUrl,
          targetScore,
          maxIterations,
          prd: prdSource === 'text' ? (prdText.trim() || undefined) : undefined,
          prdFilePath: prdSource === 'file' ? (prdFilePath.trim() || undefined) : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header with Step Indicator */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">
              {step === 'path' && 'Project Setup'}
              {step === 'prd' && 'Product Context'}
              {step === 'configure' && 'Configure & Review'}
            </h2>
            <div className="flex gap-2 mt-2">
              <div className={`h-1 w-16 rounded ${step === 'path' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <div className={`h-1 w-16 rounded ${step === 'prd' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <div className={`h-1 w-16 rounded ${step === 'configure' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg shrink-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Project Path */}
        {step === 'path' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Path
                </label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/you/Projects/my-frontend"
                  className="input w-full"
                  autoFocus
                />
                <p className="text-sm text-slate-400 mt-2">
                  Absolute path to your frontend project directory
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Frontend URL
                </label>
                <input
                  type="text"
                  value={frontendUrl}
                  onChange={(e) => setFrontendUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="input w-full"
                />
                <p className="text-sm text-slate-400 mt-2">
                  URL where your dev server runs
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleNextFromPath}
                className="btn-primary"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: PRD / Context */}
        {step === 'prd' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Requirements
                  <span className="text-slate-400 font-normal ml-2 text-xs">(Optional - helps AI understand your vision)</span>
                </label>

                {/* Compact Input Method Selector */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prdSource"
                      checked={prdSource === 'text'}
                      onChange={() => setPrdSource('text')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Type or paste</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prdSource"
                      checked={prdSource === 'file'}
                      onChange={() => setPrdSource('file')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Load from file</span>
                  </label>
                </div>

                {prdSource === 'text' ? (
                  <textarea
                    value={prdText}
                    onChange={(e) => setPrdText(e.target.value)}
                    placeholder="Describe your product vision, target users, design priorities, features, or paste your PRD..."
                    className="input w-full h-48 font-mono text-sm"
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={prdFilePath}
                      onChange={(e) => setPrdFilePath(e.target.value)}
                      placeholder="/path/to/PRD.md"
                      className="input w-full font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">
                      Supports: .md, .txt, .pdf, .docx files
                    </p>
                  </div>
                )}
              </div>

              {(prdText.trim() || prdFilePath.trim()) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    ✓ AI will analyze this to understand product vision and tailor improvements
                  </p>
                </div>
              )}
            </div>

            {/* Fixed Footer with Actions */}
            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between items-center">
              <button
                onClick={() => setStep('path')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Analyzing...' : 'Analyze Project →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 'configure' && detection && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Detection Results */}
              <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-green-400">✓ Project Detected</h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Type:</span>{' '}
                    <span className="capitalize">{detection.projectType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Confidence:</span>{' '}
                    <span>{(detection.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-sm">Components:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detection.detectedComponents.slice(0, 8).map((comp) => (
                      <span key={comp} className="px-2 py-1 bg-slate-800 rounded text-xs">
                        {comp}
                      </span>
                    ))}
                    {detection.detectedComponents.length > 8 && (
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                        +{detection.detectedComponents.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                {detection.focusAreas.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-sm">Focus Areas:</span>
                    <ul className="mt-2 space-y-1 text-sm">
                      {detection.focusAreas.slice(0, 3).map((area, i) => (
                        <li key={i} className="text-slate-300">• {area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Project Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Frontend URL
                  </label>
                  <input
                    type="text"
                    value={frontendUrl}
                    onChange={(e) => setFrontendUrl(e.target.value)}
                    className="input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={targetScore}
                      onChange={(e) => setTargetScore(parseFloat(e.target.value))}
                      className="input w-full"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Quality threshold (0-10)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Iterations
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={maxIterations}
                      onChange={(e) => setMaxIterations(parseInt(e.target.value))}
                      className="input w-full"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Maximum improvement cycles
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between">
              <button
                onClick={() => setStep('prd')}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
