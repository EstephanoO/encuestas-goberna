import { useRef, useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { MapaEncuesta } from '@/components/home/MapaEncuesta';
import type { ProvinceResult } from '@/data/surveyResults';

interface RegionMapSectionProps {
  departmentId: string;
  provinceResults: ProvinceResult[];
  showPhoto: boolean;
}

/**
 * RegionMapSection
 *
 * Renders the real MapLibre map with province choropleth + markers.
 * Includes a fullscreen toggle button using the native Fullscreen API.
 */
export function RegionMapSection({
  departmentId,
  provinceResults,
  showPhoto,
}: RegionMapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  function toggleFullscreen() {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#edf4f7] ${isFullscreen ? 'h-screen w-screen' : ''}`}
      role="region"
      aria-label={`Mapa de resultados para ${departmentId}`}
    >
      <MapaEncuesta
        activeDepartmentId={departmentId}
        provinceResults={provinceResults}
        showPhoto={showPhoto}
        fullHeight={isFullscreen}
      />

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
