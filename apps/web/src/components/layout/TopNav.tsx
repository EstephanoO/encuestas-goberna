import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart2, Vote } from 'lucide-react';
import { hasVotedLocally } from '@/lib/fingerprint';

const ALL_LINKS = [
  { to: '/votar', label: 'Votar', icon: Vote, hideAfterVote: true },
  { to: '/resultados', label: 'Resultados', icon: BarChart2, hideAfterVote: false },
];

export function TopNav() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/escudo-goberna.webp"
            alt="Goberna"
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="text-base font-bold text-foreground">
            Encuesta Presidencial 2026
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {ALL_LINKS.filter((l) => !(l.hideAfterVote && hasVotedLocally())).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
