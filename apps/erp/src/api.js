// Cliente de la API del ERP. Todas las rutas son relativas a /api y usan la cookie de sesión.
export class ErrorApi extends Error {
  constructor(mensaje, estado, errores) {
    super(mensaje)
    this.estado = estado
    this.errores = errores
  }
}

let alNoAutorizado = () => {}
export const configurarApi = ({ noAutorizado }) => {
  alNoAutorizado = noAutorizado
}

async function pedir(metodo, ruta, cuerpo) {
  let r
  try {
    r = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revisa internet e intenta de nuevo.', 0)
  }
  const tipo = r.headers.get('content-type') ?? ''
  const datos = tipo.includes('json') ? await r.json().catch(() => null) : await r.text()
  if (!r.ok) {
    if (r.status === 401 && !ruta.startsWith('/auth/')) alNoAutorizado()
    throw new ErrorApi(datos?.error ?? `Error ${r.status}`, r.status, datos?.errores)
  }
  return datos
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo = {}) => pedir('POST', ruta, cuerpo),
  put: (ruta, cuerpo = {}) => pedir('PUT', ruta, cuerpo),
  del: (ruta) => pedir('DELETE', ruta),
}

/** Arma ?a=1&b=2 omitiendo vacíos. */
export function consulta(params) {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  return p.length ? `?${p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : ''
}

/** Descarga un archivo (CSV) de la API respetando la sesión. */
export function descargar(ruta) {
  const a = document.createElement('a')
  a.href = `/api${ruta}`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
