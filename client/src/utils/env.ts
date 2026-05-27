export const isStaticEnv = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') || 
  window.location.hostname.includes('github.com') ||
  window.location.hostname.includes('localhost') && window.location.port === '4173' // Vite preview
);

export const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
