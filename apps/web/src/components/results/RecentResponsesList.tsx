import { formatRelativeTime } from '@/lib/formatting';
import type { RecentResponse } from '@encuesta/shared-types';

interface RecentResponsesListProps {
  items: RecentResponse[];
}

export function RecentResponsesList({ items }: RecentResponsesListProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Votos recientes
      </h3>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
