import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gradient">VIZTRTR</span>
          </Link>

          <nav className="flex items-center space-x-6">
            <Link to="/projects" className="text-slate-300 hover:text-white transition-colors">
              Projects
            </Link>
            <Link to="/features" className="text-slate-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link to="/settings" className="text-slate-300 hover:text-white transition-colors">
              Settings
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
