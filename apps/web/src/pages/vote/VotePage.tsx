import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { SurveyHero } from '@/components/survey/SurveyHero';
import { CandidateGrid } from '@/components/survey/CandidateGrid';
import { SubmitVoteButton } from '@/components/survey/SubmitVoteButton';
import { VoteSuccessState } from '@/components/survey/VoteSuccessState';
import { VoteErrorState } from '@/components/survey/VoteErrorState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useVoteOptions } from '@/hooks/useVoteOptions';
import { useSubmitVote } from '@/hooks/useSubmitVote';
import { hasVotedLocally } from '@/lib/fingerprint';

export default function VotePage() {
  const { data: options = [], isLoading, isError, refetch } = useVoteOptions();
  const { submit, status, error, reset } = useSubmitVote();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (hasVotedLocally() && status !== 'success') {
    return <Navigate to="/resultados" replace />;
  }

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    submit(selectedId);
  };

  if (status === 'success' || status === 'already_voted') {
    return (
      <PageContainer>
        <VoteSuccessState />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <ErrorState
          message="No pudimos cargar las opciones de votacion. Verifica tu conexion."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer>
        <SurveyHero />

        <div className="space-y-6 pb-24">
          <CandidateGrid
            options={options}
            selectedId={selectedId}
            onSelect={handleSelect}
            disabled={status === 'loading'}
            loading={isLoading}
          />

          {status === 'error' && error && (
            <VoteErrorState message={error} onRetry={reset} />
          )}
        </div>
      </PageContainer>

      <SubmitVoteButton
        disabled={!selectedId}
        loading={status === 'loading'}
        onClick={handleSubmit}
      />
    </>
  );
}
