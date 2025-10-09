import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <img src="/hero.png" alt="VIZTRTR" className="w-full max-w-4xl" />
      <Link to="/projects/new">
        <img src="/cta.png" alt="Create New Project" className="w-full max-w-md mt-4" />
      </Link>
    </div>
  );
}

export default HomePage;
