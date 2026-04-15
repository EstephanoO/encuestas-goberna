import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Vote, BarChart2, Users } from 'lucide-react';

interface NavItem {
  hash: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Tres entradas del dashboard ONPE — todas viven en /resultados-2026, navegan por hash.
const NAV: NavItem[] = [
  { hash: '',           label: 'Presidencial', icon: BarChart2 },
  { hash: '#senado',    label: 'Senado',       icon: Vote },
  { hash: '#diputados', label: 'Diputados',    icon: Users },
];

export function TopNav() {
  const { pathname, hash } = useLocation();
  const onDashboard = pathname.startsWith('/resultados-2026');

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
            Resultados Presidenciales
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ hash: h, label, icon: Icon }) => {
            const active = onDashboard && (hash || '') === (h || '');
            return (
              <Link
                key={label}
                to={{ pathname: '/resultados-2026', hash: h }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
