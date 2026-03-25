import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { CandidateCard } from './CandidateCard';
import { SpecialOptionCard } from './SpecialOptionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { VoteOption } from '@encuesta/shared-types';

interface CandidateGridProps {
  options: VoteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function CandidateGrid({
  options,
  selectedId,
  onSelect,
  disabled,
  loading,
}: CandidateGridProps) {
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  const allCandidates = options.filter((o) => o.type === 'candidate');
  const specials = options.filter((o) => o.type !== 'candidate');

  const query = normalize(search.trim());
  const candidates = query
    ? allCandidates.filter((o) => {
        const name = normalize(o.candidate?.fullName ?? o.label);
        const party = normalize(o.candidate?.partyName ?? '');
        return name.includes(query) || party.includes(query);
      })
    : allCandidates;

  return (
    <div className="space-y-6">
      {allCandidates.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Candidatos
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por candidato o partido..."
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {candidates.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {candidates.map((option) => (
                <CandidateCard
                  key={option.id}
                  option={option}
                  selected={selectedId === option.id}
                  onSelect={onSelect}
                  disabled={disabled}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron candidatos para "{search}"
            </p>
          )}
        </section>
      )}

      {specials.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Otras opciones
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {specials.map((option) => (
              <SpecialOptionCard
                key={option.id}
                option={option}
                selected={selectedId === option.id}
                onSelect={onSelect}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
