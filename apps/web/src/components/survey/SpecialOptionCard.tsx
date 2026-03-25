import { cn } from '@/lib/utils';
import { CheckCircle2, CircleSlash, HelpCircle } from 'lucide-react';
import type { VoteOption } from '@encuesta/shared-types';

interface SpecialOptionCardProps {
  option: VoteOption;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const icons = {
  blank: CircleSlash,
  undecided: HelpCircle,
  candidate: CheckCircle2,
};

export function SpecialOptionCard({
  option,
  selected,
  onSelect,
  disabled,
}: SpecialOptionCardProps) {
  const Icon = icons[option.type] ?? HelpCircle;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={option.label}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'hover:border-primary hover:shadow-sm',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {selected && (
        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
      )}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-medium text-foreground">{option.label}</span>
    </button>
  );
}
