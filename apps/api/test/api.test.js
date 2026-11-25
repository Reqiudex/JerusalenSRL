// Prueba de punta a punta de la API sobre una base en memoria con la semilla demo.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.FECHA_HOY = '2026-11-25'
process.env.SERVIR_ESTATICOS = '0'
const { abrirBD } = await import('../src/db.js')
const { sembrar } = await import('../src/semilla.js')
const { crearApp } = await import('../src/app.js')
const { reiniciarIntentos } = await import('../src/auth.js')

let servidor
let base
let db

/** Cliente HTTP mínimo que guarda la cookie de sesión. */
function cliente() {
  let cookie = ''
  const llamar = async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: { ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
    const sc = r.headers.get('set-cookie')
    if (sc) cookie = sc.split(';')[0]
    const tipo = r.headers.get('content-type') ?? ''
    return { estado: r.status, datos: tipo.includes('json') ? await r.json() : await r.text() }
  }
  return { get: (r) => llamar('GET', r), post: (r, c = {}) => llamar('POST', r, c), put: (r, c = {}) => llamar('PUT', r, c), del: (r) => llamar('DELETE', r) }
}
const ingresar = async (email) => {
  const c = cliente()
  const r = await c.post('/api/auth/ingresar', { email, clave: 'jerusalen2026' })
  expect(r.estado).toBe(200)
  return c
}

beforeAll(async () => {
  db = abrirBD(':memory:')
  sembrar(db, { costoHash: 4 })
  servidor = crearApp(db, { estaticos: false }).listen(0)
  await new Promise((ok) => servidor.once('listening', ok))
  base = `http://127.0.0.1:${servidor.address().port}`
})
afterAll(() => servidor?.close())

describe('autenticación y permisos', () => {
  it('rechaza clave incorrecta y bloquea tras 5 intentos', async () => {
    reiniciarIntentos()
    const c = cliente()
    for (let i = 0; i < 5; i++) expect((await c.post('/api/auth/ingresar', { email: 'nain@jerusalen.demo', clave: 'mala' })).estado).toBe(401)
    expect((await c.post('/api/auth/ingresar', { email: 'nain@jerusalen.demo', clave: 'jerusalen2026' })).estado).toBe(429)
    reiniciarIntentos()
  })
  it('exige sesión', async () => {
    expect((await cliente().get('/api/ventas')).estado).toBe(401)
  })
  it('el dueño entra solo con PIN y solo ve su panel', async () => {
    const c = cliente()
    expect((await c.post('/api/auth/ingresar', { email: 'emiliano@jerusalen.demo', clave: 'x' })).estado).toBe(401)
    expect((await c.post('/api/auth/pin', { pin: '0000' })).estado).toBe(401)
    const r = await c.post('/api/auth/pin', { pin: '2580' })
    expect(r.estado).toBe(200)
    expect(r.datos.usuario.rol).toBe('dueno')
    const res = await c.get('/api/dueno/resumen?mes=2026-11')
    expect(res.estado).toBe(200)
    expect(res.datos).toHaveProperty('ingresos.total')
    expect(res.datos.vendedores.length).toBe(4)
    expect((await c.get('/api/ventas')).estado).toBe(403)
    expect((await c.get('/api/sucursales')).estado).toBe(403)
  })
  it('el vendedor solo ve sus proformas y no la contabilidad', async () => {
    const c = await ingresar('carla@jerusalen.demo')
    const yo = (await c.get('/api/auth/yo')).datos.usuario
    const lista = (await c.get('/api/proformas?limite=1000')).datos
    expect(lista.length).toBeGreaterThan(10)
    expect(lista.every((p) => p.vendedor_id === yo.id)).toBe(true)
    expect((await c.get('/api/contabilidad/resultado')).estado).toBe(403)
    expect((await c.get('/api/usuarios')).estado).toBe(403)
    expect((await c.get('/api/reportes')).estado).toBe(403)
    expect((await c.get('/api/panel')).estado).toBe(403)
    const otra = db.prepare('SELECT id FROM proformas WHERE vendedor_id <> ? LIMIT 1').get(yo.id)
    expect((await c.get(`/api/proformas/${otra.id}`)).estado).toBe(403)
  })
  it('rechaza escrituras que no son JSON (protección CSRF)', async () => {
    const c = await ingresar('nain@jerusalen.demo')
    const r = await fetch(`${base}/api/clientes`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'nombre=x' })
    expect(r.status).toBe(415)
    expect((await c.post('/api/clientes', { nombre: '' })).estado).toBe(422)
  })
})

