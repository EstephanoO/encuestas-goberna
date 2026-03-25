import { Phone, Mail, Globe, MapPin } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaWhatsapp,
} from "react-icons/fa6";

const FONT = "'Montserrat', sans-serif";

interface Country {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  web: string;
  address: string;
}

const COUNTRIES: Country[] = [
  {
    id: "us",
    code: "us",
    name: "Estados Unidos",
    phone: "(+1) 786 4141971",
    email: "informes@goberna.us",
    web: "goberna.us",
    address:
      "1900 N Bayshore Dr\nSuite 1A #136-2023\nMiami, Florida, 33132\nUnited States",
  },
  {
    id: "mx",
    code: "mx",
    name: "Mexico",
    phone: "(+52) 156 1056 6612",
    email: "mexico@grupogoberna.com",
    web: "grupogoberna.com",
    address: "Rio Tiber 100 col. Cuauhtemoc\nPiso 6 - Ciudad de Mexico",
  },
  {
    id: "pe",
    code: "pe",
    name: "Peru",
    phone: "(+51) 961753189",
    email: "informes@goberna.pe",
    web: "grupogoberna.com",
    address:
      "Jr. Cruz del Sur 140 Of. 1712\nSurco Edif. Time Surco |\nMarcan - Lima",
  },
  {
    id: "ec",
    code: "ec",
    name: "Ecuador",
    phone: "(+593) 99 207 3457",
    email: "infoecuador@goberna.pe",
    web: "grupogoberna.com",
    address:
      "Edificio The Point, Of. 2307,\nCiudad del Rio, Puerto Santa\nAna - Guayaquil",
  },
  {
    id: "bo",
    code: "bo",
    name: "Bolivia",
    phone: "(+591) 78814740",
    email: "mfernandez@grupogoberna.com",
    web: "grupogoberna.com",
    address: "Av. Beni Edificio Top Center,\nPiso 7 Of. 7C - Santa Cruz",
  },
  {
    id: "br",
    code: "br",
    name: "Brasil",
    phone: "55 21 98126-9882",
    email: "brasil@grupogoberna.com",
    web: "grupogoberna.com",
    address: "Praia de Botafogo, 360 - 520 c -\nBotafogo, Rio de Janeiro",
  },
];

const SOCIALS = [
  {
    id: "facebook",
    href: "https://www.facebook.com/gobernacorp/",
    label: "Facebook",
    Icon: FaFacebookF,
  },
  {
    id: "instagram",
    href: "https://www.instagram.com/gobernacorp",
    label: "Instagram",
    Icon: FaInstagram,
  },
  { id: "x", href: "https://twitter.com/GobernaConsult", label: "X", Icon: FaXTwitter },
  {
    id: "whatsapp",
    href: "https://wa.me/51986855496",
    label: "WhatsApp",
    Icon: FaWhatsapp,
  },
];

function countryFlag(code: string): string {
  const flags: Record<string, string> = {
    us: "\u{1F1FA}\u{1F1F8}",
    mx: "\u{1F1F2}\u{1F1FD}",
    pe: "\u{1F1F5}\u{1F1EA}",
    ec: "\u{1F1EA}\u{1F1E8}",
    bo: "\u{1F1E7}\u{1F1F4}",
    br: "\u{1F1E7}\u{1F1F7}",
  };
  return flags[code] ?? "";
}

function CountryBlock({ country }: { country: Country }) {
  return (
    <article
      className="flex w-full flex-col gap-3.5"
      style={{ fontFamily: FONT }}
    >
      <header className="flex items-start gap-2.5">
        <span className="mt-0.5 text-base">{countryFlag(country.code)}</span>
        <h3
          className="m-0 text-xl leading-tight text-white"
          style={{ fontWeight: 600 }}
        >
          {country.name}
        </h3>
      </header>
      <ul className="flex list-none flex-col gap-2 p-0">
        <li
          className="flex items-start gap-2 text-[13px] leading-snug text-white"
          style={{ fontWeight: 400 }}
        >
          <Phone
            size={14}
            strokeWidth={2.2}
            className="mt-0.5 shrink-0 text-[#ffc502]"
          />
          <span>{country.phone}</span>
        </li>
        <li
          className="flex items-start gap-2 text-[13px] leading-snug text-white"
          style={{ fontWeight: 400 }}
        >
          <Mail
            size={14}
            strokeWidth={2.2}
            className="mt-0.5 shrink-0 text-[#ffc502]"
          />
          <span>{country.email}</span>
        </li>
        <li
          className="flex items-start gap-2 text-[13px] leading-snug text-white"
          style={{ fontWeight: 400 }}
        >
          <Globe
            size={14}
            strokeWidth={2.2}
            className="mt-0.5 shrink-0 text-[#ffc502]"
          />
          <span>{country.web}</span>
        </li>
        <li
          className="flex max-w-[32ch] items-start gap-2 text-[13px] leading-snug text-white"
          style={{ fontWeight: 400 }}
        >
          <MapPin
            size={14}
            strokeWidth={2.2}
            className="mt-0.5 shrink-0 text-[#ffc502]"
          />
          <span className="whitespace-pre-line">{country.address}</span>
        </li>
      </ul>
    </article>
  );
}

