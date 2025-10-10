import { useState } from 'react';
import FolderBrowser from './FolderBrowser';

type VisionProvider = 'anthropic' | 'google' | 'openai';

interface ModelSettings {
  vision: { provider: VisionProvider; model: string };
}

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: (projectId: number) => void;
}

export default function ProjectWizard({ onClose, onComplete }: ProjectWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [projectPath, setProjectPath] = useState('');
  const [name, setName] = useState('');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    vision: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);

  const visionModelsByProvider: Record<VisionProvider, string[]> = {
    anthropic: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'],
    google: ['gemini-2.0-flash-exp', 'gemini-2.0-flash-thinking-exp'],
    openai: ['gpt-4o', 'gpt-4o-mini'],
  };

  const handleProviderChange = (provider: VisionProvider) => {
    const firstModel = visionModelsByProvider[provider][0];
    setModelSettings({
      vision: { provider, model: firstModel },
    });
  };

  const handleModelChange = (model: string) => {
    setModelSettings(prev => ({
      vision: { ...prev.vision, model },
    }));
  };

  // Browse for project path
  const handleBrowse = () => {
    setShowBrowser(true);
  };

  const handleSelectFolder = (path: string) => {
    setProjectPath(path);
    setShowBrowser(false);

    // Auto-suggest name from path
    const parts = path.split('/');
    const suggestedName = parts[parts.length - 1] || '';
    if (suggestedName) {
      setName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      // Detect frontend URL from package.json
      let frontendUrl = ''; // No default to avoid port conflicts
      try {
        const detectRes = await fetch('http://localhost:3001/api/projects/detect-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath }),
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          if (detectData.url) {
            frontendUrl = detectData.url;
          }
        }
      } catch (err) {
        // Silently use default
        console.log('URL detection failed, using default:', err);
      }

      // Create project
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          projectPath,
          frontendUrl,
          targetScore: 8.5,
          maxIterations: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await res.json();

      // Save model settings to localStorage
      localStorage.setItem(
        `viztrtr_project_${project.id}_model_settings`,
        JSON.stringify(modelSettings)
      );

      // Project created successfully - navigate to it
      onComplete(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Create Project</h2>
            <p className="text-sm text-slate-400 mt-1">
              {step === 1 ? 'Step 1: Project Details' : 'Step 2: Model Configuration'}
            </p>
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

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Project Path */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Path <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath}
                    onChange={e => {
                      setProjectPath(e.target.value);
                      // Auto-suggest name from path
                      if (!name && e.target.value) {
                        const parts = e.target.value.split('/');
                        const suggestedName = parts[parts.length - 1] || '';
                        if (suggestedName) {
                          setName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
                        }
                      }
                    }}
                    placeholder="/Users/you/Projects/my-frontend"
                    className="input flex-1"
                    autoFocus
                  />
                  <button onClick={handleBrowse} className="btn-secondary whitespace-nowrap">
                    Browse...
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Absolute path to your frontend project directory
                </p>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="input w-full"
                />
                <p className="text-sm text-slate-400 mt-2">
                  A friendly name to identify your project
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Model Configuration - Step 2 */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">🤖 AI Configuration</h3>
                <p className="text-sm text-slate-300">
                  Choose the vision model for analyzing your UI. Implementation uses our proven
                  hybrid approach automatically.
                </p>
              </div>

              {/* Vision Model */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Vision Model
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (Analyzes UI screenshots & PRD)
                  </span>
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Provider</label>
                    <select
                      value={modelSettings.vision.provider}
                      onChange={e => handleProviderChange(e.target.value as VisionProvider)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="google">Google (Gemini)</option>
                      <option value="openai">OpenAI (GPT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Model ({modelSettings.vision.provider})
                    </label>
                    <select
                      value={modelSettings.vision.model}
                      onChange={e => handleModelChange(e.target.value)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                    >
                      {visionModelsByProvider[modelSettings.vision.provider].map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hybrid Implementation Info */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  ⚡ Automatic Implementation Strategy
                </h3>
                <div className="text-sm text-slate-300 space-y-2">
                  <div>
                    <strong className="text-blue-400">Phase 1: Visual Design</strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Constrained tools make surgical edits (layout, spacing, colors, typography)
                    </p>
                  </div>
                  <div>
                    <strong className="text-purple-400">Phase 2: UX Validation</strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Browser automation tests accessibility, keyboard nav, and WCAG compliance
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Selection Tips */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Vision Model Guide</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>
                    • <strong>Claude Opus 4:</strong> Best quality, most accurate (recommended)
                  </li>
                  <li>
                    • <strong>Gemini 2.0 Flash:</strong> 97% cheaper, good for testing
                  </li>
                  <li>
                    • <strong>GPT-4o:</strong> Fast, balanced quality/cost
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between gap-3">
          <div>
            {step === 2 && (
              <button onClick={() => setStep(1)} disabled={loading} className="btn-secondary">
                ← Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="btn-secondary">
              Cancel
            </button>
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!projectPath.trim() || !name.trim()}
                className="btn-primary"
              >
                Next: Choose Models →
              </button>
            ) : (
              <button onClick={handleCreate} disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Folder Browser Modal */}
      {showBrowser && (
        <FolderBrowser onSelect={handleSelectFolder} onClose={() => setShowBrowser(false)} />
      )}
    </div>
  );
}
