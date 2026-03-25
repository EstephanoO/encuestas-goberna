export interface ResultsSummary {
  totalVotes: number;
  leader: {
    label: string;
    totalVotes: number;
    percentage: number;
  } | null;
  updatedAt: string;
}

export interface ResultsBarItem {
  voteOptionId: string;
  label: string;
  totalVotes: number;
  percentage: number;
}

export interface RecentResponse {
  id: string;
  label: string;
  createdAt: string;
}

export interface ResultsSnapshot {
  summary: ResultsSummary;
  bars: ResultsBarItem[];
  mapPoints: MapPoint[];
  recent: RecentResponse[];
}

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  createdAt: string;
}
