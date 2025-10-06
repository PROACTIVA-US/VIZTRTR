import SystemStatus from './SystemStatus';

function Footer() {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
      <div className="px-4 py-6">
        <div className="grid grid-cols-3 items-center text-sm text-slate-400">
          {/* Left: Logo */}
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gradient">VIZTRTR</span>
          </div>

          {/* Center: System Status */}
          <div className="flex justify-center">
            <SystemStatus />
          </div>

          {/* Right: Links */}
          <div className="flex items-center justify-end space-x-4">
            <a
              href="https://github.com/PROACTIVA-US/VIZTRTR"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/PROACTIVA-US/VIZTRTR#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
