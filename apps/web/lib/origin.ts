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
  const vercelOrigin = validOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (process.env.VERCEL_ENV === 'preview' && vercelOrigin) return vercelOrigin;

  const override = validOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (override) return override;

  if (vercelOrigin) return vercelOrigin;

  return validOrigin(requestOrigin) ?? LOCAL_APP_ORIGIN;
}
