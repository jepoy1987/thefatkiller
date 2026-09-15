const LOCAL_APP_ORIGIN = 'http://localhost:3001';

function validOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const localHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    return url.protocol === 'https:' || localHttp ? url.origin : null;
  } catch {
    return null;
  }
}

export function getAppOrigin(requestOrigin?: string) {
  const requestAppOrigin = validOrigin(requestOrigin);
  const allowed = [process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined, process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined, process.env.NODE_ENV !== 'production' ? LOCAL_APP_ORIGIN : undefined].map(validOrigin).filter(Boolean);
  if (requestAppOrigin && allowed.includes(requestAppOrigin)) return requestAppOrigin;

  const vercelOrigin = validOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (process.env.VERCEL_ENV === 'preview' && vercelOrigin) return vercelOrigin;

  const override = validOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (override) return override;

  if (vercelOrigin) return vercelOrigin;

  return LOCAL_APP_ORIGIN;
}

export function safeRedirectPath(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u0020]|%5c|%0[ad]/i.test(path)) return '/dashboard';
  const base = 'https://redirect.invalid';
  try { return new URL(path, base).origin === base ? path : '/dashboard'; } catch { return '/dashboard'; }
}
