import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';

export default function NotFoundPage() {
  return (
    <PageContainer className="flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-2 text-xl font-semibold text-foreground">
        Página no encontrada
      </p>
      <p className="mt-1 text-muted-foreground">
        La página que buscás no existe.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </PageContainer>
  );
}
