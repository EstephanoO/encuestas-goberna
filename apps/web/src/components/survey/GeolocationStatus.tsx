import { Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import type { GeoStatus } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

interface GeolocationStatusProps {
  status: GeoStatus;
  error: string | null;
}

export function GeolocationStatus({ status, error }: GeolocationStatusProps) {
  if (status === 'idle') return null;

  const states = {
    requesting: {
      icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
      message: 'Obteniendo tu ubicación...',
      style: 'bg-primary/5 border-primary/20 text-primary',
    },
    granted: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      message: 'Ubicación obtenida correctamente.',
      style: 'bg-green-50 border-green-200 text-green-800',
    },
    denied: {
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      message: error ?? 'Permiso denegado.',
      style: 'bg-red-50 border-red-200 text-red-800',
    },
    error: {
      icon: <MapPin className="h-4 w-4 text-destructive" />,
      message: error ?? 'Error al obtener ubicación.',
      style: 'bg-red-50 border-red-200 text-red-800',
    },
  };

  const state = states[status as keyof typeof states];
  if (!state) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
        state.style,
      )}
    >
      {state.icon}
      <span>{state.message}</span>
    </div>
  );
}
