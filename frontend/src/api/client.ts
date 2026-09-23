const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DEVICE_ID_KEY = 'gradify-device-id';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function deviceHeaders(): Record<string, string> {
  return { 'x-user-id': getDeviceId() };
}

async function fetchJson(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisá que el backend esté corriendo.');
  }
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchJson(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...deviceHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Error en la solicitud'));
  }
  return response.json();
}

export async function uploadPdf<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetchJson(`${API_URL}${url}`, {
    method: 'POST',
    headers: deviceHeaders(),
    body: form,
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Error al procesar el PDF'));
  }
  return response.json();
}