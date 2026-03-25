export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001',
  socketNamespace: import.meta.env.VITE_SOCKET_NAMESPACE ?? '/results',
} as const;
