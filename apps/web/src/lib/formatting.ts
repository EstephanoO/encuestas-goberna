export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-PE').format(n);
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'hace un momento';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return date.toLocaleDateString('es-PE');
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
