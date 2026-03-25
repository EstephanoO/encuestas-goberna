import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitVoteButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export function SubmitVoteButton({
  disabled,
  loading,
  onClick,
}: SubmitVoteButtonProps) {
  return (
    <div className="sticky bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled || loading
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Enviar mi voto
            </>
          )}
        </button>
      </div>
    </div>
  );
}
