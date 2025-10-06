function Footer() {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
      <div className="px-4 py-6">
        <div className="flex items-center justify-end text-sm text-slate-400">
          <div className="flex items-center space-x-4">
            <span>VIZTRTR - AI-Powered UI Improvement System</span>
            <span className="text-slate-600">|</span>
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
