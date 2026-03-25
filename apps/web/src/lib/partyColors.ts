import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';

const FALLBACK = '#64748b';

const colorByLabel: Record<string, string> = Object.fromEntries(
  STATIC_VOTE_OPTIONS
    .filter((o) => o.candidate?.partyColor)
    .map((o) => [o.label, o.candidate!.partyColor!]),
);

const colorById: Record<string, string> = Object.fromEntries(
  STATIC_VOTE_OPTIONS
    .filter((o) => o.candidate?.partyColor)
    .map((o) => [o.id, o.candidate!.partyColor!]),
);

export function getPartyColorByLabel(label: string): string {
  return colorByLabel[label] ?? FALLBACK;
}

export function getPartyColorById(id: string): string {
  return colorById[id] ?? FALLBACK;
}
