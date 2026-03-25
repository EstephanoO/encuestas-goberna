interface FichaTecnicaDownloadProps {
  departmentLabel: string;
  requested: boolean;
  onDownload: () => void;
}

export function FichaTecnicaDownload({
  departmentLabel,
  requested,
  onDownload,
}: FichaTecnicaDownloadProps) {
  return (
    <div className="rounded-3xl border border-goberna-gold/40 bg-goberna-blue px-6 py-6 text-white shadow-lg shadow-slate-200/50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-goberna-gold">
            Ficha tecnica
          </p>
          <h3 className="mt-2 text-2xl font-bold">
            Descarga preparada para {departmentLabel}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            La estructura ya esta lista para conectar la descarga real de la ficha
            tecnica apenas compartas el archivo definitivo.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex min-w-[220px] items-center justify-center rounded-md bg-goberna-gold px-6 py-3 text-sm font-semibold text-goberna-blue transition-transform hover:-translate-y-0.5"
        >
          Descargar ficha tecnica
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-200">
        {requested
          ? 'Handler ejecutado: listo para enlazar el archivo real cuando lo tengas.'
          : 'Aun sin archivo conectado. El boton ya dispara el handler de integracion.'}
      </p>
    </div>
  );
}
