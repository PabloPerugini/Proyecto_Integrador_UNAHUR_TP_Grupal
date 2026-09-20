const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function parseError(response: Response): Promise<string> {
  return response
    .json()
    .then((data: { message?: string; error?: string }) => data.error || data.message || 'Error en la solicitud')
    .catch(() => `Error en la solicitud (HTTP ${response.status})`);
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers as Record<string, string>),
      },
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  if (response.status === 401 && !url.startsWith('/users/login')) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export async function uploadPdf<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  if (response.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}