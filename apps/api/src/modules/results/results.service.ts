import { Injectable, Logger } from '@nestjs/common';
import { ResultsRepository } from './results.repository';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(private readonly repo: ResultsRepository) {}

  async incrementAggregate(voteOptionId: string) {
    await this.repo.incrementAggregate(voteOptionId);
  }

  async getSummary() {
    const [aggregates, totalVotes] = await Promise.all([
      this.repo.getAggregates(),
      this.repo.getTotalVotes(),
    ]);

    const leader =
      aggregates.length > 0
        ? {
            label: aggregates[0].vote_options.label,
            totalVotes: aggregates[0].total_votes,
            percentage: aggregates[0].percentage,
          }
        : null;

    return {
      totalVotes,
      leader,
      updatedAt: new Date().toISOString(),
    };
  }

  async getBars() {
    const aggregates = await this.repo.getAggregates();
    return aggregates.map((r) => ({
      voteOptionId: r.vote_option_id,
      label: r.vote_options.label,
      totalVotes: r.total_votes,
      percentage: r.percentage,
    }));
  }

  async getMapPoints() {
    const points = await this.repo.getMapPoints();
    return points.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      label: p.vote_options?.label ?? 'Desconocido',
      createdAt: p.created_at,
    }));
  }

  async getRecent() {
    const recent = await this.repo.getRecent();
    return recent.map((r) => ({
      id: r.id,
      label: r.vote_options?.label ?? 'Desconocido',
      createdAt: r.created_at,
    }));
  }

  async getSnapshot() {
    const [summary, bars, mapPoints, recent] = await Promise.all([
      this.getSummary(),
      this.getBars(),
      this.getMapPoints(),
      this.getRecent(),
    ]);

    return { summary, bars, mapPoints, recent };
  }
}
