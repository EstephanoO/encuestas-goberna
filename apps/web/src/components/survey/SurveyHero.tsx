export function SurveyHero() {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
        ¿A quién votarías para presidente?
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Participá en la encuesta de intención de voto para las elecciones
        presidenciales de Perú 2026. Tu ubicación se usa solo para el mapa de
        resultados.
      </p>
      <ol className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
        {['Elegí una opción', 'Aceptá compartir tu ubicación', 'Enviá tu voto'].map(
          (step, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