export function Footer() {
  return (
    <footer className="text-white" style={{ fontFamily: FONT }}>
      <div className="flex flex-col gap-24 overflow-hidden bg-black px-4 pb-10 pt-24 sm:px-[90px] sm:pt-[120px]">
        {/* Top section */}
        <section className="grid items-center gap-14 lg:grid-cols-[minmax(300px,0.9fr)_minmax(620px,1.1fr)] lg:gap-[72px]">
          {/* Brand column */}
          <div className="grid min-h-0 place-items-center gap-6 lg:min-h-[380px]">
            <img
              src="/escudo-goberna.webp"
              alt="Goberna Escuela de Gobierno"
              width={150}
              height={155}
              className="block h-auto w-full max-w-[240px] object-contain"
              loading="lazy"
              decoding="async"
            />
            <p
              className="m-0 max-w-[30ch] text-center text-[15px] leading-snug text-white"
              style={{ fontWeight: 400 }}
            >
              Estudia en Goberna y lleva tu carrera politica al siguiente nivel.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="https://grupogoberna.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white bg-transparent px-5 py-2.5 text-sm text-white no-underline"
                style={{ fontWeight: 600 }}
              >
                Visitar Goberna
              </a>
            </div>
          </div>

          {/* Countries grid */}
          <div className="grid grid-cols-1 gap-x-[60px] gap-y-[30px] sm:grid-cols-2 xl:grid-cols-3 xl:gap-y-[45px]">
            {COUNTRIES.map((country) => (
              <CountryBlock key={country.id} country={country} />
            ))}
          </div>
        </section>

        {/* Bottom section */}
        <section className="relative min-h-0 border-t border-white/[0.12] pt-[18px] sm:min-h-[250px]">
          {/* Background word — GOBERNA in ExtraBold (800) */}
          <p
            className="pointer-events-none m-0 select-none text-left text-[clamp(42px,14vw,68px)] uppercase leading-[0.92] tracking-wide opacity-[0.30] sm:absolute sm:inset-x-0 sm:-bottom-2.5 sm:text-center sm:text-[clamp(130px,16vw,286px)] sm:leading-[0.74]"
            aria-hidden="true"
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              letterSpacing: "0.02em",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.5) 15%, rgba(255,255,255,0.2) 52%, rgba(255,255,255,0.05) 74%, rgba(255,255,255,0) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            GOBERNA
          </p>

          <div className="relative z-[2] mt-4 flex flex-col items-start gap-6 sm:absolute sm:inset-x-0 sm:bottom-[18px] sm:mt-0 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <p
              className="m-0 max-w-[66ch] text-xs leading-relaxed text-white"
              style={{ fontWeight: 400 }}
            >
              Pagado por &ldquo;Grupo Goberna&rdquo; &copy; Todos los derechos
              reservados
              <br />
              Mexico | Peru | Ecuador | Bolivia | Colombia | Republica
              Dominicana | Chile | Panama | Costa Rica | Guatemala | Honduras |
              El Salvador | Uruguay
            </p>

            <div className="flex flex-col items-start gap-4 sm:items-end">
              <nav
                className="inline-flex flex-wrap items-center gap-2.5 sm:gap-[18px]"
                aria-label="Enlaces legales"
              >
                <a
                  href="https://grupogoberna.com"
                  className="text-[13px] text-white no-underline"
                  style={{ fontWeight: 400 }}
                >
                  Politica de Privacidad
                </a>
                <a
                  href="https://grupogoberna.com"
                  className="text-[13px] text-white no-underline"
                  style={{ fontWeight: 400 }}
                >
                  Terminos y condiciones
                </a>
              </nav>

              <nav
                className="inline-flex items-center gap-3.5"
                aria-label="Redes sociales"
              >
                {SOCIALS.map(({ id, href, label, Icon }) => (
                  <a
                    key={id}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-white"
                  >
                    <Icon size={19} />
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </section>
      </div>
    </footer>
  );
}