describe('proforma → venta → pagos', () => {
  it('recorre el ciclo completo', async () => {
    const c = await ingresar('lucia@jerusalen.demo')
    const mat = db.prepare("SELECT id, precio FROM materiales WHERE codigo = 'GRA-NSG'").get()
    const nueva = await c.post('/api/proformas', {
      cliente: { nombre: 'Cliente de prueba', telefono: '71234567' },
      descuento_pct: 10,
      items: [
        { tipo: 'pieza', material_id: mat.id, descripcion: 'Mesón', ancho_cm: 250, alto_cm: 62, piezas: 1, precio_unit: 500 },
        { tipo: 'servicio', descripcion: 'Colocación', cantidad: 1, unidad: 'servicio', precio_unit: 350 },
      ],
    })
    expect(nueva.estado).toBe(201)
    const p = nueva.datos
    expect(p.codigo).toMatch(/^PRO-2026-\d{4}$/)
    expect(p.estado).toBe('borrador')
    expect(p.items[0].cantidad).toBe(1.55)
    expect(p.subtotal).toBe(1.55 * 500 + 350)
    expect(p.total).toBeCloseTo((1.55 * 500 + 350) * 0.9, 2)

    expect((await c.post(`/api/proformas/${p.id}/estado`, { estado: 'convertida' })).estado).toBe(422)
    expect((await c.post(`/api/proformas/${p.id}/estado`, { estado: 'enviada' })).datos.estado).toBe('enviada')
    const conv = await c.post(`/api/proformas/${p.id}/convertir`, { pago: { monto: 500, metodo: 'qr' } })
    expect(conv.estado).toBe(201)
    const v = conv.datos
    expect(v.total).toBe(p.total)
    expect(v.pagado).toBe(500)
    expect(v.estado).toBe('vigente')
    expect((await c.get(`/api/proformas/${p.id}`)).datos.estado).toBe('convertida')
    expect((await c.post(`/api/proformas/${p.id}/convertir`)).estado).toBe(422)

    const demasiado = await c.post(`/api/ventas/${v.id}/pagos`, { monto: v.saldo + 1, metodo: 'efectivo' })
    expect(demasiado.estado).toBe(422)
    const ok = await c.post(`/api/ventas/${v.id}/pagos`, { monto: v.saldo, metodo: 'efectivo' })
    expect(ok.datos.saldo).toBe(0)
    expect(ok.datos.estadoPago).toBe('pagada')
    expect(ok.datos.estado).toBe('vigente')
    // Solo el administrador anula
    expect((await c.post(`/api/ventas/${v.id}/anular`, { motivo: 'x' })).estado).toBe(403)
    const admin = await ingresar('nain@jerusalen.demo')
    expect((await admin.post(`/api/ventas/${v.id}/anular`, { motivo: 'prueba' })).datos.estado).toBe('anulada')
  })
  it('marca como vencidas las proformas viejas', async () => {
    const c = await ingresar('nain@jerusalen.demo')
    db.prepare("UPDATE proformas SET estado = 'enviada' WHERE id = (SELECT id FROM proformas WHERE estado = 'vencida' LIMIT 1)").run()
    await c.get('/api/proformas')
    expect(db.prepare("SELECT COUNT(*) n FROM proformas WHERE estado = 'enviada' AND date(fecha, '+' || validez_dias || ' days') < '2026-11-25'").get().n).toBe(0)
  })
})

describe('matriz de corte conectada a la API', () => {
  it('valida y guarda cortes, sincroniza retazos e historial', async () => {
    const c = await ingresar('marcelo@jerusalen.demo')
    const pl = db.prepare("SELECT id FROM planchas WHERE estado = 'disponible' LIMIT 1").get()
    const datos = (await c.get(`/api/planchas/${pl.id}/cortes`)).datos
    expect(datos.cortes).toEqual([])
    const malo = await c.post(`/api/planchas/${pl.id}/cortes`, { plancha: datos.plancha, cortes: [{ id: 'a', x: 0, y: 0, w: 50, h: 50, tipo: 'vendido' }, { id: 'b', x: 10, y: 10, w: 50, h: 50, tipo: 'merma' }] })
    expect(malo.estado).toBe(422)
    const bueno = await c.post(`/api/planchas/${pl.id}/cortes`, {
      plancha: datos.plancha,
      cortes: [
        { id: 'a', x: 0, y: 0, w: 200, h: 62, tipo: 'vendido', nota: 'Mesón' },
        { id: 'r', x: 200, y: 0, w: 100, h: 80, tipo: 'retazo' },
        { id: 'h', x: 200, y: 0, w: 40, h: 40, tipo: 'vendido', padreId: 'r' },
        { id: 'm', x: 0, y: 165, w: 300, h: 5, tipo: 'merma' },
      ],
    })
    expect(bueno.estado).toBe(200)
    expect(bueno.datos.estado).toBe('en_corte')
    const retazo = db.prepare("SELECT * FROM retazos WHERE plancha_id = ? AND corte_id = 'r'").get(pl.id)
    expect(retazo).toMatchObject({ ancho: 100, alto: 80, estado: 'recortado' })
    expect(retazo.libre_m2).toBeCloseTo(0.8 - 0.16)
    expect((await c.get(`/api/planchas/${pl.id}/historial`)).datos).toHaveLength(1)
    // El id de la plancha debe coincidir
    expect((await c.post(`/api/planchas/${pl.id}/cortes`, { ...datos, plancha: { ...datos.plancha, id: 999999 } })).estado).toBe(422)
    // Un vendedor no puede guardar cortes
    const v = await ingresar('jorge@jerusalen.demo')
    expect((await v.post(`/api/planchas/${pl.id}/cortes`, datos)).estado).toBe(403)
  })
})

