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

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...deviceHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Error en la solicitud');
  }
  return response.json();
}

export async function uploadPdf<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_URL}${url}`, {
    method: 'POST',
    headers: deviceHeaders(),
    body: form,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Error al procesar el PDF');
  }
  return response.json();
}