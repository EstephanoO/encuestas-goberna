import { MapPin } from 'lucide-react';

interface RegionHeaderProps {
  departmentLabel: string;
}

/**
 * RegionHeader
 *
 * Simple department name + source metadata.
 * Uses the same design tokens as the rest of the app.
 */
export function RegionHeader({ departmentLabel }: RegionHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MapPin className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {departmentLabel}
        </h1>
        <p className="text-xs text-muted-foreground">
          Fuente: Instituto Goberna &mdash; Encuesta 2026
        </p>
      </div>
    </div>
  );
}
