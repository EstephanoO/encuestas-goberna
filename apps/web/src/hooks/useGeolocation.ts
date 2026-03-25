import { useState, useCallback } from 'react';

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface GeoResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: GeoStatus;
  error: string | null;
  requestLocation: () => Promise<GeolocationCoordinates | null>;
}

export function useGeolocation(): GeoResult {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestLocation =
    useCallback((): Promise<GeolocationCoordinates | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus('error');
          setError('Tu navegador no soporta geolocalización.');
          resolve(null);
          return;
        }

        setStatus('requesting');
        setError(null);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
            setAccuracy(position.coords.accuracy);
            setStatus('granted');
            resolve(position.coords);
          },
          (err) => {
            setStatus(err.code === 1 ? 'denied' : 'error');
            setError(
              err.code === 1
                ? 'Permiso de ubicación denegado. Necesitás aceptarlo para participar.'
                : 'No pudimos obtener tu ubicación. Intentá nuevamente.',
            );
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
      });
    }, []);

  return { latitude, longitude, accuracy, status, error, requestLocation };
}
