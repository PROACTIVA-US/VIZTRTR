/**
 * Comprehensive Project Onboarding Workflow
 * Guides users through: PRD upload → Analysis → Tech Spec Review → Frontend Verification → Ready to Run
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProjectOnboardingProps {
  projectId: number;
  projectName: string;
  projectPath: string;
  onComplete: () => void;
}

type Step =
  | 'prd-upload'
  | 'analyzing'
  | 'spec-review'
  | 'spec-edit'
  | 'frontend-verify'
  | 'complete';

interface ProductSpec {
  projectId: string;
  productName: string;
  version: string;
  overview: {
    purpose: string;
    targetUsers: string[];
    keyFeatures: string[];
  };
  technicalRequirements: {
    framework: string;
    components: string[];
    dependencies: string[];
  };
  uiuxGuidelines: {
    designPrinciples: string[];
    colorScheme: any;
    typography: any;
    spacing: any;
  };
  routes: Array<{
    path: string;
    label: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

export default function ProjectOnboarding({
  projectId,
  projectName,
  projectPath,
  onComplete,
}: ProjectOnboardingProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('prd-upload');
  const [prdMethod, setPrdMethod] = useState<'text' | 'file' | null>(null);
  const [prdText, setPrdText] = useState('');
  const [prdFile, setPrdFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [productSpec, setProductSpec] = useState<ProductSpec | null>(null);
  const [specJson, setSpecJson] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');
  const [serverRunning, setServerRunning] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');

  const handleUploadPRD = async () => {
    setAnalyzing(true);
    setStep('analyzing');
    setError('');

    try {
      let prdContent = '';

      // Get PRD content from text or file
      if (prdMethod === 'text' && prdText) {
        prdContent = prdText;
      } else if (prdMethod === 'file' && prdFile) {
        // Read file content
        prdContent = await prdFile.text();
      }

      if (!prdContent) {
        setError('Please provide a PRD');
        setStep('prd-upload');
        return;
      }

      // Call backend to analyze PRD and generate spec
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/analyze-prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prd: prdContent }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze PRD');
      }

      const spec = await res.json();
      setProductSpec(spec);
      setSpecJson(JSON.stringify(spec, null, 2));

      // Detect frontend URL
      const urlRes = await fetch('http://localhost:3001/api/projects/detect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      if (urlRes.ok) {
        const urlData = await urlRes.json();
        setFrontendUrl(urlData.url || 'http://localhost:3000');
      }

      setStep('spec-review');
    } catch (error) {
      console.error('PRD analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze PRD. Please try again.');
      setStep('prd-upload');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSpecEdit = () => {
    setStep('spec-edit');
  };

  const handleProceedToFrontend = () => {
    setStep('frontend-verify');
    checkServerStatus();
  };

  const checkServerStatus = async () => {
    try {
      // Use backend proxy to check server status (avoids CORS issues)
      const res = await fetch('http://localhost:3001/api/check-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: frontendUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setServerRunning(data.running);
      } else {
        setServerRunning(false);
      }
    } catch (error) {
      setServerRunning(false);
    }
  };

  const handleStartServer = async () => {
    setError('Please start your frontend server manually from the project directory.');
  };

  const handleComplete = () => {
    navigate('/projects');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: { productSpec, projectPath },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Chat request failed');
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get response. Please try again.';
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${errorMessage}`,
        },
      ]);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Setup: {projectName}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className={step === 'prd-upload' ? 'text-blue-400' : 'text-slate-500'}>
              1. Upload PRD
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={
                step === 'analyzing' || step === 'spec-review' || step === 'spec-edit'
                  ? 'text-blue-400'
                  : 'text-slate-500'
              }
            >
              2. Review Tech Spec
            </span>
            <span className="text-slate-600">→</span>
            <span className={step === 'frontend-verify' ? 'text-blue-400' : 'text-slate-500'}>
              3. Verify Frontend
            </span>
            <span className="text-slate-600">→</span>
            <span className={step === 'complete' ? 'text-blue-400' : 'text-slate-500'}>
              4. Ready
            </span>
          </div>
        </div>

        {/* Step: PRD Upload */}
        {step === 'prd-upload' && (
          <div className="bg-slate-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Upload Product Requirements Document (PRD)</h2>
            <p className="text-slate-400 mb-6">
              VIZTRTR will analyze your PRD to generate a technical specification, UI/UX guidelines,
              and route structure.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setPrdMethod('text')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  prdMethod === 'text'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-4xl mb-2">📝</div>
                <h3 className="font-semibold mb-1">Paste PRD Text</h3>
                <p className="text-sm text-slate-400">Copy and paste your PRD content</p>
              </button>

              <button
                onClick={() => setPrdMethod('file')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  prdMethod === 'file'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-4xl mb-2">📄</div>
                <h3 className="font-semibold mb-1">Upload PRD File</h3>
                <p className="text-sm text-slate-400">PDF, DOCX, MD, or TXT</p>
              </button>
            </div>

            {prdMethod === 'text' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">PRD Content</label>
                <textarea
                  value={prdText}
                  onChange={e => setPrdText(e.target.value)}
                  placeholder="Paste your Product Requirements Document here..."
                  className="w-full h-64 bg-slate-900 text-white p-4 rounded border border-slate-700 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              </div>
            )}

            {prdMethod === 'file' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select PRD File</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.md,.txt"
                  onChange={e => setPrdFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-900 text-white p-4 rounded border border-slate-700"
                />
                {prdFile && (
                  <p className="text-sm text-slate-400 mt-2">
                    Selected: {prdFile.name} ({(prdFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate('/projects')} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleUploadPRD}
                disabled={
                  !prdMethod ||
                  (prdMethod === 'text' && !prdText.trim()) ||
                  (prdMethod === 'file' && !prdFile)
                }
                className="btn-primary flex-1"
              >
                Start PRD Analysis
              </button>
            </div>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4 animate-pulse">🧠</div>
            <h2 className="text-2xl font-bold mb-2">Analyzing Your PRD...</h2>
            <p className="text-slate-400 mb-6">
              VIZTRTR is reading your requirements and generating a technical specification
            </p>
            <div className="flex justify-center">
              <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Spec Review */}
        {step === 'spec-review' && productSpec && (
          <div className="bg-slate-800 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-2xl font-bold mb-2">VIZTRTR Has Created Your Tech Spec!</h2>
              <p className="text-slate-400">
                Review the generated specification or proceed to configure your frontend
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-3">Overview</h3>
              <p className="text-sm text-slate-300 mb-4">{productSpec.overview.purpose}</p>

              <h3 className="font-semibold mb-2">Key Features</h3>
              <ul className="text-sm text-slate-300 space-y-1 mb-4">
                {productSpec.overview.keyFeatures.slice(0, 5).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>

              <h3 className="font-semibold mb-2">Technical Stack</h3>
              <p className="text-sm text-slate-300 mb-4">
                Framework: {productSpec.technicalRequirements.framework}
              </p>

              <h3 className="font-semibold mb-2">Routes ({productSpec.routes.length})</h3>
              <div className="grid gap-2">
                {productSpec.routes.slice(0, 4).map((route, i) => (
                  <div key={i} className="bg-slate-800 p-2 rounded text-sm">
                    <code className="text-blue-400">{route.path}</code> - {route.label}
                  </div>
                ))}
                {productSpec.routes.length > 4 && (
                  <p className="text-sm text-slate-500">
                    + {productSpec.routes.length - 4} more routes
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSpecEdit} className="btn-secondary flex-1">
                Review & Edit Spec
              </button>
              <button onClick={handleProceedToFrontend} className="btn-primary flex-1">
                Proceed to Frontend Setup
              </button>
            </div>
          </div>
        )}

        {/* Step: Spec Edit */}
        {step === 'spec-edit' && (
          <div className="bg-slate-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Review & Edit Tech Spec</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* JSON Editor */}
              <div>
                <h3 className="font-semibold mb-2">Specification JSON</h3>
                <textarea
                  value={specJson}
                  onChange={e => setSpecJson(e.target.value)}
                  className="w-full h-96 bg-slate-900 text-white p-4 rounded border border-slate-700 focus:border-blue-500 focus:outline-none font-mono text-xs"
                  spellCheck={false}
                />
              </div>

              {/* AI Chat */}
              <div className="flex flex-col">
                <h3 className="font-semibold mb-2">AI Spec Assistant</h3>
                <div className="flex-1 bg-slate-900 rounded p-4 mb-3 overflow-y-auto h-64">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Ask the AI to help refine your spec
                      <br />
                      e.g., "Add authentication routes"
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`text-sm p-2 rounded ${
                            msg.role === 'user' ? 'bg-blue-600 ml-8' : 'bg-slate-800 mr-8'
                          }`}
                        >
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask AI to modify spec..."
                    className="flex-1 bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <button onClick={handleSendChat} className="btn-primary px-4 py-2 text-sm">
                    Send
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('spec-review')} className="btn-secondary">
                Back
              </button>
              <button onClick={handleProceedToFrontend} className="btn-primary flex-1">
                Save & Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Frontend Verify */}
        {step === 'frontend-verify' && (
          <div className="bg-slate-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Verify Frontend Server</h2>
            <p className="text-slate-400 mb-6">
              VIZTRTR needs to access your running frontend to analyze the UI
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Frontend URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={frontendUrl}
                  onChange={e => setFrontendUrl(e.target.value)}
                  className="flex-1 bg-slate-900 text-white px-4 py-3 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                />
                <button onClick={checkServerStatus} className="btn-secondary">
                  Check Status
                </button>
              </div>
              {serverRunning !== null && (
                <div
                  className={`mt-2 p-3 rounded ${serverRunning ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                >
                  {serverRunning ? '✓ Server is running' : '✗ Server not detected'}
                </div>
              )}
            </div>

            {serverRunning === false && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-400 mb-2">Server Not Running</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Please start your frontend dev server manually at:
                  <br />
                  <code className="text-yellow-400">{projectPath}</code>
                </p>
                <button
                  onClick={handleStartServer}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                >
                  Try to Start Server
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('spec-review')} className="btn-secondary">
                Back
              </button>
              <button
                onClick={() => window.open(frontendUrl, '_blank')}
                className="btn-secondary flex-1"
                disabled={!serverRunning}
              >
                Open Frontend in Browser
              </button>
              <button
                onClick={handleComplete}
                disabled={!serverRunning}
                className="btn-primary flex-1"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
