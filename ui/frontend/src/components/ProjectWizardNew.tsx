import { useState } from 'react';
import { API_ENDPOINTS, apiUrl } from '../config/api';

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: (projectId: string) => void;
}

export default function ProjectWizardNew({ onClose, onComplete }: ProjectWizardProps) {
  const [step, setStep] = useState<'basic' | 'analysis' | 'review' | 'complete'>('basic');

  // Project data
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [frontendUrl, setFrontendUrl] = useState(''); // No default to avoid port conflicts
  const [targetScore, setTargetScore] = useState(8.5);
  const [maxIterations, setMaxIterations] = useState(5);

  // Analysis data
  const [userPRD, setUserPRD] = useState('');
  const [synthesizedPRD, setSynthesizedPRD] = useState('');
  const [projectType, setProjectType] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [components, setComponents] = useState<any[]>([]);
  const [suggestedAgents, setSuggestedAgents] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Step 1: Create project immediately
   */
  const handleCreateProject = async () => {
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(API_ENDPOINTS.projects, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          projectPath,
          frontendUrl,
          targetScore,
          maxIterations,
          status: 'created',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await res.json();
      setProjectId(project.id);

      console.log('✅ Project created:', project.id);
      setStep('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Analyze with AI
   */
  const handleAnalyze = async () => {
    setLoading(true);
    setError('');

    try {
      // Update project status
      await fetch(apiUrl(`/api/projects/${projectId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'analyzing' }),
      });

      // Run AI analysis with timeout (2 minutes max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const res = await fetch(API_ENDPOINTS.analyze, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            userProvidedPRD: userPRD.trim() || undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Analysis failed');
        }

        const analysis = await res.json();

        // Update state
        setSynthesizedPRD(analysis.synthesizedPRD);
        setProjectType(analysis.projectType);
        setConfidence(analysis.confidence);
        setComponents(analysis.components || []);
        setSuggestedAgents(analysis.suggestedAgents || []);

        console.log('✅ Analysis complete:', analysis.projectType);
        setStep('review');
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('Analysis timed out after 2 minutes. Please try again.');
        }
        throw fetchErr;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');

      // Revert status on error to prevent stuck "analyzing" state
      try {
        await fetch(apiUrl(`/api/projects/${projectId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'created' }),
        });
      } catch (revertErr) {
        console.error('Failed to revert status:', revertErr);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Save reviewed PRD and complete
   */
  const handleSavePRD = async () => {
    setLoading(true);
    setError('');

    try {
      // Save PRD and mark as analyzed
      const res = await fetch(apiUrl(`/api/projects/${projectId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synthesizedPRD,
          projectType,
          analysisConfidence: confidence,
          hasProductSpec: true,
          status: 'analyzed',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save PRD');
      }

      console.log('✅ PRD saved');
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Skip analysis (manual configuration)
   */
  const handleSkipAnalysis = async () => {
    try {
      await fetch(apiUrl(`/api/projects/${projectId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });

      onComplete(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">
              {step === 'basic' && 'Create New Project'}
              {step === 'analysis' && 'AI Analysis'}
              {step === 'review' && 'Review & Edit PRD'}
              {step === 'complete' && 'Project Ready!'}
            </h2>
            <div className="flex gap-2 mt-2">
              <div
                className={`h-1 w-20 rounded ${step === 'basic' ? 'bg-blue-500' : 'bg-slate-600'}`}
              />
              <div
                className={`h-1 w-20 rounded ${step === 'analysis' ? 'bg-blue-500' : 'bg-slate-600'}`}
              />
              <div
                className={`h-1 w-20 rounded ${step === 'review' ? 'bg-blue-500' : 'bg-slate-600'}`}
              />
              <div
                className={`h-1 w-20 rounded ${step === 'complete' ? 'bg-blue-500' : 'bg-slate-600'}`}
              />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg shrink-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 'basic' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="input w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Path *</label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={e => setProjectPath(e.target.value)}
                  placeholder="/Users/you/Projects/my-frontend"
                  className="input w-full font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Absolute path to your frontend project directory
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Frontend URL *</label>
                <input
                  type="text"
                  value={frontendUrl}
                  onChange={e => setFrontendUrl(e.target.value)}
                  placeholder="http://localhost:5173"
                  className="input w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  URL where your dev server runs (e.g., 5173 for Vite, 3001 for Next.js)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Score</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={targetScore}
                    onChange={e => setTargetScore(parseFloat(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Iterations</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxIterations}
                    onChange={e => setMaxIterations(parseInt(e.target.value))}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateProject} disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Project →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Analysis */}
        {step === 'analysis' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-sm text-green-300">
                  ✓ Project "{name}" created successfully (ID: {projectId.slice(0, 12)}...)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Requirements (Optional)
                </label>
                <textarea
                  value={userPRD}
                  onChange={e => setUserPRD(e.target.value)}
                  placeholder="Describe your product vision, target users, key features, design priorities...

Or leave empty for AI to infer from codebase."
                  className="input w-full h-48 font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  AI will analyze your project structure and synthesize a comprehensive PRD
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between">
              <button onClick={handleSkipAnalysis} className="btn-secondary">
                Skip Analysis
              </button>
              <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
                {loading ? 'Analyzing...' : 'Analyze with AI →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review PRD */}
        {step === 'review' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-green-400">✓ Analysis Complete</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Project Type:</span>{' '}
                    <span className="text-white">{projectType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Confidence:</span>{' '}
                    <span>{(confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {components.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-sm">
                      Components ({components.length}):
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {components.slice(0, 10).map((comp, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-800 rounded text-xs">
                          {comp.name} <span className="text-slate-500">({comp.uiContext})</span>
                        </span>
                      ))}
                      {components.length > 10 && (
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                          +{components.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {suggestedAgents.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-sm">Suggested Agents:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestedAgents.map((agent, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-sm text-blue-300"
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Synthesized PRD
                  <span className="text-slate-400 font-normal ml-2 text-xs">
                    (Review and edit as needed)
                  </span>
                </label>
                <textarea
                  value={synthesizedPRD}
                  onChange={e => setSynthesizedPRD(e.target.value)}
                  className="input w-full h-64 font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  This PRD will guide all future UI improvements. Edit to refine AI's understanding.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between">
              <button onClick={() => setStep('analysis')} className="btn-secondary">
                ← Re-analyze
              </button>
              <button onClick={handleSavePRD} disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : 'Save & Complete →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Project Ready!</h3>
                <p className="text-slate-300">
                  "{name}" has been configured and is ready for UI analysis
                </p>
              </div>

              <div className="bg-slate-900 rounded-lg p-4 text-left w-full max-w-md space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Project Type:</span>
                  <span>{projectType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agents:</span>
                  <span>{suggestedAgents.length} configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Components:</span>
                  <span>{components.length} detected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-green-400">Analyzed</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-center">
              <button onClick={() => onComplete(projectId)} className="btn-primary px-8">
                Go to Project →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