describe('inventario, costos, contabilidad y planilla', () => {
  it('una entrada de insumos suma stock y registra el egreso', async () => {
    const c = await ingresar('nain@jerusalen.demo')
    const mat = db.prepare("SELECT id FROM materiales WHERE codigo = 'INS-CEM'").get()
    const antes = db.prepare('SELECT cantidad FROM existencias WHERE material_id = ? AND sucursal_id = 2').get(mat.id).cantidad
    const egAntes = db.prepare("SELECT COUNT(*) n FROM egresos WHERE categoria = 'compras'").get().n
    expect((await c.post('/api/movimientos', { material_id: mat.id, sucursal_id: 2, tipo: 'entrada', cantidad: 10, costo_unit: 62, referencia: 'Prueba' })).estado).toBe(201)
    expect(db.prepare('SELECT cantidad FROM existencias WHERE material_id = ? AND sucursal_id = 2').get(mat.id).cantidad).toBe(antes + 10)
    expect(db.prepare("SELECT COUNT(*) n FROM egresos WHERE categoria = 'compras'").get().n).toBe(egAntes + 1)
    // Entrada de planchas crea planchas individuales
    const pl = db.prepare("SELECT id FROM materiales WHERE codigo = 'SIN-CAL'").get()
    const r = await c.post('/api/movimientos', { material_id: pl.id, sucursal_id: 2, tipo: 'entrada', cantidad: 3, costo_unit: 900, registrar_egreso: false })
    expect(r.datos.planchas).toHaveLength(3)
    const lista = (await c.get('/api/compras')).datos
    expect(Array.isArray(lista)).toBe(true)
  })
  it('calcula y guarda proyectos', async () => {
    const c = await ingresar('alvaro@jerusalen.demo')
    const calc = await c.post('/api/proyectos/calcular', { largo_m: 7, ancho_m: 8, costo_m2: 290, margen_pct: 30 })
    expect(calc.datos.m2).toBe(56)
    const nuevo = await c.post('/api/proyectos', { nombre: 'Piso de prueba', entrada: { largo_m: 4, ancho_m: 5, costo_m2: 300, margen_pct: 25 } })
    expect(nuevo.estado).toBe(201)
    expect(nuevo.datos.calculo.m2).toBe(20)
    expect((await c.post('/api/proyectos', { nombre: 'Malo', entrada: { largo_m: 0 } })).estado).toBe(422)
  })
  it('resultado contable y cuentas por cobrar', async () => {
    const c = await ingresar('patricia@jerusalen.demo')
    const r = (await c.get('/api/contabilidad/resultado')).datos
    expect(r.meses).toHaveLength(12)
    expect(r.meses.every((m) => Math.abs(m.resultado - (m.ingresos - m.egresos)) < 0.02)).toBe(true)
    const cob = (await c.get('/api/contabilidad/cobrar')).datos
    expect(cob.total).toBeGreaterThan(0)
    const csv = await c.get('/api/contabilidad/libro.csv?periodo=2026-10')
    expect(csv.datos.replace(/^\uFEFF/, '').startsWith('Fecha;Tipo')).toBe(true)
  })
  it('cierra la planilla del mes una sola vez y registra los sueldos', async () => {
    const c = await ingresar('fernanda@jerusalen.demo')
    const p = (await c.get('/api/planillas/2026-11')).datos
    expect(p.cerrada).toBe(false)
    expect(p.totales.trabajadores).toBe(20)
    const cerrada = await c.post('/api/planillas/2026-11/cerrar')
    expect(cerrada.datos.cerrada).toBe(true)
    expect(db.prepare("SELECT ROUND(SUM(monto),2) t FROM egresos WHERE categoria='planilla' AND fecha='2026-11-30'").get().t).toBeCloseTo(p.totales.total_ganado, 1)
    expect((await c.post('/api/planillas/2026-11/cerrar')).estado).toBe(422)
    expect((await c.post('/api/planillas/2027-01/cerrar')).estado).toBe(422)
  })
  it('reportes completos', async () => {
    const c = await ingresar('nain@jerusalen.demo')
    const r = (await c.get('/api/reportes')).datos
    expect(r.porMes.length).toBeGreaterThanOrEqual(12)
    expect(r.tendencias.find((t) => t.estado === 'moda')).toBeTruthy()
    expect(r.vendedores).toHaveLength(4)
    expect(r.productos.masVendidos.length).toBeGreaterThan(0)
  })
})
