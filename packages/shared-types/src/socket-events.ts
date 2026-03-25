import type { ResultsBarItem, ResultsSummary, MapPoint } from './result';

export const SOCKET_EVENTS = {
  VOTE_CREATED: 'vote.created',
  RESULTS_UPDATED: 'results.updated',
  MAP_POINT_CREATED: 'map.point.created',
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface VoteCreatedPayload {
  responseId: string;
  voteOptionId: string;
  createdAt: string;
}

export interface ResultsUpdatedPayload {
  totalVotes: number;
  bars: ResultsBarItem[];
  leader: ResultsSummary['leader'];
  updatedAt: string;
}

export interface MapPointCreatedPayload extends MapPoint {}
