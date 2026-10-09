// Cliente común para todas las peticiones al backend.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = localStorage.getItem('gradify-auth-token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `Error HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = buildHeaders(options.headers);
  if (options.body != null && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return parseResponse<T>(response);
}

export async function uploadPdf<T = unknown>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: buildHeaders(), body });
  return parseResponse<T>(response);
}
