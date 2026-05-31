import { Link, useLocation } from 'react-router-dom';
import { Bot, GitBranch, Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/agents', label: 'Agents', icon: Bot },
    { path: '/workflows', label: 'Workflows', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      <nav className="h-14 bg-dark-card border-b border-dark-border flex items-center px-6">
        <Link to="/" className="flex items-center gap-2 mr-8">
          <Zap className="w-6 h-6 text-accent-indigo" />
          <span className="text-white font-bold text-lg">Agent Builder</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-accent-indigo/20 text-accent-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-dark-bg'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
