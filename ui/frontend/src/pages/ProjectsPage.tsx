import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectWizard from '../components/ProjectWizard';
import type { Project } from '../types';

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
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

  const handleWizardComplete = () => {
    setShowWizard(false);
    loadProjects();
  };

  const handleStartRun = async (projectId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/runs`, {
        method: 'POST'
      });

      if (res.ok) {
        const run = await res.json();
        navigate(`/runs/${run.id}`);
      }
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <button onClick={() => setShowWizard(true)} className="btn-primary">
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">
              Create your first project to start improving your UI
            </p>
            <button onClick={() => setShowWizard(true)} className="btn-primary">
              Create New Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{project.name}</h3>
                  <p className="text-sm text-slate-400">{project.projectPath}</p>
                </div>
                <div className="text-sm text-slate-400">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-slate-400">URL:</span>{' '}
                  <a
                    href={project.frontendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {project.frontendUrl}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400">Target:</span>{' '}
                  <span>{project.targetScore}/10</span>
                </div>
                <div>
                  <span className="text-slate-400">Max Iterations:</span>{' '}
                  <span>{project.maxIterations}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleStartRun(project.id)}
                  className="btn-primary flex-1"
                >
                  Start Run
                </button>
                <button
                  onClick={() => navigate(`/projects/${project.id}/runs`)}
                  className="btn-secondary"
                >
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && (
        <ProjectWizard
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
