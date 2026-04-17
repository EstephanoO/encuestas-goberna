import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Vote, BarChart2, Users, Activity } from 'lucide-react';

interface NavItem {
  hash: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  live?: boolean;
}

const NAV: NavItem[] = [
  { hash: '',           label: 'Presidencial',  icon: BarChart2 },
  { hash: '#senado',    label: 'Senado',        icon: Vote },
  { hash: '#diputados', label: 'Diputados',     icon: Users },
  { hash: '#actas',     label: 'Pulso en Vivo', icon: Activity, live: true },
];

export function TopNav() {
  const { pathname, hash } = useLocation();
  const onDashboard = pathname.startsWith('/resultados-2026');

  return (
    <header className="sticky top-0 z-50 bg-background/95 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_12px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/escudo-goberna.webp"
            alt="Goberna"
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="text-base font-bold text-foreground" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.3 }}>
            MAPA DE PODER ELECTORAL PERÚ
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ hash: h, label, icon: Icon, live }) => {
            const active = onDashboard && (hash || '') === (h || '');
            return (
              <Link
                key={label}
                to={{ pathname: '/resultados-2026', hash: h }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? live
                      ? 'bg-red-600 text-white'
                      : 'bg-primary text-primary-foreground'
                    : live
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                {live && (
                  <span className={cn(
                    'relative flex h-1.5 w-1.5 ml-0.5',
                  )}>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
