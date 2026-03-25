import { cn } from '@/lib/utils';
import type { ProvinceResult } from '@/data/surveyResults';

interface ProblemasBarChartProps {
  provinceResults: ProvinceResult[];
}

interface AggregatedProblem {
  label: string;
  description: string;
  color: string;
  avgPercentage: number;
  provinceCount: number;
  totalProvinces: number;
}

/**
 * Aggregates province-level problem data into a ranked summary.
 * Groups by problem label, computes average % and province count.
 */
function aggregateProblems(results: ProvinceResult[]): AggregatedProblem[] {
  const groups = new Map<
    string,
    { color: string; description: string; percentages: number[] }
  >();

  for (const r of results) {
    const existing = groups.get(r.label);
    if (existing) {
      existing.percentages.push(r.percentage);
    } else {
      groups.set(r.label, {
        color: r.partyColor,
        description: r.partyName,
        percentages: [r.percentage],
      });
    }
  }

  const total = results.length;

  return Array.from(groups.entries())
    .map(([label, data]) => ({
      label,
      description: data.description,
      color: data.color,
      avgPercentage: Math.round(
        data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length,
      ),
      provinceCount: data.percentages.length,
      totalProvinces: total,
    }))
    .sort((a, b) => b.provinceCount - a.provinceCount || b.avgPercentage - a.avgPercentage);
}

/**
 * ProblemasBarChart
 *
 * Horizontal bar chart showing the main problems reported by provinces.
 * Each bar = one problem type, width proportional to province count.
 * Shows average % and how many provinces report it.
 */
export function ProblemasBarChart({ provinceResults }: ProblemasBarChartProps) {
  const problems = aggregateProblems(provinceResults);

  if (problems.length === 0) return null;

  const maxCount = Math.max(...problems.map((p) => p.provinceCount));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Principales problemas del departamento
        </h3>
        <p className="text-xs text-muted-foreground">
          Problema m\u00e1s mencionado por provincia &middot; Promedio de porcentaje de respuesta
        </p>
      </div>

      <div className="space-y-3">
        {problems.map((problem) => {
          const barWidth = (problem.provinceCount / maxCount) * 100;

          return (
            <div key={problem.label} className="space-y-1.5">
              {/* Label row */}
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    role="img"
                    aria-label={`Color de ${problem.label}`}
                    style={{ backgroundColor: problem.color }}
                  />
                  <span className="truncate text-sm font-semibold text-foreground">
                    {problem.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {problem.provinceCount}/{problem.totalProvinces} provincias
                  </span>
                  <span className="min-w-[3ch] text-right text-sm font-bold tabular-nums text-foreground">
                    {problem.avgPercentage}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={problem.provinceCount}
                aria-valuemin={0}
                aria-valuemax={maxCount}
                aria-label={`${problem.label}: ${problem.provinceCount} de ${problem.totalProvinces} provincias, promedio ${problem.avgPercentage}%`}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                  )}
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: problem.color,
                  }}
                />
              </div>

              {/* Description */}
              <p className="text-[11px] leading-tight text-muted-foreground">
                {problem.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
