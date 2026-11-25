// Acceso demo sin clave (DEMO_SIN_LOGIN=1): rol fijo en el servidor, sin exponer claves.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
process.env.FECHA_HOY = '2026-11-25'
process.env.SERVIR_ESTATICOS = '0'
process.env.DEMO_SIN_LOGIN = '1'
const { abrirBD } = await import('../src/db.js')
const { sembrar } = await import('../src/semilla.js')
const { crearApp } = await import('../src/app.js')

let servidor
let base
beforeAll(async () => {
  const db = abrirBD(':memory:')
  sembrar(db, { costoHash: 4 })
  servidor = crearApp(db, { estaticos: false }).listen(0)
  await new Promise((ok) => servidor.once('listening', ok))
  base = `http://127.0.0.1:${servidor.address().port}`
})
afterAll(() => servidor?.close())

async function llamar(metodo, ruta, cuerpo, cookie = '') {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  })
  return { estado: r.status, datos: await r.json(), cookie: (r.headers.get('set-cookie') ?? '').split(';')[0] }
}

describe('entrar sin clave (demo)', () => {
  it('lista roles sin correos ni claves', async () => {
    const r = await llamar('GET', '/api/demo/roles')
    expect(r.estado).toBe(200)
    expect(r.datos.roles.map((x) => x.rol)).toEqual(['administrador', 'vendedor', 'cortador', 'contador', 'rrhh', 'dueno'])
    expect(JSON.stringify(r.datos)).not.toMatch(/@|clave|pin/i)
  })
  it('abre sesión con el rol pedido', async () => {
    for (const rol of ['administrador', 'vendedor', 'cortador', 'contador', 'rrhh']) {
      const r = await llamar('POST', '/api/demo/entrar', { rol })
      expect(r.estado).toBe(200)
      const yo = await llamar('GET', '/api/auth/yo', undefined, r.cookie)
      expect(yo.datos.usuario.rol).toBe(rol)
    }
    const nain = await llamar('POST', '/api/demo/entrar', { rol: 'administrador' })
    expect(nain.datos.usuario.nombre).toBe('Nain Torrico')
  })
  it('el dueño entra al panel y no puede escribir', async () => {
    const r = await llamar('POST', '/api/demo/entrar', { rol: 'dueno' })
    expect(r.datos.usuario.rol).toBe('dueno')
    expect((await llamar('GET', '/api/dueno/resumen', undefined, r.cookie)).estado).toBe(200)
    expect((await llamar('POST', '/api/proformas', { items: [] }, r.cookie)).estado).toBe(403)
  })
  it('rechaza roles desconocidos', async () => {
    expect((await llamar('POST', '/api/demo/entrar', { rol: 'superusuario' })).estado).toBe(422)
    expect((await llamar('POST', '/api/demo/entrar', { rol: 'administrador', email: 'otro@x' })).datos.usuario.email).toBe('nain@jerusalen.demo')
  })
})
