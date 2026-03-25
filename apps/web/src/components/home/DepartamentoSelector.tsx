import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MapPin, ChevronRight, Download } from 'lucide-react';

const VISIBLE_COUNT = 9;

interface DepartamentoItem {
  id: string;
  label: string;
  enabled: boolean;
}

interface DepartamentoSelectorProps {
  items: DepartamentoItem[];
  selectedId: string | null;
  onSelect: (id: string, enabled: boolean) => void;
  onHover?: (id: string | null) => void;
}

export function DepartamentoSelector({
  items,
  selectedId,
  onSelect,
  onHover,
}: DepartamentoSelectorProps) {
  return (
    <ul
      className="divide-y divide-slate-100 xl:max-h-[520px] xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden"

    >
      {items.map((item, index) => {
        const isSelected = selectedId === item.id;

        const inner = (
          <>
            <MapPin
              className={cn(
                'h-4 w-4 shrink-0',
                isSelected ? 'text-goberna-gold' : 'text-slate-400 group-hover:text-goberna-gold',
              )}
            />
            <span
              className={cn(
                'flex-1 font-semibold text-goberna-blue',
                isSelected && 'text-goberna-gold',
                !item.enabled && 'opacity-50',
              )}
            >
              {item.label}
            </span>
            {!item.enabled && (
              <span className="text-xs text-slate-400">Pronto</span>
            )}
            {item.enabled && (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-goberna-blue" />
            )}
          </>
        );

        return (
          <li
            key={item.id}
            onMouseEnter={() => onHover?.(item.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'group relative',
              index >= VISIBLE_COUNT && 'hidden xl:flex',
            )}
          >
            {item.enabled ? (
              <Link
                to={`/resultados-region/${item.id}`}
                onClick={() => onSelect(item.id, true)}
                className={cn(
                  'flex w-full items-center gap-3 px-2 py-3.5 text-sm font-medium transition-colors hover:bg-slate-50',
                  isSelected && 'bg-slate-50',
                )}
              >
                {inner}
              </Link>
            ) : (
              <div className="flex w-full items-center gap-3 px-2 py-3.5 text-sm font-medium transition-colors hover:bg-slate-50">
                {inner}
              </div>
            )}

            {/* Download button — only for enabled departments */}
            {item.enabled && (
              <a
                href={`/fichas/${item.id}.pdf`}
                download={`ficha-tecnica-${item.label}.pdf`}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-9 top-1/2 z-10 inline-flex h-7 -translate-y-1/2 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-goberna-blue opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-goberna-blue hover:text-white"
              >
                <Download className="h-3 w-3" />
                Ficha
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
