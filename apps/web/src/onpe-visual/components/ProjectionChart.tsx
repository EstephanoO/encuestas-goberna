import { Line } from 'react-chartjs-2';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Legend, Filler, LineController,
} from 'chart.js';
import { CANDIDATES, CAND_ORDER } from '../data/candidates';
import type { SeriesPoint, CandKey } from '../types';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler, LineController);

interface Props {
  series: SeriesPoint[];
  /** Sigue aceptando projection por compatibilidad pero no se grafica. */
  projection?: Record<CandKey, number>;
  currentPct: number;
}

export function ProjectionChart({ series, currentPct }: Props) {
  const labels = series.map(s => `${s.pct}%`);

  const datasets = CAND_ORDER.map(k => {
    const c = CANDIDATES[k];
    return {
      label: c.name,
      data: series.map(s => s[k]),
      borderColor: c.color,
      backgroundColor: c.color + '22',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    };
  });

  const data = { labels, datasets };
  const options: any = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24,27,36,.95)',
        borderColor: 'rgba(255,255,255,.08)',
        borderWidth: 1,
        titleColor: '#e8eaed',
        bodyColor: '#9aa0ab',
        bodyFont: { family: 'JetBrains Mono' },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '% de ONPE', color: '#5f6673', font: { size: 10 } },
        ticks: { color: '#5f6673', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,.04)' },
      },
      y: {
        min: 6, max: 20,
        ticks: { color: '#5f6673', font: { family: 'JetBrains Mono', size: 10 }, callback: (v: any) => v + '%' },
        grid: { color: 'rgba(255,255,255,.04)' },
      },
    },
  };

  // Último valor real por candidato (para resumen)
  const last = series[series.length - 1];

  return (
    <>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
      <div className="proj-summary">
        <span className="lead">ONPE al {currentPct.toFixed(2)}% actas:</span>{' '}
        {CAND_ORDER.map(k => (
          <span key={k} style={{ color: CANDIDATES[k].color, marginRight: 10 }}>
            ● {CANDIDATES[k].name} {(last?.[k] ?? 0).toFixed(2)}%
          </span>
        ))}
      </div>
    </>
  );
}
