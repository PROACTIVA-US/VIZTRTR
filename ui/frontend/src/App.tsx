import { Routes, Route } from 'react-router-dom';
import BuilderPage from './pages/BuilderPage';
import ProjectsPage from './pages/ProjectsPage';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<BuilderPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
