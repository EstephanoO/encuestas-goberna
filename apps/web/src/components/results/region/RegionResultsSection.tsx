import { Star } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DEPARTMENT_RANKINGS } from '@/data/surveyResults';
import type { CandidateRanking } from '@/data/surveyResults';

interface RegionResultsSectionProps {
  departmentId: string;
}

/** Cargo IDs that have ranking data (diputados, senadores) */
const CARGO_CONFIG = [
  { id: 'senadores', label: 'Encuesta Senadores' },
  { id: 'diputados', label: 'Encuesta Diputados' },
] as const;

/**
 * RegionResultsSection
 *
 * Displays candidate rankings per cargo using the Radix Accordion.
 * Mirrors the style of ResultadosCargo from the home page.
 */
export function RegionResultsSection({ departmentId }: RegionResultsSectionProps) {
  const cargoEntries = CARGO_CONFIG.map((cargo) => ({
    ...cargo,
    candidates: DEPARTMENT_RANKINGS[cargo.id]?.[departmentId] ?? [],
  })).filter((entry) => entry.candidates.length > 0);

  if (cargoEntries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">
        Rankings por cargo
      </h2>

      <Accordion type="single" collapsible defaultValue={cargoEntries[0]?.id}>
        {cargoEntries.map((cargo) => {
          const preview = cargo.candidates.slice(0, 3);

          return (
            <AccordionItem
              key={cargo.id}
              value={cargo.id}
              className="rounded-2xl border border-border bg-card shadow-sm mb-3 last:mb-0"
            >
              <AccordionTrigger className="px-4 py-4 hover:no-underline">
                <span className="flex items-center gap-3">
                  {/* Avatar stack preview */}
                  <span className="flex -space-x-2">
                    {preview.map((c, i) => (
                      <Avatar
                        key={c.name}
                        className="h-8 w-8 ring-2 ring-background"
                        style={{ zIndex: preview.length - i }}
                      >
                        {c.photoUrl && <AvatarImage src={c.photoUrl} alt={c.name} />}
                        <AvatarFallback
                          className="text-[10px] font-bold text-white"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {cargo.label}
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 border-t border-border pt-3">
                  {cargo.candidates.map((candidate, index) => (
                    <CandidateRow
                      key={candidate.name}
                      candidate={candidate}
                      position={index}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

/** Single candidate row — matches ResultadosCargo style */
function CandidateRow({
  candidate,
  position,
}: {
  candidate: CandidateRanking;
  position: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 p-3">
      {/* Position badge */}
      {position === 0 ? (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm"
          role="img"
          aria-label="Primer puesto"
        >
          <Star className="h-3.5 w-3.5 fill-white stroke-none" />
        </div>
      ) : (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: candidate.color }}
        >
          {position + 1}
        </span>
      )}

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background">
        {candidate.photoUrl && (
          <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
        )}
        <AvatarFallback
          className="text-xs font-semibold text-white"
          style={{ backgroundColor: candidate.color }}
        >
          {candidate.name[0]}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {candidate.name}
          </p>
          <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
            {candidate.percentage}%
          </span>
        </div>
        {candidate.party && (
          <p className="truncate text-xs text-muted-foreground">
            {candidate.party}
          </p>
        )}
        {/* Progress bar */}
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={candidate.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${candidate.name}: ${candidate.percentage}%`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${candidate.percentage}%`,
              backgroundColor: candidate.color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
