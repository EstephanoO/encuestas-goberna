export class CandidateResponseDto {
  id: string;
  fullName: string;
  partyName: string;
  partyLogoUrl: string | null;
  candidatePhotoUrl: string | null;
  sourceUrl: string;
  sortOrder: number | null;
  isActive: boolean;
  lastSyncedAt: string | null;
}
