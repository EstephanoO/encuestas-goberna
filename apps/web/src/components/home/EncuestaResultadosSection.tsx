import { useState } from 'react';
import { DepartamentoSelector } from './DepartamentoSelector';
import { MapaEncuesta } from './MapaEncuesta';
import { ResultadosCargo } from './ResultadosCargo';
import {
  SURVEY_TOPICS,
  PROVINCE_RESULTS,
  DEPARTMENT_RANKINGS,
} from '@/data/surveyResults';

const DEPARTMENTS = [
  { id: 'san-martin', label: 'San Martín', enabled: true },
  { id: 'amazonas', label: 'Amazonas', enabled: false },
  { id: 'ancash', label: 'Áncash', enabled: true },
  { id: 'apurimac', label: 'Apurímac', enabled: false },
  { id: 'arequipa', label: 'Arequipa', enabled: false },
  { id: 'ayacucho', label: 'Ayacucho', enabled: false },
  { id: 'cajamarca', label: 'Cajamarca', enabled: false },
  { id: 'callao', label: 'Callao', enabled: false },
  { id: 'cusco', label: 'Cusco', enabled: false },
  { id: 'huancavelica', label: 'Huancavelica', enabled: false },
  { id: 'huanuco', label: 'Huánuco', enabled: false },
  { id: 'ica', label: 'Ica', enabled: false },
  { id: 'junin', label: 'Junín', enabled: false },
  { id: 'la-libertad', label: 'La Libertad', enabled: false },
  { id: 'lambayeque', label: 'Lambayeque', enabled: false },
  { id: 'lima', label: 'Lima', enabled: false },
  { id: 'loreto', label: 'Loreto', enabled: false },
  { id: 'madre-de-dios', label: 'Madre de Dios', enabled: false },
  { id: 'moquegua', label: 'Moquegua', enabled: false },
  { id: 'pasco', label: 'Pasco', enabled: false },
  { id: 'piura', label: 'Piura', enabled: false },
  { id: 'puno', label: 'Puno', enabled: false },
  { id: 'tacna', label: 'Tacna', enabled: false },
  { id: 'tumbes', label: 'Tumbes', enabled: false },
  { id: 'ucayali', label: 'Ucayali', enabled: false },
] as const;

export function EncuestaResultadosSection() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState(
    SURVEY_TOPICS[0]?.id ?? 'presidentes',
  );

  function handleDepartmentSelect(id: string, enabled: boolean) {
    if (!enabled) return;
    setSelectedDepartmentId(id);
  }

  const selectedTopic = SURVEY_TOPICS.find((t) => t.id === selectedTopicId);

  const provinceResults = selectedDepartmentId
    ? PROVINCE_RESULTS[selectedTopicId]?.[selectedDepartmentId] ?? []
    : [];

  return (
    <section id="resultados-encuestas" className="bg-white py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 md:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-goberna-gold">
            Resultados de las encuestas
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-goberna-blue sm:text-5xl">
            Explora los resultados por departamento
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Selecciona un departamento para consultar los resultados de la
            encuesta y descargar la ficha técnica correspondiente.
          </p>
        </div>

        {/* Topic selector */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-500">
            Tema de encuesta:
          </span>
          <div className="flex flex-wrap gap-2">
            {SURVEY_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopicId(topic.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  selectedTopicId === topic.id
                    ? 'border-goberna-blue bg-goberna-blue text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-goberna-blue/40'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h3 className="mb-4 text-lg font-bold text-goberna-blue">
              Departamentos
            </h3>
            <DepartamentoSelector
              items={DEPARTMENTS.map((department) => ({ ...department }))}
              selectedId={selectedDepartmentId}
              onSelect={handleDepartmentSelect}
              onHover={setHoveredDepartmentId}
            />
          </div>

          <MapaEncuesta
            activeDepartmentId={selectedDepartmentId}
            hoveredDepartmentId={hoveredDepartmentId}
            provinceResults={provinceResults}
            showPhoto={selectedTopic?.showPhoto ?? false}
          />
        </div>

        {selectedDepartmentId && (
          <div className="grid gap-8 md:grid-cols-2">
            <ResultadosCargo
              title="Encuesta Senadores"
              candidates={
                DEPARTMENT_RANKINGS.senadores?.[selectedDepartmentId] ?? []
              }
            />
            <ResultadosCargo
              title="Encuesta Diputados"
              candidates={
                DEPARTMENT_RANKINGS.diputados?.[selectedDepartmentId] ?? []
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}
