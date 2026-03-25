import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { RegionHero } from '@/components/results/region/RegionHero';
import { PeruDepartmentMap } from '@/components/results/region/PeruDepartmentMap';
import { ProvinceResultsBar } from '@/components/results/region/ProvinceResultsBar';
import { ProblemasBarChart } from '@/components/results/region/ProblemasBarChart';
import { PresidentialRankingChart } from '@/components/results/region/PresidentialRankingChart';
import { RegionResultsSection } from '@/components/results/region/RegionResultsSection';
import {
  SURVEY_TOPICS,
  PROVINCE_RESULTS,
  DEPARTMENT_RANKINGS,
} from '@/data/surveyResults';
import type { SurveyTopic, ProvinceResult, CandidateRanking } from '@/data/surveyResults';

/**
 * Map of department IDs to display labels.
 * Only includes departments that have real data in surveyResults.ts.
 */
const DEPARTMENT_LABELS: Record<string, string> = {
  'san-martin': 'San Mart\u00edn',
  ancash: '\u00c1ncash',
};

/** Topic with its resolved data for a specific department */
export interface TopicWithData extends SurveyTopic {
  provinceResults: ProvinceResult[];
  rankings: CandidateRanking[];
}

/**
 * Resolves all available topic data for a given department.
 * Returns province-level results + department-level rankings per topic.
 */
function getDepartmentTopics(departmentId: string): TopicWithData[] {
  const topics = SURVEY_TOPICS.map((topic) => ({
    ...topic,
    provinceResults: PROVINCE_RESULTS[topic.id]?.[departmentId] ?? [],
    rankings: DEPARTMENT_RANKINGS[topic.id]?.[departmentId] ?? [],
  }));

  return topics.filter(
    (t) => t.provinceResults.length > 0 || t.rankings.length > 0,
  );
}

export default function RegionResultsPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [selectedTopicId, setSelectedTopicId] = useState(
    SURVEY_TOPICS[0]?.id ?? 'presidentes',
  );

  if (!departmentId || !DEPARTMENT_LABELS[departmentId]) {
    return (
      <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">
          Departamento no encontrado
        </h1>
        <p className="text-sm text-muted-foreground">
          El departamento solicitado no tiene datos disponibles.
        </p>
        <Link
          to="/"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </PageContainer>
    );
  }

  const departmentLabel = DEPARTMENT_LABELS[departmentId];
  const topicsWithData = getDepartmentTopics(departmentId);

  const selectedTopic = topicsWithData.find((t) => t.id === selectedTopicId);
  const provinceResults = selectedTopic?.provinceResults ?? [];

  return (
    <>
      <RegionHero departmentId={departmentId} departmentLabel={departmentLabel} />

      <PageContainer className="space-y-6 pb-12 pt-8">
        {/* CTA row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            Departamento: <span className="font-semibold text-slate-900">{departmentLabel}</span>
          </span>
          <a
            href={`/fichas/${departmentId}.pdf`}
            download={`ficha-tecnica-${departmentLabel}.pdf`}
            className="inline-flex items-center gap-2.5 rounded-full bg-goberna-gold px-6 py-3 text-sm font-bold uppercase tracking-wide text-goberna-blue shadow-lg transition-all hover:bg-goberna-blue hover:text-white hover:shadow-xl"
          >
            <Download className="h-4 w-4" />
            Descarga la ficha tecnica
          </a>
        </div>

        {/* Topic tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Temas de encuesta">
          {topicsWithData.map((topic) => (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={selectedTopicId === topic.id}
              onClick={() => setSelectedTopicId(topic.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                selectedTopicId === topic.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-slate-200 bg-white text-muted-foreground shadow-sm hover:border-primary/40',
              )}
            >
              {topic.label}
            </button>
          ))}
        </div>

        {/* AP News–style results bar */}
        <ProvinceResultsBar
          provinceResults={provinceResults}
          departmentRankings={selectedTopic?.rankings ?? []}
          topicLabel={selectedTopic?.label ?? 'Presidencial'}
          departmentLabel={departmentLabel}
        />

        {/* Province map */}
        <PeruDepartmentMap
          activeDepartmentId={departmentId}
          provinceResults={provinceResults}
        />

        {/* Horizontal bar chart — only for "problemas" topic */}
        {selectedTopicId === 'problemas' && provinceResults.length > 0 && (
          <ProblemasBarChart provinceResults={provinceResults} />
        )}

        {/* Presidential ranking chart — only for "presidentes" topic */}
        {selectedTopicId === 'presidentes' && selectedTopic && selectedTopic.rankings.length > 0 && (
          <PresidentialRankingChart candidates={selectedTopic.rankings} />
        )}

        <RegionResultsSection departmentId={departmentId} />
      </PageContainer>
    </>
  );
}
