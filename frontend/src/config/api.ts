// src/config/api.ts
const getApiUrl = (): string => {
  // Se estamos na Vercel (produção) - detecta pelo domínio da Vercel
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com'))) {
    return window.location.origin;
  }
  
  // Se estamos no desenvolvimento (local ou rede)
  // Use o hostname atual (para que, ao acessar o frontend por IP/hostname na rede, o backend também seja resolvido automaticamente)
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol || 'http:';
    const host = window.location.hostname || 'localhost';
    return `${proto}//${host}:4001`;
  }

  return 'http://localhost:4001'; // fallback
};

export const API_URL = getApiUrl();