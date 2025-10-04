import { useState } from 'react';

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function ProjectWizard({ onClose, onComplete }: ProjectWizardProps) {
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [name, setName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('http://localhost:3000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detecting, setDetecting] = useState(false);

  // Auto-detect frontend URL from package.json
  const handleDetectUrl = async () => {
    if (!projectPath.trim()) {
      setError('Please enter a project path first');
      return;
    }

    setDetecting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/projects/detect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      if (!res.ok) {
        throw new Error('Could not detect URL');
      }

      const data = await res.json();
      if (data.url) {
        setFrontendUrl(data.url);
      }
    } catch (err) {
      // Silently fail - user can enter manually
      console.log('URL detection failed:', err);
    } finally {
      setDetecting(false);
    }
  };

  // Browse for project path using hidden directory input
  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // @ts-ignore - webkitdirectory is not in TypeScript types but works in modern browsers
    input.webkitdirectory = true;
    // @ts-ignore
    input.directory = true;
    input.multiple = false;

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        // Get the directory path from the first file's path
        const file = target.files[0];
        // Extract directory path by removing the filename
        const fullPath = file.webkitRelativePath || file.name;
        const dirPath = fullPath.split('/')[0];

        // In a web context, we can't get absolute paths for security reasons
        // So we'll prompt the user to paste the absolute path
        const userPath = prompt(
          `Selected: ${dirPath}\n\nPlease paste the absolute path to this directory:`,
          ''
        );

        if (userPath && userPath.trim()) {
          setProjectPath(userPath.trim());

          // Auto-suggest name from path
          if (!name && userPath.trim()) {
            const parts = userPath.trim().split('/');
            const suggestedName = parts[parts.length - 1] || '';
            if (suggestedName) {
              setName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
            }
          }

          // Auto-detect URL
          handleDetectUrl();
        }
      }
    };

    input.click();
  };

  const handleNext = () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }
    if (!frontendUrl.trim()) {
      setError('Please enter a frontend URL');
      return;
    }

    setError('');
    setStep('confirm');
  };

  const handleCreate = async () => {
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
          targetScore: 8.5, // Default
          maxIterations: 5, // Default
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      // Project created successfully - close wizard
      onComplete();
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
            <h2 className="text-2xl font-bold">
              {step === 'setup' && 'Project Setup'}
              {step === 'confirm' && 'Confirm Project'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {step === 'setup' && 'Enter your project details'}
              {step === 'confirm' && 'Review and create your project'}
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

        {/* Step 1: Project Setup */}
        {step === 'setup' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
                  autoFocus
                />
                <p className="text-sm text-slate-400 mt-2">
                  A friendly name to identify your project
                </p>
              </div>

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
                    onBlur={handleDetectUrl} // Auto-detect URL when path is entered
                    placeholder="/Users/you/Projects/my-frontend"
                    className="input flex-1"
                  />
                  <button onClick={handleBrowse} className="btn-secondary whitespace-nowrap">
                    Browse...
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Absolute path to your frontend project directory
                </p>
              </div>

              {/* Frontend URL */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Frontend URL <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frontendUrl}
                    onChange={e => setFrontendUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="input flex-1"
                  />
                  <button
                    onClick={handleDetectUrl}
                    disabled={detecting || !projectPath}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {detecting ? 'Detecting...' : 'Auto-detect'}
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  URL where your dev server runs. We'll try to auto-detect from package.json.
                </p>
              </div>

              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>💡 Tip:</strong> Make sure your dev server is running at the URL you
                  specify before starting analysis.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleNext} className="btn-primary">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 'confirm' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="bg-slate-900 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-green-400">Create Project "{name}"?</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Path:</span>
                    <span className="font-mono text-xs">{projectPath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">URL:</span>
                    <span className="font-mono text-xs">{frontendUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Score:</span>
                    <span>8.5/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Iterations:</span>
                    <span>5 cycles</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  Your project will be saved and ready for analysis. You can configure advanced
                  settings and add a PRD later from the project page.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between">
              <button onClick={() => setStep('setup')} disabled={loading} className="btn-secondary">
                ← Back
              </button>
              <button onClick={handleCreate} disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : `Create Project "${name}"`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
