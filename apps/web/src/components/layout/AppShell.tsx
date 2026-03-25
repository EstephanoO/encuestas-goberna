import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const hideDefaultTopNav = pathname === '/' || pathname.startsWith('/resultados-region/');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!hideDefaultTopNav && <TopNav />}
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
