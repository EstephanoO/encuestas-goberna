import { ArrowLeft } from 'lucide-react';

type RegionHeroProps = {
  departmentId: string;
  departmentLabel: string;
};

const HERO_COPY: Record<string, { image: string; kicker: string; title: string; description: string }> = {
  'san-martin': {
    image: '/sanmartin.webp',
    kicker: 'Resultados regionales 2026',
    title: 'Pulso electoral de San Martin',
    description:
      'Explora el mapa provincial, los liderazgos por territorio y la distribucion del voto en tiempo real.',
  },
  ancash: {
    image: '/ancash.webp',
    kicker: 'Resultados regionales 2026',
    title: 'Mapa politico de Ancash',
    description:
      'Consulta como se reparte la fuerza electoral por provincia y detecta bastiones, disputas y tendencias.',
  },
};

const NAV_ITEMS = [
  { label: 'Inicio', href: '/' },
  { label: 'Encuestas', href: '/#resultados-encuestas' },
  { label: 'Votar', href: '/#encuesta-votar' },
  { label: 'Contactanos', href: '/#contacto' },
] as const;

export function RegionHero({ departmentId, departmentLabel }: RegionHeroProps) {
  const hero = HERO_COPY[departmentId] ?? {
    image: '/hero-bg.webp',
    kicker: 'Resultados regionales 2026',
    title: departmentLabel,
    description: 'Consulta el comportamiento electoral por provincia y por cargo.',
  };

  return (
    <section className="bg-white text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8 lg:px-10">
          <a href="/" className="inline-flex items-center">
            <img
              src="/goberna-logo.webp"
              alt="Instituto Goberna"
              width={152}
              height={38}
              className="h-auto w-[152px]"
            />
          </a>

          <nav aria-label="Principal" className="hidden items-center gap-x-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md px-4 py-2.5 text-[15px] font-normal text-goberna-blue transition-colors hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div
        className="relative isolate overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(3, 16, 24, 0.82), rgba(17, 62, 90, 0.58)), url(${hero.image})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="mx-auto flex min-h-[360px] max-w-7xl items-end px-5 py-14 md:px-8 lg:min-h-[420px] lg:px-10 lg:py-16">
          <div className="max-w-3xl text-white">
            <a
              href="/#resultados-encuestas"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a encuestas
            </a>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-goberna-gold">
              {hero.kicker}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[0.96] tracking-[-0.03em] sm:text-5xl lg:text-[4.5rem]">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              {hero.description}
            </p>
            <p className="mt-6 text-sm font-medium text-white/80">
              Departamento analizado: <span className="font-semibold text-white">{departmentLabel}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
