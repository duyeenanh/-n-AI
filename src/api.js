import { handleLocalApi } from './utils/localApi.js';

const TOKEN_KEY = 'moc-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isAiOrTrack = path.startsWith('/ai/consult') || path.startsWith('/orders/track');
  if ((token?.startsWith('local-token-') || path.includes('/orders/local-')) && !isAiOrTrack) {
    return handleLocalApi(path, options, token);
  }

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`/api${path}`, { ...options, headers });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status >= 500 && !data.error && !isAiOrTrack) {
        return handleLocalApi(path, options, token);
      }
      throw new Error(data.error || `Yêu cầu thất bại (${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'TypeError' && !isAiOrTrack) {
      return handleLocalApi(path, options, token);
    }
    throw error;
  }
}
