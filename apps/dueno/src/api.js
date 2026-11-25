// Llamadas a la API (misma base de datos que el ERP). Sesión con cookie httpOnly.
async function pedir(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    credentials: 'include',
    ...opciones,
    headers: { Accept: 'application/json', ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers },
  })
  let datos = null
  try {
    datos = await r.json()
  } catch {
    /* sin cuerpo JSON */
  }
  if (!r.ok) {
    const e = new Error(datos?.error ?? `Error ${r.status}`)
    e.estado = r.status
    throw e
  }
  return datos
}

export const api = {
  yo: () => pedir('/api/auth/yo'),
  pin: (pin) => pedir('/api/auth/pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  salir: () => pedir('/api/auth/salir', { method: 'POST', body: '{}' }),
  resumen: (mes, sucursal) => pedir(`/api/dueno/resumen?mes=${encodeURIComponent(mes)}${sucursal ? `&sucursal=${sucursal}` : ''}`),
}
