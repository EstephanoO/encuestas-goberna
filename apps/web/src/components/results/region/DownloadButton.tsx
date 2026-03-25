import { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
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
        setCount((prev) => (prev ?? 0) + 1);
      });
  }

  return (
    <div className="flex items-center gap-4">
      {/* Download count — left side */}
      {count !== null && (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-500">{count.toLocaleString()}</span>
          {count === 1 ? 'descarga' : 'descargas'}
        </span>
      )}

      {/* Download link — discrete style */}
      <a
        href={`/fichas/${departmentId}.pdf`}
        download={`ficha-tecnica-${departmentLabel}.pdf`}
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-goberna-blue hover:decoration-goberna-blue"
      >
        <Download className="h-3.5 w-3.5" />
        Ficha técnica
      </a>
    </div>
  );
}
