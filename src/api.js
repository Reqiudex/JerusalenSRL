// Cliente HTTP ligero para el ERP Jerusalén S.R.L. y Panel del Dueño (adminj)

export async function apiFetch(path, options = {}) {
  const token = (() => {
    try {
      return localStorage.getItem('jerusalen_token') || '';
    } catch {
      return '';
    }
  })();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-session-token': token } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(path, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor' }));
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `Error HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem('jerusalen_token', token);
    else localStorage.removeItem('jerusalen_token');
  } catch {
    /* ignore */
  }
}
