import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-900 pt-16">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-6 text-gradient">VIZTRTR</h1>
        <p className="text-2xl text-slate-300 mb-4">AI-Powered UI/UX Improvement System</p>
        <p className="text-lg text-slate-400 max-w-3xl px-4">
          Autonomous design iteration using advanced AI vision models. Analyze, improve, and
          evaluate web interfaces until they reach design excellence.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center mt-8">
        <p className="text-slate-400 mb-6">Create your first project to start improving your UI</p>
        <Link
          to="/projects/new"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
        >
          Create New Project
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
