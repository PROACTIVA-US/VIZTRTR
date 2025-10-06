/**
 * Comprehensive Project Onboarding Workflow
 * Guides users through: PRD upload → Analysis → Tech Spec Review → Frontend Verification → Ready to Run
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileBrowser from './FileBrowser';

interface ProjectOnboardingProps {
  projectId: number;
  projectName: string;
  projectPath: string;
  onComplete: () => void;
}

type Step =
  | 'prd-upload'
  | 'analyzing'
  | 'analyzing-error'
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
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [productSpec, setProductSpec] = useState<ProductSpec | null>(null);
  const [specJson, setSpecJson] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');
  const [serverRunning, setServerRunning] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [prdFilePath, setPrdFilePath] = useState('');
  const [prdFileName, setPrdFileName] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [startingServer, setStartingServer] = useState(false);
  const [stoppingServer, setStoppingServer] = useState(false);
  const [serverStartOutput, setServerStartOutput] = useState('');

  const handleFileButtonClick = () => {
    setShowFileBrowser(true);
  };

  const handleFileSelect = (path: string) => {
    setPrdFilePath(path);
    setPrdFileName(path.split('/').pop() || path);
    setPrdMethod('file');
    setShowFileBrowser(false);
  };

  const handleUploadPRD = async () => {
    setAnalyzing(true);
    setStep('analyzing');
    setError('');

    try {
      // Validate inputs
      const body =
        prdMethod === 'text' && prdText
          ? { prd: prdText }
          : prdMethod === 'file' && prdFilePath
            ? { prdFilePath }
            : null;

      if (!body) {
        setError('Please provide a PRD');
        setStep('prd-upload');
        setAnalyzing(false);
        return;
      }

      // Check server health before starting analysis
      try {
        const healthCheck = await fetch('http://localhost:3001/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (!healthCheck.ok) {
          throw new Error('Server is not healthy');
        }
      } catch (healthError) {
        throw new Error(
          'Unable to connect to the backend server on port 3001. Please ensure it is running and try again.'
        );
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minute timeout for AI processing

      try {
        console.log('[PRD Analysis] Starting analysis request...');
        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/analyze-prd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        console.log('[PRD Analysis] Response received, status:', res.status);
        clearTimeout(timeoutId);
        setAbortController(null);

        if (!res.ok) {
          const errorData = await res.json();
          const errorMessage = errorData.error || 'Failed to analyze PRD';
          throw new Error(errorMessage);
        }

        console.log('[PRD Analysis] Parsing response JSON...');
        const spec = await res.json();
        console.log(
          '[PRD Analysis] Spec parsed successfully, components:',
          Object.keys(spec.components || {}).length
        );
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
          const detectedUrl = urlData.url || 'http://localhost:3000';
          setFrontendUrl(detectedUrl);

          // Show warnings based on verification status
          if (!urlData.verified) {
            console.warn(
              `[PRD Analysis] Frontend server not running at ${detectedUrl}. User will need to start it.`
            );
          } else if (urlData.verified && !urlData.matched) {
            console.warn(
              `[PRD Analysis] Server running at ${detectedUrl} but project name doesn't match. Please verify this is the correct project.`
            );
          } else if (urlData.matched) {
            console.log(`[PRD Analysis] ✓ Server verified and project matched at ${detectedUrl}`);
          }

          if (urlData.message) {
            console.log(`[PRD Analysis] ${urlData.message}`);
          }
        }

        setStep('spec-review');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        setAbortController(null);

        // Handle timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(
            'Analysis timed out after 4 minutes. The server may be unresponsive. Please try again.'
          );
        }

        // Handle network errors
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error(
            'Unable to connect to the server. Please ensure the backend is running on port 3001.'
          );
        }

        throw fetchError;
      }
    } catch (error) {
      console.error('PRD analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze PRD. Please try again.');
      setStep('analyzing-error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStopAnalysis = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setAnalyzing(false);
    setStep('prd-upload');
    setError('');
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
      // Use the new server status endpoint
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/server/status`, {
        method: 'GET',
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
    setStartingServer(true);
    setServerStartOutput('');
    setError('');

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/server/start`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setServerStartOutput(data.output || 'Server started successfully!');
        setFrontendUrl(data.url || frontendUrl);
        setServerRunning(true);

        // Poll for server status with exponential backoff instead of single timeout
        await pollServerStatus(data.url || frontendUrl);
      } else {
        setError(data.error || 'Failed to start server');
        setServerRunning(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start server');
      setServerRunning(false);
    } finally {
      setStartingServer(false);
    }
  };

  const handleStopServer = async () => {
    setStoppingServer(true);
    setError('');

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/server/stop`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setServerRunning(false);
        setServerStartOutput('Server stopped');
      } else {
        setError(data.message || 'No running server found');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop server');
    } finally {
      setStoppingServer(false);
    }
  };

  // Poll server status with exponential backoff
  const pollServerStatus = async (url: string, maxAttempts = 5) => {
    for (let i = 0; i < maxAttempts; i++) {
      const delay = Math.min(1000 * Math.pow(2, i), 5000); // 1s, 2s, 4s, 5s, 5s
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/server/status`, {
          method: 'GET',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.running) {
            setServerRunning(true);
            return;
          }
        }
      } catch (err) {
        // Continue polling
      }
    }
  };

  const handleComplete = () => {
    navigate('/projects');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages, // Send full conversation history
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
      {/* Header - matches global Header component exactly */}
      <header className="bg-slate-800 border-b border-slate-700 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center">
              <span className="text-2xl font-bold text-gradient">VIZTRTR</span>
            </button>

            <nav className="flex items-center space-x-6">
              <span className="text-slate-400 text-sm">{projectName}</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Setup: {projectName}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className={step === 'prd-upload' ? 'text-blue-400' : 'text-slate-500'}>
              1. Analyze PRD
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
                onClick={handleFileButtonClick}
                className={`p-6 rounded-lg border-2 transition-all ${
                  prdMethod === 'file'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-4xl mb-2">📄</div>
                <h3 className="font-semibold mb-1">Upload PRD File</h3>
                <p className="text-sm text-slate-400">{prdFileName || 'PDF, DOCX, MD, or TXT'}</p>
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  console.log('Cancel clicked, resetting and navigating to /projects');
                  // Reset all state before navigating
                  setError('');
                  setPrdMethod(null);
                  setPrdText('');
                  setPrdFilePath('');
                  setPrdFileName('');
                  setStep('prd-upload');
                  navigate('/projects');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadPRD}
                disabled={
                  !prdMethod ||
                  (prdMethod === 'text' && !prdText.trim()) ||
                  (prdMethod === 'file' && !prdFilePath)
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
            {/* Animated Circular Wave Pattern */}
            <div className="flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200" className="analyzing-spinner">
                <defs>
                  <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Rotating wave rings */}
                <g className="wave-ring-1">
                  <path
                    d="M 100,30 Q 130,30 150,50 Q 170,70 170,100 Q 170,130 150,150 Q 130,170 100,170 Q 70,170 50,150 Q 30,130 30,100 Q 30,70 50,50 Q 70,30 100,30"
                    fill="none"
                    stroke="url(#waveGradient1)"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                </g>

                <g className="wave-ring-2">
                  <path
                    d="M 100,40 Q 125,40 142,57 Q 160,75 160,100 Q 160,125 142,142 Q 125,160 100,160 Q 75,160 57,142 Q 40,125 40,100 Q 40,75 57,57 Q 75,40 100,40"
                    fill="none"
                    stroke="url(#waveGradient2)"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                </g>

                <g className="wave-ring-3">
                  <path
                    d="M 100,50 Q 120,50 135,65 Q 150,80 150,100 Q 150,120 135,135 Q 120,150 100,150 Q 80,150 65,135 Q 50,120 50,100 Q 50,80 65,65 Q 80,50 100,50"
                    fill="none"
                    stroke="url(#waveGradient3)"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                </g>

                {/* Flowing particles */}
                <circle r="3" fill="#8b5cf6" opacity="0.8">
                  <animateMotion dur="4s" repeatCount="indefinite">
                    <mpath href="#orbit1" />
                  </animateMotion>
                </circle>
                <circle r="3" fill="#3b82f6" opacity="0.8">
                  <animateMotion dur="3.5s" repeatCount="indefinite">
                    <mpath href="#orbit2" />
                  </animateMotion>
                </circle>
                <circle r="3" fill="#06b6d4" opacity="0.8">
                  <animateMotion dur="4.5s" repeatCount="indefinite">
                    <mpath href="#orbit3" />
                  </animateMotion>
                </circle>

                {/* Hidden orbit paths */}
                <path
                  id="orbit1"
                  d="M 100,30 Q 130,30 150,50 Q 170,70 170,100 Q 170,130 150,150 Q 130,170 100,170 Q 70,170 50,150 Q 30,130 30,100 Q 30,70 50,50 Q 70,30 100,30"
                  fill="none"
                  opacity="0"
                />
                <path
                  id="orbit2"
                  d="M 100,40 Q 125,40 142,57 Q 160,75 160,100 Q 160,125 142,142 Q 125,160 100,160 Q 75,160 57,142 Q 40,125 40,100 Q 40,75 57,57 Q 75,40 100,40"
                  fill="none"
                  opacity="0"
                />
                <path
                  id="orbit3"
                  d="M 100,50 Q 120,50 135,65 Q 150,80 150,100 Q 150,120 135,135 Q 120,150 100,150 Q 80,150 65,135 Q 50,120 50,100 Q 50,80 65,65 Q 80,50 100,50"
                  fill="none"
                  opacity="0"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-2">Analyzing Your PRD...</h2>
            <p className="text-slate-400 mb-6">
              VIZTRTR is reading your requirements and generating a technical specification
            </p>
            <div className="flex justify-center mb-6">
              <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]"
                  style={{
                    animation: 'shimmer 2s ease-in-out infinite',
                    backgroundSize: '200% 100%',
                  }}
                ></div>
              </div>
            </div>
            <button type="button" onClick={handleStopAnalysis} className="btn-secondary">
              Stop Analysis
            </button>
            <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }

              @keyframes rotate-ring-1 {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              @keyframes rotate-ring-2 {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }

              @keyframes rotate-ring-3 {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              .analyzing-spinner {
                filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.4));
              }

              .wave-ring-1 {
                transform-origin: 100px 100px;
                animation: rotate-ring-1 8s linear infinite;
              }

              .wave-ring-2 {
                transform-origin: 100px 100px;
                animation: rotate-ring-2 6s linear infinite;
              }

              .wave-ring-3 {
                transform-origin: 100px 100px;
                animation: rotate-ring-3 10s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* Step: Analyzing Error */}
        {step === 'analyzing-error' && (
          <div className="bg-slate-800 rounded-lg p-12">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">Analysis Failed</h2>
              <p className="text-slate-300 mb-6">
                {error || 'An unexpected error occurred during PRD analysis.'}
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Troubleshooting Tips:</h3>
              <ul className="text-slate-400 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Check your internet connection for AI API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Verify your Anthropic API key is configured correctly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Try simplifying your PRD if it's very large or complex</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('prd-upload')} className="btn-secondary">
                Go Back
              </button>
              <button onClick={handleUploadPRD} className="btn-primary">
                Retry Analysis
              </button>
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
              <h3 className="font-semibold mb-3">Product Vision</h3>
              <p className="text-sm text-slate-300 mb-4">{productSpec.productVision}</p>

              <h3 className="font-semibold mb-2">Target Users</h3>
              <ul className="text-sm text-slate-300 space-y-1 mb-4">
                {productSpec.targetUsers?.slice(0, 3).map((user: string, i: number) => (
                  <li key={i}>• {user}</li>
                ))}
              </ul>

              <h3 className="font-semibold mb-2">
                Components ({Object.keys(productSpec.components || {}).length})
              </h3>
              <div className="grid gap-2">
                {Object.keys(productSpec.components || {})
                  .slice(0, 5)
                  .map((componentName, i) => (
                    <div key={i} className="bg-slate-800 p-2 rounded text-sm">
                      <code className="text-blue-400">{componentName}</code>
                    </div>
                  ))}
                {Object.keys(productSpec.components || {}).length > 5 && (
                  <p className="text-sm text-slate-500">
                    + {Object.keys(productSpec.components || {}).length - 5} more components
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
                <div className="mt-2 flex items-center justify-between">
                  <div
                    className={`flex-1 p-3 rounded ${serverRunning ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                  >
                    {serverRunning ? '✓ Server is running' : '✗ Server not detected'}
                  </div>
                  {serverRunning && (
                    <button
                      onClick={handleStopServer}
                      disabled={stoppingServer}
                      className="ml-2 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {stoppingServer ? 'Stopping...' : 'Stop Server'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {serverRunning === false && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-400 mb-2">Server Not Running</h3>
                <p className="text-sm text-slate-300 mb-3">
                  VIZTRTR can automatically start your frontend dev server, or you can start it
                  manually at:
                  <br />
                  <code className="text-yellow-400">{projectPath}</code>
                </p>

                {error && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500 rounded">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {serverStartOutput && (
                  <div className="mb-3 p-3 bg-slate-900 rounded text-xs font-mono max-h-32 overflow-y-auto">
                    <pre className="text-slate-300 whitespace-pre-wrap">{serverStartOutput}</pre>
                  </div>
                )}

                <button
                  onClick={handleStartServer}
                  disabled={startingServer}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingServer ? 'Starting Server...' : 'Start Server Automatically'}
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

      {/* FileBrowser Modal */}
      {showFileBrowser && (
        <FileBrowser
          onSelect={handleFileSelect}
          onClose={() => setShowFileBrowser(false)}
          fileFilter="pdf,docx,md,txt"
          initialPath={
            projectPath ? projectPath.substring(0, projectPath.lastIndexOf('/')) : undefined
          }
        />
      )}
    </div>
  );
}
