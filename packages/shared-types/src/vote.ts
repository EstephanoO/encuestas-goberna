export interface CreateVoteRequest {
  voteOptionId: string;
}

export interface CreateVoteResponse {
  ok: boolean;
  data: {
    id: string;
    createdAt: string;
  };
}
