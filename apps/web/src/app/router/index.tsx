import { Routes, Route, useLocation } from 'react-router-dom';
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
