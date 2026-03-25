import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { VoteOptionsRepository } from './vote-options.repository';
import { CandidatesRepository } from '../candidates/candidates.repository';

@Injectable()
export class VoteOptionsService {
  private readonly logger = new Logger(VoteOptionsService.name);

  constructor(
    private readonly repo: VoteOptionsRepository,
    @Inject(forwardRef(() => CandidatesRepository))
    private readonly candidatesRepo: CandidatesRepository,
  ) {}

  async getActive() {
    const rows = await this.repo.findActive();

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      slug: r.slug,
      candidate: r.candidates
        ? {
            id: r.candidates.id,
            fullName: r.candidates.full_name,
            partyName: r.candidates.party_name,
            partyLogoUrl: r.candidates.party_logo_url,
            candidatePhotoUrl: r.candidates.candidate_photo_url,
          }
        : null,
    }));
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async rebuildCandidateOptions() {
    const candidates = await this.candidatesRepo.findActive();

    await this.repo.deactivateCandidateOptions();

    for (const candidate of candidates) {
      const slug = this.toSlug(candidate.fullName);
      await this.repo.upsertCandidateOption(
        candidate.id,
        candidate.fullName,
        slug,
      );
    }

    this.logger.log(
      `Rebuilt ${candidates.length} candidate vote options`,
    );
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
