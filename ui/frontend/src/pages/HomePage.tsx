import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gradient">VIZTRTR</span>
        </h1>
        <p className="text-2xl text-slate-300 mb-2">AI-Powered UI/UX Improvement System</p>
        <p className="text-lg text-slate-400 max-w-3xl mx-auto">
          Autonomous design iteration using advanced AI vision models. Analyze, improve, and
          evaluate web interfaces until they reach design excellence.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2 text-white">AI Vision Analysis</h3>
          <p className="text-slate-400">
            Claude Opus 4, GPT-4o, and Gemini analyze your UI with expert-level design critique
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-xl font-bold mb-2 text-white">Iterative Improvement</h3>
          <p className="text-slate-400">
            Automatically applies changes, re-evaluates, and learns from each iteration
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2 text-white">Hybrid Scoring</h3>
          <p className="text-slate-400">
            Combines AI vision (60%) with real browser metrics (40%) for 95% accuracy
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-bold mb-2 text-white">Memory System</h3>
          <p className="text-slate-400">
            Learns from past iterations to avoid repeating failed approaches
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2 text-white">8-Dimension Scoring</h3>
          <p className="text-slate-400">
            Evaluates visual hierarchy, typography, accessibility, and more
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-xl font-bold mb-2 text-white">Multi-Provider</h3>
          <p className="text-slate-400">
            Switch between Anthropic, OpenAI, Google, and Z.AI models instantly
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-12 rounded-lg border border-purple-800/30">
        <h2 className="text-3xl font-bold mb-4 text-white">Ready to improve your UI?</h2>
        <p className="text-slate-300 mb-8 text-lg">
          Start analyzing your projects with AI-powered design iteration
        </p>
        <Link
          to="/projects"
          className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
        >
          View Your Projects
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-8 mt-16">
        <div className="text-center">
          <div className="text-4xl font-bold text-gradient mb-2">95%</div>
          <div className="text-slate-400">Accuracy with Hybrid Mode</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-gradient mb-2">8</div>
          <div className="text-slate-400">Design Dimensions</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-gradient mb-2">4</div>
          <div className="text-slate-400">AI Providers Supported</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-gradient mb-2">8.5+</div>
          <div className="text-slate-400">Production-Ready Target</div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
