import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Encuestas', href: '#resultados-encuestas' },
  { label: 'Votar', href: '#encuesta-votar' },
  { label: 'Contáctanos', href: '#contacto' },
] as const;

const GOBERNA_LOGO_URL = '/goberna-logo.webp';

const GOBERNA_HERO_IMAGE_URL = '/hero-bg.webp';

function scrollToFooter(e: React.MouseEvent) {
  e.preventDefault();
  const footer = document.querySelector('footer');
  footer?.scrollIntoView({ behavior: 'smooth' });
}

export function NavbarHeroReplica() {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (href === '#contacto') {
      scrollToFooter(e);
    } else if (href === '#encuesta-votar') {
      e.preventDefault();
      document.getElementById('encuesta-votar')?.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  }

  return (
    <section id="inicio" className="bg-white text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8 lg:px-10">
          <a href="#inicio" className="inline-flex items-center">
            <img
              src={GOBERNA_LOGO_URL}
              alt="Instituto Goberna"
              width={152}
              height={38}
              fetchPriority="high"
              className="h-auto w-[152px]"
            />
          </a>

          {/* Desktop nav */}
          <nav aria-label="Principal" className="hidden items-center gap-x-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                className="rounded-md px-4 py-2.5 text-[15px] font-normal text-goberna-blue transition-colors hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Hamburger button */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="inline-flex items-center justify-center rounded-md p-2 text-goberna-blue transition-colors hover:bg-slate-100 md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        <nav
          className={cn(
            'overflow-hidden border-t border-slate-200/80 transition-all duration-200 md:hidden',
            menuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 border-t-0',
          )}
        >
          <div className="flex flex-col gap-1 px-5 py-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                className="rounded-md px-4 py-3 text-[15px] font-medium text-goberna-blue transition-colors hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <div
        className="relative isolate min-h-[580px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(3, 16, 24, 0.66), rgba(17, 62, 90, 0.45)), url(${GOBERNA_HERO_IMAGE_URL})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="mx-auto flex min-h-[580px] max-w-7xl items-center px-5 py-14 md:px-8 lg:px-10">
          <div className="max-w-[480px] text-white">
            <h1 className="text-4xl font-bold leading-[0.96] tracking-[-0.03em] sm:text-5xl lg:text-[4.5rem]">
              Instituto especializado en estudios de opinión pública
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#encuesta-votar"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('encuesta-votar')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex rounded-md bg-goberna-gold px-5 py-2.5 text-[15px] font-semibold text-goberna-blue transition-transform hover:-translate-y-0.5"
              >
                Votar en la encuesta
              </a>
              <a
                href="#contacto"
                onClick={scrollToFooter}
                className="inline-flex rounded-md border border-white/30 px-5 py-2.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Contáctanos
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
