function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gradient">Features</span>
        </h1>
        <p className="text-xl text-slate-300 mb-2">
          AI-Powered UI/UX Improvement System
        </p>
        <p className="text-lg text-slate-400 max-w-3xl mx-auto">
          Autonomous design iteration using advanced AI vision models. Analyze, improve,
          and evaluate web interfaces until they reach design excellence.
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

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-8 mb-16">
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
          <div className="text-slate-400">Target Quality Score</div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-8 rounded-lg border border-purple-800/30 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-white">How It Works</h2>
        <div className="space-y-4 text-slate-300">
          <div className="flex items-start gap-4">
            <div className="text-2xl">1️⃣</div>
            <div>
              <h3 className="font-semibold mb-1">Capture & Analyze</h3>
              <p className="text-slate-400">
                AI vision models analyze your UI screenshot and identify design improvements
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">2️⃣</div>
            <div>
              <h3 className="font-semibold mb-1">Implement Changes</h3>
              <p className="text-slate-400">
                Specialist agents automatically apply code changes to your project
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">3️⃣</div>
            <div>
              <h3 className="font-semibold mb-1">Evaluate & Learn</h3>
              <p className="text-slate-400">
                Hybrid scoring validates improvements and the system learns from each iteration
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">🔁</div>
            <div>
              <h3 className="font-semibold mb-1">Iterate to Excellence</h3>
              <p className="text-slate-400">
                Process repeats until your UI reaches the target quality score (8.5+/10)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeaturesPage;
