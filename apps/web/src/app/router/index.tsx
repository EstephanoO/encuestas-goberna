import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { LoaderPage } from '@/components/ui/Loader';
import { AppShell } from '@/components/layout/AppShell';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const HomePage = lazy(() => import('@/pages/home/HomePage'));
const VotePage = lazy(() => import('@/pages/vote/VotePage'));
const ResultsPage = lazy(() => import('@/pages/results/ResultsPage'));
const RegionResultsPage = lazy(() => import('@/pages/results/RegionResultsPage'));
const Resultados2026Page = lazy(() => import('@/pages/resultados-2026/Resultados2026Page'));
const LabPage = lazy(() => import('@/pages/lab/LabPage'));
const ActasJeePage = lazy(() => import('@/pages/actas-jee/ActasJeePage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

export function AppRouter() {
  return (
    <AppShell>
      <ScrollToTop />
      <Suspense fallback={<LoaderPage />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/votar" element={<VotePage />} />
          <Route path="/resultados" element={<ResultsPage />} />
          <Route path="/resultados-region/:departmentId" element={<RegionResultsPage />} />
          <Route path="/resultados-2026" element={<Resultados2026Page />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/actas-jee" element={<ActasJeePage />} />
          {/* Aliases directos */}
          <Route path="/pulso" element={<Navigate to="/resultados-2026#actas" replace />} />
          <Route path="/pulso-en-vivo" element={<Navigate to="/resultados-2026#actas" replace />} />
          <Route path="/senado" element={<Navigate to="/resultados-2026#senado" replace />} />
          <Route path="/diputados" element={<Navigate to="/resultados-2026#diputados" replace />} />
          <Route path="/presidencial" element={<Navigate to="/resultados-2026" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
