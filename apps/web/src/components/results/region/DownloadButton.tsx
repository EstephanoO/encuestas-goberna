import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { getDownloadCount, incrementDownloadCount } from '@/services/api/downloads';

interface DownloadButtonProps {
  departmentId: string;
  departmentLabel: string;
}

export function DownloadButton({ departmentId, departmentLabel }: DownloadButtonProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    getDownloadCount(departmentId).then(setCount).catch(() => setCount(0));
  }, [departmentId]);

  function handleClick() {
    incrementDownloadCount(departmentId)
      .then(setCount)
      .catch(() => {
        // Still increment locally even if API fails
        setCount((prev) => (prev ?? 0) + 1);
      });
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href={`/fichas/${departmentId}.pdf`}
        download={`ficha-tecnica-${departmentLabel}.pdf`}
        onClick={handleClick}
        className="inline-flex items-center gap-2.5 rounded-full bg-goberna-gold px-6 py-3 text-sm font-bold uppercase tracking-wide text-goberna-blue shadow-lg transition-all hover:bg-goberna-blue hover:text-white hover:shadow-xl"
      >
        <Download className="h-4 w-4" />
        Descarga la ficha técnica
      </a>
      {count !== null && (
        <span className="text-xs text-slate-500">
          <span className="font-bold text-slate-700">{count.toLocaleString()}</span>{' '}
          {count === 1 ? 'descarga' : 'descargas'}
        </span>
      )}
    </div>
  );
}
