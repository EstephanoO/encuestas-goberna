import { AlertCircle, RotateCcw } from 'lucide-react';

interface VoteErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function VoteErrorState({ message, onRetry }: VoteErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-semibold text-foreground">No pudimos registrar tu voto</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <RotateCcw className="h-4 w-4" />
        Intentar nuevamente
      </button>
    </div>
  );
}
