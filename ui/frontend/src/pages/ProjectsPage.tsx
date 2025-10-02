function ProjectsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Your Projects</h1>

      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-slate-400 mb-6">
            Start building your first project to see it here
          </p>
          <a href="/" className="btn-primary inline-block">
            Create New Project
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;
