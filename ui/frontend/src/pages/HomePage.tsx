import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProjectWizard from '../components/ProjectWizard';
import ProjectOnboarding from '../components/ProjectOnboarding';
import type { Project } from '../types';

function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [onboardingProject, setOnboardingProject] = useState<{
    id: number;
    name: string;
    path: string;
  } | null>(null);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleWizardComplete = async (projectId: number) => {
    setShowWizard(false);

    // Load project details to pass to onboarding
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (res.ok) {
        const project = await res.json();
        setOnboardingProject({
          id: project.id,
          name: project.name,
          path: project.projectPath,
        });
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/projects');
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingProject(null);
    navigate('/projects');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Simple Hero */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-6">
          <span className="text-gradient">Start Analyzing UI</span>
        </h1>
        <p className="text-xl text-slate-400 mb-12">
          Create a new project or continue working on existing ones
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* New Project Card */}
        <button
          onClick={() => setShowWizard(true)}
          className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-600/50 rounded-xl p-8 hover:border-purple-500 hover:from-purple-900/60 hover:to-blue-900/60 transition-all transform hover:scale-105 text-left"
        >
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-2xl font-bold mb-2 text-white">Create New Project</h2>
          <p className="text-slate-300">
            Start analyzing a new UI with AI-powered design improvements
          </p>
        </button>

        {/* Open Projects Card */}
        <Link
          to="/projects"
          className="bg-slate-800/60 border-2 border-slate-700 rounded-xl p-8 hover:border-blue-500 hover:bg-slate-800 transition-all transform hover:scale-105 text-left block"
        >
          <div className="text-5xl mb-4">📁</div>
          <h2 className="text-2xl font-bold mb-2 text-white">Open Projects</h2>
          <p className="text-slate-300">
            Continue working on your existing projects
            {!loading && projects.length > 0 && (
              <span className="block mt-2 text-sm text-blue-400">
                {projects.length} project{projects.length !== 1 ? 's' : ''} available
              </span>
            )}
          </p>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="text-center text-sm text-slate-500">
        <Link to="/features" className="hover:text-slate-300 transition-colors">
          Learn about features →
        </Link>
      </div>

      {/* Project Wizard Modal */}
      {showWizard && (
        <ProjectWizard onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />
      )}

      {/* Project Onboarding Flow */}
      {onboardingProject && (
        <ProjectOnboarding
          projectId={onboardingProject.id}
          projectName={onboardingProject.name}
          projectPath={onboardingProject.path}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}

export default HomePage;
