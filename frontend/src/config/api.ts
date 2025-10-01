// src/config/api.ts
const getApiUrl = (): string => {
  // Se estamos na Vercel (produção) - detecta pelo domínio da Vercel
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com'))) {
    return window.location.origin;
  }
  
  // Se estamos no desenvolvimento (local ou rede)
  return 'http://192.168.15.2:4001'; // Backend sempre na rede local
};

export const API_URL = getApiUrl();