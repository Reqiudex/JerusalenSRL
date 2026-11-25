/**
 * Llamadas a la API para guardar y leer los cortes de una plancha.
 * Contrato completo en README.md.
 *
 *   GET  /api/planchas/:id/cortes  → { plancha, cortes }
 *   POST /api/planchas/:id/cortes  ← { plancha, cortes }  → { plancha, cortes, retazos? }
 *
 * Se usan cookies httpOnly de sesión (credentials: 'include').
 */

async function leerError(respuesta) {
  try {
    const cuerpo = await respuesta.json()
    return cuerpo?.error || cuerpo?.mensaje || `Error ${respuesta.status}`
  } catch {
    return `Error ${respuesta.status}`
  }
}

function url(base, planchaId) {
  return `${base ?? ''}/api/planchas/${encodeURIComponent(planchaId)}/cortes`
}

export async function obtenerCortes(planchaId, { base = '', signal, fetch: f = globalThis.fetch } = {}) {
  const r = await f(url(base, planchaId), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!r.ok) throw new Error(await leerError(r))
  return r.json()
}

export async function guardarCortes(planchaId, datos, { base = '', signal, fetch: f = globalThis.fetch } = {}) {
  const r = await f(url(base, planchaId), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(datos),
    signal,
  })
  if (!r.ok) throw new Error(await leerError(r))
  return r.json()
}
