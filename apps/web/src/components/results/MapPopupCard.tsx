import { formatRelativeTime } from '@/lib/formatting';

interface MapPopupCardProps {
  label: string;
  createdAt: string;
}

export function MapPopupCard({ label, createdAt }: MapPopupCardProps) {
  return (
    <div className="min-w-[140px] rounded-md bg-white p-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatRelativeTime(createdAt)}
      </p>
    </div>
  );
}
