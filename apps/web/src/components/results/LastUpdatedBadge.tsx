import { RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatting';
import { cn } from '@/lib/utils';

interface LastUpdatedBadgeProps {
  updatedAt: string | null;
  connected: boolean;
}

export function LastUpdatedBadge({ updatedAt, connected }: LastUpdatedBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          connected ? 'bg-green-500' : 'bg-muted-foreground',
        )}
      />
      <span className="text-xs text-muted-foreground">
        {connected ? 'En vivo' : 'Desconectado'}
        {updatedAt && ` · ${formatRelativeTime(updatedAt)}`}
      </span>
      {connected && (
        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
