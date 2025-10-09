import { useState, useEffect, useCallback } from 'react';

interface FileBrowserProps {
  onSelect: (path: string) => void;
  onClose: () => void;
  fileFilter?: string; // e.g., 'pdf,docx,md,txt'
  initialPath?: string; // Initial directory to start browsing
}

interface FileEntry {
  name: string;
  path: string;
}

interface BrowseFilesResponse {
  currentPath: string;
  parent: string | null;
  directories: FileEntry[];
  files: FileEntry[];
}

export default function FileBrowser({
  onSelect,
  onClose,
  fileFilter,
  initialPath,
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [directories, setDirectories] = useState<FileEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const browsePath = useCallback(
    async (path?: string) => {
      setLoading(true);
      setError('');

      try {
        let url = path
          ? `http://localhost:3001/api/filesystem/browse-files?path=${encodeURIComponent(path)}`
          : 'http://localhost:3001/api/filesystem/browse-files';

        if (fileFilter) {
          url += `${path ? '&' : '?'}filter=${encodeURIComponent(fileFilter)}`;
        }

        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to browse directory');
        }

        const data: BrowseFilesResponse = await res.json();
        setCurrentPath(data.currentPath);
        setParent(data.parent);
        setDirectories(data.directories);
        setFiles(data.files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to browse directory');
      } finally {
        setLoading(false);
      }
    },
    [fileFilter]
  );

  useEffect(() => {
    browsePath(initialPath);
  }, [browsePath, initialPath]);

  const handleFileClick = (filePath: string) => {
    onSelect(filePath);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Select File</h2>
            <p className="text-sm text-slate-400 mt-1">Browse and select a file</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Current Path */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
          <p className="text-sm text-slate-300 font-mono truncate">{currentPath || 'Loading...'}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg shrink-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-1">
              {/* Parent directory */}
              {parent && (
                <button
                  onClick={() => browsePath(parent)}
                  className="w-full text-left px-4 py-2 rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <span>📁</span>
                  <span>..</span>
                </button>
              )}

              {/* Directories */}
              {directories.map(dir => (
                <button
                  key={dir.path}
                  onClick={() => browsePath(dir.path)}
                  className="w-full text-left px-4 py-2 rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <span>📁</span>
                  <span>{dir.name}</span>
                </button>
              ))}

              {/* Files */}
              {files.map(file => (
                <button
                  key={file.path}
                  onClick={() => handleFileClick(file.path)}
                  className="w-full text-left px-4 py-2 rounded hover:bg-blue-600/20 border border-transparent hover:border-blue-500 transition-colors flex items-center gap-2 hover:scale-[1.01]"
                >
                  <span>📄</span>
                  <span>{file.name}</span>
                </button>
              ))}

              {/* Empty state */}
              {directories.length === 0 && files.length === 0 && !parent && (
                <div className="text-center py-8 text-slate-400">No files or directories found</div>
              )}

              {directories.length === 0 && files.length === 0 && parent && (
                <div className="text-center py-8 text-slate-400">Empty directory</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 shrink-0 flex justify-between items-center">
          <p className="text-sm text-slate-400">
            {fileFilter
              ? `Showing ${files.length} file(s) matching: ${fileFilter.split(',').join(', ')}`
              : `${files.length} file(s)`}
          </p>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
