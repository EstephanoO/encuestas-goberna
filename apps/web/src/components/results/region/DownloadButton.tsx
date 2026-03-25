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
    <div className="flex items-center gap-3">
      {/* Download button — original gold style, just shorter text */}
      <a
        href={`/fichas/${departmentId}.pdf`}
        download={`ficha-tecnica-${departmentLabel}.pdf`}
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-goberna-gold px-5 py-2.5 text-sm font-semibold text-goberna-blue shadow-md transition-all hover:bg-goberna-blue hover:text-white hover:shadow-lg"
      >
        <Download className="h-4 w-4" />
        Ficha técnica
      </a>

      {/* Download count — right side */}
      {count !== null && (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-500">{count.toLocaleString()}</span>
          {count === 1 ? 'descarga' : 'descargas'}
        </span>
      )}
    </div>
  );
}
