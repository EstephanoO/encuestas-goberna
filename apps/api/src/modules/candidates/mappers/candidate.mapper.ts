import type { ScrapedCandidate } from '../scrapers/jne-candidates.scraper';

export interface CandidateRow {
  id: string;
  external_source: string;
  external_id: string | null;
  full_name: string;
  party_name: string;
  party_logo_url: string | null;
  candidate_photo_url: string | null;
  source_url: string;
  source_hash: string | null;
  sort_order: number | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function scrapedToUpsertPayload(
  candidate: ScrapedCandidate,
  existingId?: string,
) {
  const now = new Date().toISOString();
  return {
    ...(existingId ? { id: existingId } : {}),
    external_source: 'jne',
    external_id: candidate.externalId,
    full_name: candidate.fullName,
    party_name: candidate.partyName,
    party_logo_url: candidate.partyLogoUrl,
    candidate_photo_url: candidate.candidatePhotoUrl,
    source_url: candidate.sourceUrl,
    sort_order: candidate.sortOrder,
    is_active: true,
    last_synced_at: now,
    updated_at: now,
  };
}

export function rowToDto(row: CandidateRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    partyName: row.party_name,
    partyLogoUrl: row.party_logo_url,
    candidatePhotoUrl: row.candidate_photo_url,
    sourceUrl: row.source_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    lastSyncedAt: row.last_synced_at,
  };
}
