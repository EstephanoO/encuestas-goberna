const VOTE_KEY = 'encuesta_voted';
const ADMIN_KEY = 'encuesta_admin';
const ADMIN_HASH =
  '399c40d04c55cafb5a5a68dff0c95cf2dbaf67bb24d44e132b6029812ccc0be7';

export function initAdminFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('admin_key');
    if (key === ADMIN_HASH) {
      localStorage.setItem(ADMIN_KEY, ADMIN_HASH);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('admin_key');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

export function isAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === ADMIN_HASH;
  } catch {
    return false;
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.language,
    navigator.languages?.join(','),
    navigator.platform,
    navigator.hardwareConcurrency?.toString(),
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth?.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset().toString(),
  ];

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('encuesta2026', 2, 15);
      components.push(canvas.toDataURL());
    }
  } catch {
    // canvas not available
  }

  return hashString(components.filter(Boolean).join('|'));
}

export function hasVotedLocally(): boolean {
  if (isAdmin()) return false;
  try {
    return localStorage.getItem(VOTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markVotedLocally(): void {
  if (isAdmin()) return;
  try {
    localStorage.setItem(VOTE_KEY, '1');
  } catch {
    // storage not available
  }
}
