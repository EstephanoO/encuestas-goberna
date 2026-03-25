export const APP_CONSTANTS = {
  API_PREFIX: 'api',
  SOCKET_NAMESPACE: '/results',
  JNE_SYNC_CRON: '0 */6 * * *', // every 6 hours
  ANTI_ABUSE_COOLDOWN_MS: 60_000, // 1 minute
  MAP_POINTS_LIMIT: 1000,
  RECENT_RESPONSES_LIMIT: 20,
} as const;
