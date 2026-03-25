import type {
  MapPoint,
  RecentResponse,
  ResultsBarItem,
  ResultsSummary,
} from '@encuesta/shared-types';

interface RealtimeState {
  summary: ResultsSummary | null;
  bars: ResultsBarItem[];
  mapPoints: MapPoint[];
  recent: RecentResponse[];
  lastUpdatedAt: string | null;
  connected: boolean;
}

interface RealtimeInitialState {
  summary: ResultsSummary;
  bars: ResultsBarItem[];
  mapPoints: MapPoint[];
  recent: RecentResponse[];
}

export function useRealtimeResults(
  initial?: RealtimeInitialState,
): RealtimeState {
  return {
    summary: initial?.summary ?? null,
    bars: initial?.bars ?? [],
    mapPoints: initial?.mapPoints ?? [],
    recent: initial?.recent ?? [],
    lastUpdatedAt: initial?.summary?.updatedAt ?? null,
    connected: true,
  };
}
