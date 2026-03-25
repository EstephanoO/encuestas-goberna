import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import type { VoteOption } from '@encuesta/shared-types';

interface CandidateCardProps {
  option: VoteOption;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function CandidateCard({
  option,
  selected,
  onSelect,
  disabled,
}: CandidateCardProps) {
  const candidate = option.candidate;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Votar por ${option.label}`}
      className={cn(
        'relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'hover:border-primary hover:shadow-sm',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {/* Foto candidato - izquierda */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        {candidate?.candidatePhotoUrl ? (
          <img
            src={candidate.candidatePhotoUrl}
            alt={candidate.fullName}
            className="h-14 w-14 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center bg-muted text-xl font-bold text-muted-foreground">
            {option.label.charAt(0)}
          </div>
        )}
        {/* Logo partido - debajo de la foto solo en mobile */}
        {candidate?.partyLogoUrl && (
          <img
            src={candidate.partyLogoUrl}
            alt={candidate.partyName ?? ''}
            className="h-8 w-8 object-contain sm:hidden"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Nombre + partido - centro */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">
          {candidate?.fullName ?? option.label}
        </p>
        {candidate?.partyName && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {candidate.partyName}
          </p>
        )}
      </div>

      {/* Logo partido - derecha solo en desktop */}
      {candidate?.partyLogoUrl && (
        <img
          src={candidate.partyLogoUrl}
          alt={candidate.partyName ?? ''}
          className="hidden h-10 w-10 shrink-0 object-contain sm:block"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      {selected && (
        <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-primary" />
      )}
    </button>
  );
}
