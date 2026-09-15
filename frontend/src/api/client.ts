const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const raw = localStorage.getItem('user');
  if (!raw) return {};
  try {
    const user = JSON.parse(raw) as { _id?: string };
    return user._id ? { 'x-user-id': user._id } : {};
  } catch {
    return {};
  }
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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
    headers: authHeaders(),
    body: form,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Error al procesar el PDF');
  }
  return response.json();
}