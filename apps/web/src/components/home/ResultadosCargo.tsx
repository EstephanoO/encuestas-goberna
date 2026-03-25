import { useState } from 'react';
import { ChevronDown, Star, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CandidateRanking } from '@/data/surveyResults';

interface ResultadosCargoProps {
  title: string;
  candidates: CandidateRanking[];
  downloadUrl?: string;
  downloadLabel?: string;
}

export function ResultadosCargo({ title, candidates, downloadUrl, downloadLabel }: ResultadosCargoProps) {
  const [open, setOpen] = useState(false);

  if (candidates.length === 0) return null;

  const preview = candidates.slice(0, 3);

  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header — clickable */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {preview.map((c, i) => (
                <Avatar
                  key={c.name}
                  className="h-8 w-8 ring-2 ring-white"
                  style={{ zIndex: preview.length - i }}
                >
                  {c.photoUrl && <AvatarImage src={c.photoUrl} alt={c.name} />}
                  <AvatarFallback
                    className="text-[10px] font-bold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-sm font-bold text-goberna-blue">{title}</p>
          </div>

          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={downloadLabel}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-goberna-blue transition-colors hover:bg-goberna-blue hover:text-white"
              >
                <Download className="h-3 w-3 shrink-0" />
                Ficha técnica
              </a>
            )}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Animated expand/collapse via grid trick */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
              {candidates.map((c, i) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  {/* Badge: estrella para el 1er puesto, número para el resto */}
                  {i === 0 ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
                      <Star className="h-3.5 w-3.5 fill-white stroke-none" />
                    </div>
                  ) : (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {i + 1}
                    </div>
                  )}

                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white">
                    {c.photoUrl && <AvatarImage src={c.photoUrl} alt={c.name} />}
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                      <span className="shrink-0 text-sm font-bold text-slate-700">{c.percentage}%</span>
                    </div>
                    {c.party && (
                      <p className="truncate text-xs text-slate-500">{c.party}</p>
                    )}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
