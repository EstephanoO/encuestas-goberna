import { useState, useCallback } from 'react';
import { submitVote } from '@/services/api/votes';
import { hasVotedLocally } from '@/lib/fingerprint';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error' | 'already_voted';

export function useSubmitVote() {
  const [status, setStatus] = useState<SubmitStatus>(() =>
    hasVotedLocally() ? 'already_voted' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [voteId, setVoteId] = useState<string | null>(null);

  const submit = useCallback(async (voteOptionId: string) => {
    setStatus('loading');
    setError(null);

    try {
      const result = await submitVote({ voteOptionId });
      setVoteId(result.data.id);
      setStatus('success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al registrar tu voto.';
      setError(msg);
      setStatus('error');
    }
  }, []);

  return {
    submit,
    status,
    error,
    voteId,
    reset: () => {
      setStatus('idle');
      setError(null);
      setVoteId(null);
    },
  };
}
