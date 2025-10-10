// src/config/api.ts
// Resolve the API base URL in this order of preference:
// 1. VITE_API_URL build-time env (set this in Vercel -> Environment Variables)
// 2. If running locally in the browser, use current host at port 4001
// 3. Fallback to http://localhost:4001
const getApiUrl = (): string => {
  // Vite env variables are exposed on import.meta.env
  try {
    const v = import.meta.env?.VITE_API_URL;
    if (typeof v === 'string' && v.length > 0) return v.replace(/\/$/, '');
  } catch {
    // ignore if import.meta is not available in some environments
  }

  if (typeof window !== 'undefined') {
    // If running on Vercel (production), and VITE_API_URL was not provided,
    // prefer the same origin (no :4001) so the frontend requests go to the
    // deployed backend endpoint or serverless function attached to the same
    // project. For local development we still default to port 4001.
    const hostname = window.location.hostname || 'localhost';
    const proto = window.location.protocol || 'http:';
    if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
      return window.location.origin;
    }
    return `${proto}//${hostname}:4001`;
  }

  return 'http://localhost:4001';
};

export const API_URL = getApiUrl();