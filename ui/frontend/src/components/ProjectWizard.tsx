import { useState, useRef } from 'react';

interface ProjectWizardProps {
  onClose: () => void;
  onComplete: (projectId: number) => void;
}

export default function ProjectWizard({ onClose, onComplete }: ProjectWizardProps) {
  const [projectPath, setProjectPath] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Browse for project path using native folder picker
  const handleBrowse = () => {
    folderInputRef.current?.click();
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the path from the first file's webkitRelativePath
      // This gives us "folder/file.txt", we just want "folder"
      const firstFile = files[0];
      const fullPath = (firstFile as any).webkitRelativePath || firstFile.name;

      // Extract just the folder path (everything before the first /)
      const folderName = fullPath.split('/')[0];

      // Get the directory path - use the file's path property if available
      // @ts-ignore - webkitRelativePath might not be in types
      const relativePath = firstFile.webkitRelativePath;
      if (relativePath) {
        // Extract folder path from first file
        const path = relativePath.substring(0, relativePath.lastIndexOf('/'));
        setProjectPath(path || folderName);

        // Auto-suggest name from path
        const suggestedName = folderName;
        if (suggestedName) {
          setName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
        }
      }
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      // Detect frontend URL from package.json
      let frontendUrl = 'http://localhost:3000'; // Default
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
            <p className="text-sm text-slate-400 mt-1">Set up your project for analysis</p>
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
            <p className="text-sm text-slate-400 mt-2">A friendly name to identify your project</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 shrink-0 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectPath.trim() || !name.trim() || loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />
    </div>
  );
}
