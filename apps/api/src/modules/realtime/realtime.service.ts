import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SOCKET_EVENTS } from '../../common/constants/socket-events.constants';
import type {
  VoteCreatedPayload,
  ResultsUpdatedPayload,
  MapPointCreatedPayload,
} from '@encuesta/shared-types';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitVoteCreated(payload: VoteCreatedPayload) {
    this.gateway.emit(SOCKET_EVENTS.VOTE_CREATED, payload);
  }

  emitResultsUpdated(payload: ResultsUpdatedPayload) {
    this.gateway.emit(SOCKET_EVENTS.RESULTS_UPDATED, payload);
  }

  emitMapPointCreated(payload: MapPointCreatedPayload) {
    this.gateway.emit(SOCKET_EVENTS.MAP_POINT_CREATED, payload);
  }
}
