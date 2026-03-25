const MAP_POINTS = [
  { id: 'rioja', x: 44, y: 22, value: 38, label: 'Rioja' },
  { id: 'moyobamba', x: 53, y: 33, value: 52, label: 'Moyobamba' },
  { id: 'tarapoto', x: 61, y: 49, value: 67, label: 'Tarapoto' },
  { id: 'juanjui', x: 52, y: 67, value: 29, label: 'Juanjui' },
] as const;

interface MapaEncuestaMockProps {
  activeDepartmentId: string | null;
}

export function MapaEncuestaMock({
  activeDepartmentId,
}: MapaEncuestaMockProps) {
  const isSanMartinActive = activeDepartmentId === 'san-martin';

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(2,58,90,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-goberna-gold">
            Mapa referencial
          </p>
          <h3 className="mt-2 text-2xl font-bold text-goberna-blue">
            Concentracion simulada de resultados
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Mock data
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_top,_rgba(244,194,13,0.18),_transparent_32%),linear-gradient(180deg,_#f8fbfd_0%,_#edf4f8_100%)] p-4">
        <svg
          viewBox="0 0 360 440"
          className="h-[360px] w-full"
          aria-label="Mapa mock de resultados de encuesta"
          role="img"
        >
          <defs>
            <linearGradient id="peruGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#0f4b70" />
              <stop offset="100%" stopColor="#023a5a" />
            </linearGradient>
          </defs>

          <path
            d="M136 22l56 22 39 33 39 12 32 43-4 55-31 43 8 31-33 47-10 38-54 33-29-17-49 16-13-41-30-24 5-49-26-33 12-46-8-49 30-26 11-48 55-30z"
            fill="url(#peruGradient)"
            opacity={isSanMartinActive ? 1 : 0.28}
          />

          <path
            d="M136 22l56 22 39 33 39 12 32 43-4 55-31 43 8 31-33 47-10 38-54 33-29-17-49 16-13-41-30-24 5-49-26-33 12-46-8-49 30-26 11-48 55-30z"
            fill="none"
            stroke="#f4c20d"
            strokeWidth="4"
            strokeOpacity={isSanMartinActive ? 0.88 : 0.22}
          />

          {MAP_POINTS.map((point) => (
            <g key={point.id} opacity={isSanMartinActive ? 1 : 0.2}>
              <circle
                cx={(point.x / 100) * 360}
                cy={(point.y / 100) * 440}
                r="23"
                fill="#f4c20d"
                fillOpacity="0.96"
              />
              <circle
                cx={(point.x / 100) * 360}
                cy={(point.y / 100) * 440}
                r="28"
                fill="#f4c20d"
                fillOpacity="0.18"
              />
              <text
                x={(point.x / 100) * 360}
                y={(point.y / 100) * 440 + 8}
                textAnchor="middle"
                fontFamily="Montserrat, sans-serif"
                fontSize="22"
                fontWeight="700"
                fill="#023a5a"
              >
                {point.value}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          {MAP_POINTS.map((point) => (
            <div
              key={point.id}
              className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 backdrop-blur"
            >
              <span className="block font-semibold text-goberna-blue">{point.label}</span>
              <span className="mt-1 block text-slate-500">Indice simulado: {point.value}</span>
            </div>
          ))}
        </div>

        {!isSanMartinActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/68 px-8 text-center backdrop-blur-[2px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-goberna-gold">
                Activacion pendiente
              </p>
              <p className="mt-3 max-w-sm text-base text-goberna-blue">
                Selecciona San Martin para visualizar el mapa mock con puntos y
                resultados simulados.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
