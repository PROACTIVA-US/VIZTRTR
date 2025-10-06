import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Project, ProductSpec } from '../types';

interface UploadedDocument {
  id: string;
  name: string;
  type: 'prd' | 'screenshot' | 'video' | 'other';
  uploadedAt: string;
  size: number;
  path: string;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [productSpec, setProductSpec] = useState<ProductSpec | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'spec' | 'documents' | 'chat' | 'config'>(
    'overview'
  );
  const [editingSpec, setEditingSpec] = useState(false);
  const [specContent, setSpecContent] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        // Load project details
        const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);
        }

        // Load product spec
        const specRes = await fetch(`http://localhost:3001/api/projects/${projectId}/spec`);
        if (specRes.ok) {
          const specData = await specRes.json();
          setProductSpec(specData);
          setSpecContent(JSON.stringify(specData, null, 2));
        }

        // Load documents (TODO: implement backend endpoint)
        // const docsRes = await fetch(`http://localhost:3001/api/projects/${projectId}/documents`);
        // if (docsRes.ok) {
        //   const docsData = await docsRes.json();
        //   setDocuments(docsData);
        // }
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const handleSaveSpec = async () => {
    if (!projectId) return;
    try {
      const parsedSpec = JSON.parse(specContent);
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/spec`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedSpec),
      });

      if (res.ok) {
        const updated = await res.json();
        setProductSpec(updated);
        setEditingSpec(false);
        alert('Product spec updated successfully!');
      }
    } catch (error) {
      alert('Failed to save spec: ' + (error instanceof Error ? error.message : 'Invalid JSON'));
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !projectId) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            productSpec,
            project,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project?.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        navigate('/projects');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.type.includes('image') ? 'screenshot' : 'other');

      try {
        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const doc = await res.json();
          setDocuments(prev => [...prev, doc]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card bg-red-500/10 border-red-500">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <button onClick={() => navigate('/projects')} className="btn-secondary mt-4">
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/projects"
            className="text-slate-400 hover:text-white transition-colors text-sm mb-2 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-slate-400 text-sm mt-1">{project.frontendUrl}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteProject}
            className="bg-red-600/10 text-red-400 border border-red-600/50 px-4 py-2 rounded-lg text-sm hover:bg-red-600/20 transition-all"
          >
            Delete Project
          </button>
          <Link
            to={`/projects/${projectId}/runs/new`}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Start New Run
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'spec', label: 'Product Spec', icon: '📋' },
            { id: 'documents', label: 'Documents', icon: '📁' },
            { id: 'chat', label: 'AI Chat', icon: '💬' },
            { id: 'config', label: 'Configuration', icon: '⚙️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Project Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Project Path</dt>
                <dd className="text-white font-mono text-xs break-all">{project.projectPath}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Frontend URL</dt>
                <dd className="text-white break-all">{project.frontendUrl}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Target Score</dt>
                <dd className="text-white">{project.targetScore}/10</dd>
              </div>
              <div>
                <dt className="text-slate-400">Max Iterations</dt>
                <dd className="text-white">{project.maxIterations}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Created</dt>
                <dd className="text-white">{new Date(project.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Recent Runs</h2>
            <p className="text-slate-400 text-sm">View run history and results</p>
            <Link
              to={`/projects/${projectId}/runs`}
              className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
            >
              View All Runs →
            </Link>
          </div>

          {productSpec && (
            <div className="card md:col-span-2">
              <h2 className="text-xl font-bold mb-4">Product Overview</h2>
              <p className="text-slate-300 mb-4">{productSpec.productVision}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-400 mb-2">Target Users</h3>
                  <ul className="text-sm space-y-1">
                    {productSpec.targetUsers.map((user, i) => (
                      <li key={i} className="text-slate-300">
                        • {user}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-400 mb-2">Components</h3>
                  <ul className="text-sm space-y-1">
                    {Object.keys(productSpec.components)
                      .slice(0, 5)
                      .map((comp, i) => (
                        <li key={i} className="text-slate-300">
                          • {comp}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'spec' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">VIZTRTR Product Specification</h2>
            {editingSpec ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSpec}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditingSpec(false);
                    setSpecContent(JSON.stringify(productSpec, null, 2));
                  }}
                  className="bg-slate-600 text-white px-4 py-2 rounded text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSpec(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Edit Spec
              </button>
            )}
          </div>

          {productSpec ? (
            editingSpec ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Edit the JSON below. Changes will be validated before saving.
                </p>
                <textarea
                  value={specContent}
                  onChange={e => setSpecContent(e.target.value)}
                  className="w-full h-96 bg-slate-900 text-white font-mono text-sm p-4 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Product Vision</h3>
                  <p className="text-sm text-slate-300">{productSpec.productVision}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Target Users</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {productSpec.targetUsers.map((user, i) => (
                      <li key={i}>• {user}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Components</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(productSpec.components).map(([name, comp]) => (
                      <div
                        key={name}
                        className="bg-slate-800/50 p-3 rounded border border-slate-700"
                      >
                        <h4 className="text-sm font-semibold text-blue-400 mb-1">{name}</h4>
                        <p className="text-xs text-slate-400">{comp.purpose || 'No description'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <details>
                  <summary className="cursor-pointer text-slate-400 hover:text-white text-sm">
                    View Full JSON
                  </summary>
                  <pre className="mt-2 p-4 bg-slate-900 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(productSpec, null, 2)}
                  </pre>
                </details>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No product specification available</p>
              <button className="btn-primary">Generate from PRD</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Project Documents</h2>
            <label className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 cursor-pointer">
              Upload Document
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.docx,.png,.jpg,.jpeg,.mp4,.mov"
              />
            </label>
          </div>

          {documents.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-slate-800/50 p-4 rounded border border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.type} • {(doc.size / 1024).toFixed(1)} KB •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">View</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-slate-400 mb-4">No documents uploaded yet</p>
              <p className="text-sm text-slate-500">
                Upload PRDs, screenshots, videos, or other reference materials
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="card flex flex-col" style={{ height: '600px' }}>
          <h2 className="text-xl font-bold mb-4">AI Project Assistant</h2>

          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-slate-400 mb-2">Ask questions about your project</p>
                <p className="text-sm text-slate-500">
                  The AI has access to your product spec, routes, and project details
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 p-3 rounded-lg">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask about your project..."
              className="flex-1 bg-slate-800 text-white px-4 py-3 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !chatInput.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Model Configuration</h2>
            <p className="text-sm text-slate-400 mb-6">
              Configure AI models specifically for this project. These settings override global
              defaults.
            </p>

            <div className="space-y-6">
              {/* Vision Model */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Vision Model
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (Analyzes UI screenshots)
                  </span>
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <select className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600">
                    <option>Anthropic (Claude)</option>
                    <option>OpenAI (GPT)</option>
                    <option>Google (Gemini)</option>
                  </select>
                  <select className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600">
                    <option>claude-opus-4-20250514</option>
                    <option>claude-sonnet-4.5-20250402</option>
                  </select>
                </div>
              </div>

              {/* Implementation Model */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Implementation Model
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (Generates code changes)
                  </span>
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <select className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600">
                    <option>Anthropic (Claude)</option>
                    <option>OpenAI (GPT)</option>
                  </select>
                  <select className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600">
                    <option>claude-sonnet-4.5-20250402</option>
                    <option>gpt-4o</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
                Save Configuration
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Backend Server Configuration</h2>
            <p className="text-sm text-slate-400 mb-6">
              Configure backend server for full-stack testing with real data and WebSocket
              connections
            </p>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 mr-3 bg-slate-700 border-slate-600 rounded"
                />
                <div>
                  <span className="text-white font-semibold">Enable Backend Server</span>
                  <p className="text-xs text-slate-500">
                    Start backend server before running tests
                  </p>
                </div>
              </label>

              <div className="pl-7 space-y-4 border-l-2 border-slate-700">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Backend URL</label>
                  <input
                    type="text"
                    placeholder="http://localhost:3002"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">URL where backend server will run</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Dev Command</label>
                  <input
                    type="text"
                    placeholder="npm run dev"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Command to start backend dev server</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Working Directory</label>
                  <input
                    type="text"
                    placeholder="/path/to/backend"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Absolute path to backend project directory
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Health Check Path</label>
                  <input
                    type="text"
                    placeholder="/health"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Endpoint to check if backend is ready
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Ready Timeout (ms)</label>
                  <input
                    type="number"
                    placeholder="15000"
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Max time to wait for backend to become ready
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Environment Variables</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="NODE_ENV"
                        className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                      />
                      <input
                        type="text"
                        placeholder="test"
                        className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                      />
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      + Add Environment Variable
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Custom environment variables for test runs
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">
                    💡 Benefits of Backend Integration
                  </h3>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Test with real data from database/APIs</li>
                    <li>• Verify WebSocket connections work correctly</li>
                    <li>• See actual charts and visualizations, not placeholders</li>
                    <li>• Test interactive features with real backend responses</li>
                    <li>• Validate full-stack integration and CORS configuration</li>
                  </ul>
                </div>
              </div>

              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
                Save Backend Configuration
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Testing Routes</h2>
            <p className="text-sm text-slate-400 mb-4">
              Configure which routes/sections to test during runs
            </p>
            {/* TODO: Route configuration UI */}
            <p className="text-slate-500 text-sm">Coming soon...</p>
          </div>

          <div className="card bg-red-500/10 border-red-500">
            <h2 className="text-xl font-bold mb-4 text-red-400">Danger Zone</h2>
            <button className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700">
              Delete Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
