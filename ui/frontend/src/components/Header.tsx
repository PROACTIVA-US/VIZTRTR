import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/projects', label: 'Projects' },
    { path: '/builder', label: 'Builder' },
    { path: '/features', label: 'Features' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold text-gray-900">VIZTRTR</h1>
          <nav className="flex space-x-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-100 hover:text-blue-600 ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
