import type { Candidate } from './candidate';

export type VoteOptionType = 'candidate' | 'blank' | 'undecided';

export interface VoteOption {
  id: string;
  type: VoteOptionType;
  label: string;
  slug: string;
  candidate?: Pick<
    Candidate,
    'id' | 'fullName' | 'partyName' | 'partyLogoUrl' | 'candidatePhotoUrl'
  > & { partyColor?: string } | null;
}
