import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { NavbarHeroReplica } from '@/components/home/NavbarHeroReplica';
import { hasVotedLocally } from '@/lib/fingerprint';
import { Vote, BarChart2 } from 'lucide-react';

const EncuestaResultadosSection = lazy(
  () => import('@/components/home/EncuestaResultadosSection').then((m) => ({ default: m.EncuestaResultadosSection })),
);

function EncuestaCTA() {
  const alreadyVoted = hasVotedLocally();

  return (
    <section
      id="encuesta-votar"
      className="relative overflow-hidden py-20"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Background image with blur */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center blur-[6px]"
        style={{
          backgroundImage:
            "url('/cta-bg.webp')",
        }}
      />
      {/* Dark blue overlay */}
      <div className="absolute inset-0 bg-[#023a5a]/90" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#f4c20d]">
          Encuesta presidencial 2026
        </p>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {alreadyVoted
            ? 'Ya registraste tu voto'
            : '¿Quieres votar en la encuesta presidencial?'}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
          {alreadyVoted
            ? 'Gracias por participar. Puedes ver los resultados en tiempo real.'
            : 'Participa en la encuesta de intencion de voto y conoce los resultados en tiempo real.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {!alreadyVoted && (
            <Link
              to="/votar"
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-md bg-[#f4c20d] px-8 py-4 text-base font-semibold text-[#023a5a] transition-transform hover:-translate-y-0.5"
            >
              <Vote className="h-5 w-5" />
              Votar ahora
            </Link>
          )}
          <Link
            to="/resultados"
            className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-md border border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            <BarChart2 className="h-5 w-5" />
            Ver resultados
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <NavbarHeroReplica />
      <Suspense fallback={<div className="h-[600px] bg-white" />}>
        <EncuestaResultadosSection />
      </Suspense>
      <EncuestaCTA />
    </>
  );
}
