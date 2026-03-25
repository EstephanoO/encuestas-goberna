import { MapPin } from 'lucide-react';

export function LocationConsentCard() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">¿Por qué pedimos tu ubicación?</p>
        <p className="mt-1">
          Usamos tu ubicación geográfica únicamente para mostrar el mapa de
          respuestas en el dashboard de resultados. Al enviar tu voto, se te
          pedirá permiso explícito.
        </p>
      </div>
    </div>
  );
}
