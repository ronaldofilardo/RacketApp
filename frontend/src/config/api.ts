// src/config/api.ts
// Resolve the API base URL in this order of preference:
// 1. VITE_API_URL build-time env (set this in Vercel -> Environment Variables)
// 2. If running locally in the browser, use current host at port 4001
// 3. Fallback to http://localhost:4001
const getApiUrl = (): string => {
  // Vite env variables are exposed on import.meta.env
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any).env;
    const v = env && env.VITE_API_URL;
    if (typeof v === 'string' && v.length > 0) return v.replace(/\/$/, '');
  } catch {
    // ignore if import.meta is not available in some environments
  }

  if (typeof window !== 'undefined') {
    // In browser/dev: resolve to current host but backend listens on port 4001 in local dev
    const proto = window.location.protocol || 'http:';
    const host = window.location.hostname || 'localhost';
    return `${proto}//${host}:4001`;
  }

  return 'http://localhost:4001';
};

export const API_URL = getApiUrl();