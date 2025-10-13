import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectWizard from '../components/ProjectWizard';
import ProjectOnboarding from '../components/ProjectOnboarding';
import type { Project } from '../types';

interface DeleteConfirmModalProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ projectName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-red-400">Confirm Project Deletion</h2>
        <p className="text-slate-300 mb-6">
          Are you sure you want to delete <strong>"{projectName}"</strong>?
        </p>
        <p className="text-sm text-slate-400 mb-6">
          This action cannot be undone. All project data and run history will be permanently
          deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-all"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
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

  // Auto-open wizard when there are no projects
  useEffect(() => {
    if (!loading && projects.length === 0) {
      setShowWizard(true);
    }
  }, [loading, projects.length]);

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
      loadProjects();
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingProject(null);
    loadProjects();
  };

  const handleStartRun = async (projectId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/projects/${projectId}/runs`, {
        method: 'POST',
      });

      if (res.ok) {
        const run = await res.json();
        navigate(`/runs/${run.id}`);
      }
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  const handleAddPRD = (project: Project) => {
    setOnboardingProject({
      id: Number(project.id),
      name: project.name,
      path: project.projectPath,
    });
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`http://localhost:3001/api/projects/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteConfirm(null);
        loadProjects(); // Refresh the list
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
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
          {projects.map(project => (
            <div key={project.id} className="card hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    {!project.synthesizedPRD && !project.hasProductSpec && (
                      <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 px-2 py-0.5 rounded text-xs font-medium">
                        ⚠️ PRD Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{project.projectPath}</p>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ id: project.id, name: project.name })}
                  className="bg-red-600/10 text-red-400 border border-red-600/50 px-3 py-1.5 rounded text-sm hover:bg-red-600/20 transition-all"
                >
                  Delete Project
                </button>
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
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-600 transition-all"
                >
                  View Details
                </button>
                {!project.synthesizedPRD && !project.hasProductSpec ? (
                  <button
                    onClick={() => handleAddPRD(project)}
                    className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 px-4 py-2 rounded hover:bg-yellow-600/30 transition-all flex-1 flex items-center justify-center gap-2"
                  >
                    <span>⚠️</span>
                    <span>Add PRD First</span>
                  </button>
                ) : (
                  <button onClick={() => handleStartRun(project.id)} className="btn-primary flex-1">
                    Start Run
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && (
        <ProjectWizard onClose={() => setShowWizard(false)} onComplete={handleWizardComplete} />
      )}

      {onboardingProject && (
        <ProjectOnboarding
          projectId={onboardingProject.id}
          projectName={onboardingProject.name}
          projectPath={onboardingProject.path}
          onComplete={handleOnboardingComplete}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          projectName={deleteConfirm.name}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
