// Datos de demostración realistas (Santa Cruz, Bolivia, en Bs), deterministas:
// la misma semilla produce siempre los mismos datos.
//
//   npm run demo:reiniciar      → borra la base y la vuelve a llenar
//
// Contiene: 3 sucursales, 11 usuarios, 20 trabajadores, ~120 clientes, 41 materiales,
// 12 meses de ventas con estacionalidad y una «moda» creciente (sinterizada Calacatta),
// proformas con conversión distinta por vendedor, proyectos con costos, planchas con
// cortes y retazos, egresos y planillas cerradas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { agregarCorte } from '@jerusalen/matriz-corte/geometria'
import {
  INSUMOS_TIPICOS, PLANILLA_POR_DEFECTO, calcularCostoProyecto, calcularPlanilla, calcularTotales, diaSemana,
  finDeMes, rangoMeses, sumarDias, sumarMeses,
} from '@jerusalen/reportes'
import { abrirBD, guardarAjuste } from './db.js'
import { config } from './config.js'
import { crearVenta, guardarCortes, normalizarItems, sincronizarExistenciaPlanchas } from './servicios.js'
import { crearPlancha } from './rutas/inventario.js'
import { AJUSTES_POR_DEFECTO } from './rutas/base.js'

function crearAzar(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const USUARIOS_DEMO = [
  { nombre: 'Don Emiliano Acero', email: 'emiliano@jerusalen.demo', rol: 'dueno', sucursal: 1, pin: true },
  { nombre: 'Nain Torrico', email: 'nain@jerusalen.demo', rol: 'administrador', sucursal: 1 },
  { nombre: 'Carla Mendoza', email: 'carla@jerusalen.demo', rol: 'vendedor', sucursal: 1 },
  { nombre: 'Jorge Suárez', email: 'jorge@jerusalen.demo', rol: 'vendedor', sucursal: 1 },
  { nombre: 'Lucía Vaca', email: 'lucia@jerusalen.demo', rol: 'vendedor', sucursal: 3 },
  { nombre: 'Rodrigo Justiniano', email: 'rodrigo@jerusalen.demo', rol: 'vendedor', sucursal: 3 },
  { nombre: 'Marcelo Rojas', email: 'marcelo@jerusalen.demo', rol: 'cortador', sucursal: 2 },
  { nombre: 'Wilson Cuéllar', email: 'wilson@jerusalen.demo', rol: 'cortador', sucursal: 2 },
  { nombre: 'Álvaro Montaño', email: 'alvaro@jerusalen.demo', rol: 'cortador', sucursal: 2 },
  { nombre: 'Patricia Ribera', email: 'patricia@jerusalen.demo', rol: 'contador', sucursal: 1 },
  { nombre: 'Fernanda Áñez', email: 'fernanda@jerusalen.demo', rol: 'rrhh', sucursal: 1 },
]

// [nombre, cargo, sucursal, ingreso, sueldo, email del usuario vinculado]
const TRABAJADORES = [
  ['Nain Torrico', 'Administrador general', 1, '2015-03-02', 7000, 'nain'],
  ['Carla Mendoza', 'Vendedora', 1, '2019-06-17', 3800, 'carla'],
  ['Jorge Suárez', 'Vendedor', 1, '2021-02-01', 3500, 'jorge'],
  ['Patricia Ribera', 'Contadora', 1, '2017-09-04', 4500, 'patricia'],
  ['Fernanda Áñez', 'Recursos humanos y caja', 1, '2020-01-13', 4200, 'fernanda'],
  ['Mirtha Guzmán', 'Limpieza y mantenimiento', 1, '2012-05-07', 2750],
  ['Lucía Vaca', 'Vendedora', 3, '2018-04-09', 3800, 'lucia'],
  ['Rodrigo Justiniano', 'Vendedor', 3, '2023-07-03', 3300, 'rodrigo'],
  ['Gabriela Paz', 'Asistente de ventas', 3, '2024-08-19', 2900],
  ['Ronald Chávez', 'Seguridad', 3, '2016-10-03', 2800],
  ['Marcelo Rojas', 'Jefe de taller y cortador', 2, '2008-02-11', 5200, 'marcelo'],
  ['Wilson Cuéllar', 'Cortador', 2, '2013-08-05', 3800, 'wilson'],
  ['Freddy Mamani', 'Pulidor', 2, '2016-03-14', 3400],
  ['Edwin Quispe', 'Pulidor', 2, '2019-11-04', 3200],
  ['Hugo Rivero', 'Colocador', 2, '2010-06-21', 3800],
  ['Mario Céspedes', 'Colocador', 2, '2014-01-20', 3600],
  ['Daniel Ortiz', 'Ayudante de taller', 2, '2025-03-10', 2800],
  ['Luis Peña', 'Ayudante de taller', 2, '2026-02-16', 2750],
  ['Ramiro Salvatierra', 'Chofer', 2, '2011-09-12', 3300],
  ['Álvaro Montaño', 'Arquitecto y medidor', 2, '2020-05-18', 4200, 'alvaro'],
]

// [código, nombre, tipo, origen, costo m², precio m², espesor]
const PLANCHAS = [
  ['GRA-NSG', 'Granito Negro San Gabriel', 'granito', 'Brasil', 290, 480, 2],
  ['GRA-BIT', 'Granito Blanco Itaúnas', 'granito', 'Brasil', 340, 560, 2],
  ['GRA-VUB', 'Granito Verde Ubatuba', 'granito', 'Brasil', 300, 490, 2],
  ['GRA-CIM', 'Granito Café Imperial', 'granito', 'Brasil', 360, 590, 2],
  ['GRA-BDA', 'Granito Branco Dallas', 'granito', 'Brasil', 330, 540, 2],
  ['GRA-ASC', 'Granito Amarillo Santa Cecilia', 'granito', 'Brasil', 320, 520, 2],
  ['GRA-PAB', 'Granito Preto Absoluto', 'granito', 'Brasil', 420, 690, 2],
  ['GRA-CAN', 'Granito Cinza Andorinha', 'granito', 'Brasil', 280, 460, 2],
  ['MAR-CAR', 'Mármol Blanco Carrara', 'marmol', 'Italia', 620, 1050, 2],
  ['MAR-CMA', 'Mármol Crema Marfil', 'marmol', 'España', 560, 950, 2],
  ['MAR-TRA', 'Travertino Romano', 'marmol', 'Turquía', 480, 820, 2],
  ['MAR-NMQ', 'Mármol Nero Marquina', 'marmol', 'España', 650, 1100, 2],
  ['MAR-COR', 'Mármol Calacatta Oro', 'marmol', 'Italia', 980, 1650, 2],
  ['CUA-BPO', 'Cuarzo Blanco Polar', 'cuarzo', 'Brasil', 690, 1180, 2],
  ['CUA-GES', 'Cuarzo Gris Estelar', 'cuarzo', 'Brasil', 710, 1200, 2],
  ['CUA-CAL', 'Cuarzo Calacatta', 'cuarzo', 'Brasil', 820, 1390, 2],
  ['CUA-NGA', 'Cuarzo Negro Galaxia', 'cuarzo', 'Brasil', 760, 1290, 2],
  ['SIN-CAL', 'Piedra sinterizada Calacatta', 'sinterizada', 'Brasil', 900, 1580, 1.2],
  ['SIN-NMQ', 'Piedra sinterizada Negro Marquina', 'sinterizada', 'Brasil', 880, 1540, 1.2],
  ['SIN-CON', 'Piedra sinterizada Concreto Gris', 'sinterizada', 'Brasil', 820, 1450, 1.2],
  ['SIN-ONX', 'Piedra sinterizada Ónix Perla', 'sinterizada', 'Brasil', 1050, 1850, 1.2],
  ['SIN-BLA', 'Piedra sinterizada Blanco Absoluto', 'sinterizada', 'Brasil', 840, 1480, 1.2],
]

// [código, nombre, tipo, unidad, costo, precio, rendimiento kg/m², presentación kg]
const INSUMOS = [
  ['INS-PEG', 'Pegamento porcelanato (bolsa 25 kg)', 'pegamento', 'bolsa', 58, 85, 5, 25],
  ['INS-CEM', 'Cemento (bolsa 50 kg)', 'cemento', 'bolsa', 62, 72, 2.5, 50],
  ['INS-PRE', 'Preciosa / fragüe (bolsa 5 kg)', 'fragüe', 'bolsa', 45, 65, 0.5, 5],
  ['INS-SEL', 'Sellador para piedra (1 L)', 'sellador', 'unidad', 95, 150, null, null],
  ['INS-DIS', 'Disco diamantado 14"', 'herramienta', 'unidad', 420, 0, null, null],
  ['INS-SIL', 'Silicona estructural', 'adhesivo', 'unidad', 38, 60, null, null],
  ['INS-EPO', 'Resina epóxica (kit 1 kg)', 'adhesivo', 'unidad', 140, 210, null, null],
  ['INS-PUL', 'Abrillantador para mármol (1 kg)', 'pulido', 'unidad', 110, 175, null, null],
  ['INS-MAS', 'Masilla poliéster (1 kg)', 'adhesivo', 'unidad', 55, 85, null, null],
  ['INS-ANC', 'Anclajes de acero para fachada (caja 50)', 'fijación', 'unidad', 180, 260, null, null],
  ['INS-LAV', 'Lavaplatos de acero bajo mesón', 'accesorio', 'unidad', 650, 980, null, null],
]

// [código, nombre, unidad, precio]
const SERVICIOS = [
  ['SER-COR', 'Corte recto a medida', 'ml', 45],
  ['SER-CAN', 'Canto pulido', 'ml', 80],
  ['SER-PER', 'Perforación para lavaplatos / grifería', 'unidad', 150],
  ['SER-COL', 'Colocación', 'm2', 120],
  ['SER-TRA', 'Transporte e instalación en obra', 'servicio', 350],
  ['SER-MED', 'Medición y visita técnica', 'servicio', 150],
]

const NOMBRES = ['María', 'Juan', 'Rosa', 'Carlos', 'Ana', 'Luis', 'Carmen', 'José', 'Silvia', 'Roberto', 'Elena', 'Miguel', 'Patricia', 'Fernando', 'Gladys', 'Óscar', 'Mónica', 'Ricardo', 'Teresa', 'Hernán', 'Lourdes', 'Víctor', 'Beatriz', 'Germán', 'Norma', 'Alfredo', 'Martha', 'Ernesto', 'Julia', 'Rolando']
const APELLIDOS = ['Gutiérrez', 'Vargas', 'Rojas', 'Suárez', 'Justiniano', 'Áñez', 'Saucedo', 'Ribera', 'Moreno', 'Peña', 'Chávez', 'Roca', 'Melgar', 'Paz', 'Velasco', 'Arteaga', 'Ortiz', 'Antelo', 'Cuéllar', 'Montaño', 'Salvatierra', 'Terrazas', 'Rivero', 'Egüez', 'Hurtado', 'Landívar', 'Parada', 'Zabala', 'Ardaya', 'Coimbra']
const EMPRESAS = [
  'Constructora Cruceña S.R.L.', 'Inmobiliaria Las Palmas', 'Cocinas Integrales Oriente', 'Edificio Torre Equipetrol', 'Condominio Los Mangales',
  'Arq. Daniela Saucedo — Estudio de diseño', 'Hotel Los Tajibos (mantenimiento)', 'Constructora Urubó Norte', 'Muebles y Cocinas Chiquitanas', 'Iglesia Bautista Central',
]
const BARRIOS = ['Equipetrol', 'Urbarí', 'Las Palmas', 'Sirari', 'Urubó', 'Plan 3000', 'Villa 1ro de Mayo', 'Barrio Hamacas', 'Av. Beni', 'Av. Banzer 5to anillo', 'Los Lotes', 'Pampa de la Isla']

// Tipos de trabajo: m² típicos y servicios asociados
const TRABAJOS = {
  meson: { nombre: 'Mesón de cocina', m2: [2.2, 5.5], peso: 34 },
  bano: { nombre: 'Baño (mesón y zócalos)', m2: [1, 3.2], peso: 22 },
  piso: { nombre: 'Piso', m2: [14, 42], peso: 12 },
  gradas: { nombre: 'Gradas', m2: [6, 18], peso: 12 },
  fachada: { nombre: 'Revestimiento de fachada', m2: [12, 32], peso: 5 },
  plancha: { nombre: 'Venta de plancha entera', m2: [5.1, 5.1], peso: 12 },
}

export function sembrar(db, { hoy = config.fechaHoy || '2026-11-25', costoHash = 10, semilla = 2026 } = {}) {
  const azar = crearAzar(semilla)
  const entre = (a, b) => a + azar() * (b - a)
  const entero = (a, b) => Math.floor(entre(a, b + 1))
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)]
  const ponderado = (lista, peso) => {
    const total = lista.reduce((s, x) => s + peso(x), 0)
    let t = azar() * total
    for (const x of lista) if ((t -= peso(x)) <= 0) return x
    return lista[lista.length - 1]
  }
  const redondear5 = (n) => Math.round(n / 5) * 5
  const r2 = (n) => Math.round(n * 100) / 100
  const telefono = () => `${elegir(['6', '7'])}${entero(0, 9)}${String(entero(0, 999999)).padStart(6, '0')}`
  const hash = (v) => bcrypt.hashSync(v, costoHash)

  const mesActual = hoy.slice(0, 7)
  const inicio = `${sumarMeses(mesActual, -11)}-01`

  db.transaction(() => {
    // ── Ajustes ──
    guardarAjuste(db, 'empresa', { ...AJUSTES_POR_DEFECTO.empresa, nit: '0000000000 (demo)', telefono: '3 300 0000 (demo)', whatsapp: '70000000', direccion: 'Av. Banzer 4to anillo, Santa Cruz de la Sierra', email: 'ventas@jerusalen.demo' })
    guardarAjuste(db, 'proformas', AJUSTES_POR_DEFECTO.proformas)
    guardarAjuste(db, 'planilla', PLANILLA_POR_DEFECTO)

    // ── Sucursales ──
    const insSuc = db.prepare('INSERT INTO sucursales (id, nombre, tipo, direccion, telefono) VALUES (?,?,?,?,?)')
    insSuc.run(1, 'Casa Matriz — Showroom 4to anillo', 'mixta', 'Av. Banzer entre 4to y 5to anillo', '3 300 0001')
    insSuc.run(2, 'Fábrica Parque Industrial', 'fabrica', 'Parque Industrial, Mz. 14', '3 300 0002')
    insSuc.run(3, 'Showroom Equipetrol', 'showroom', 'Av. San Martín, Equipetrol', '3 300 0003')

    // ── Usuarios ──
    const insUsu = db.prepare('INSERT INTO usuarios (nombre, email, rol, sucursal_id, password_hash, pin_hash, telefono) VALUES (?,?,?,?,?,?,?)')
    const claveHash = hash(config.claveDemo)
    const idUsuario = {}
    for (const u of USUARIOS_DEMO) {
      const info = insUsu.run(u.nombre, u.email, u.rol, u.sucursal, u.rol === 'dueno' ? null : claveHash, u.pin ? hash(config.pinDemo) : null, telefono())
      idUsuario[u.email.split('@')[0]] = Number(info.lastInsertRowid)
    }
    // El administrador también puede entrar al panel del dueño con PIN 1234
    db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(hash('1234'), idUsuario.nain)

    // ── Trabajadores ──
    const insTra = db.prepare('INSERT INTO trabajadores (nombre, cargo, sucursal_id, fecha_ingreso, sueldo, telefono, usuario_id) VALUES (?,?,?,?,?,?,?)')
    for (const [nombre, cargo, suc, ingreso, sueldo, usu] of TRABAJADORES) insTra.run(nombre, cargo, suc, ingreso, sueldo, telefono(), usu ? idUsuario[usu] : null)
    // Un ex trabajador (para probar planillas históricas)
    db.prepare("INSERT INTO trabajadores (nombre, cargo, sucursal_id, fecha_ingreso, fecha_salida, sueldo, activo) VALUES ('Pedro Arancibia', 'Ayudante de taller', 2, '2022-04-04', ?, 2750, 0)").run(`${sumarMeses(mesActual, -4)}-15`)

    // ── Materiales ──
    const insMat = db.prepare(`INSERT INTO materiales (codigo, nombre, categoria, tipo, unidad, espesor_cm, ancho_cm, alto_cm, origen, costo, precio, rendimiento, presentacion)
                               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const materiales = {}
    for (const [cod, nombre, tipo, origen, costo, precio, esp] of PLANCHAS) {
      const tam = tipo === 'sinterizada' ? [320, 160] : tipo === 'cuarzo' ? [305, 140] : [300, 170]
      materiales[cod] = { id: Number(insMat.run(cod, nombre, 'plancha', tipo, 'm2', esp, tam[0], tam[1], origen, costo, precio, null, null).lastInsertRowid), cod, nombre, tipo, costo, precio, ancho: tam[0], alto: tam[1] }
    }
    for (const [cod, nombre, tipo, unidad, costo, precio, rend, pres] of INSUMOS) {
      materiales[cod] = { id: Number(insMat.run(cod, nombre, 'insumo', tipo, unidad, null, null, null, '', costo, precio, rend, pres).lastInsertRowid), cod, nombre, costo, precio, unidad }
    }
    for (const [cod, nombre, unidad, precio] of SERVICIOS) {
      materiales[cod] = { id: Number(insMat.run(cod, nombre, 'servicio', 'servicio', unidad, null, null, null, '', 0, precio, null, null).lastInsertRowid), cod, nombre, precio, unidad }
    }
    const listaPlanchas = PLANCHAS.map((p) => materiales[p[0]])

    // ── Clientes ──
    const insCli = db.prepare('INSERT INTO clientes (nombre, telefono, nit, direccion, notas) VALUES (?,?,?,?,?)')
    const clientes = []
    const usados = new Set()
    while (clientes.length < 110) {
      const n = `${elegir(NOMBRES)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`
      if (usados.has(n)) continue
      usados.add(n)
      clientes.push({ id: Number(insCli.run(n, telefono(), azar() < 0.3 ? String(entero(1000000, 9999999)) : '', `Barrio ${elegir(BARRIOS)}`, '').lastInsertRowid), empresa: false })
    }
    for (const e of EMPRESAS) clientes.push({ id: Number(insCli.run(e, telefono(), String(entero(100000000, 399999999)), `Zona ${elegir(BARRIOS)}`, 'Cliente corporativo').lastInsertRowid), empresa: true })

    // ── Vendedores: tasa de conversión distinta ──
    const vendedores = [
      { id: idUsuario.carla, suc: 1, peso: 30, tasa: 0.56 },
      { id: idUsuario.jorge, suc: 1, peso: 22, tasa: 0.34 },
      { id: idUsuario.lucia, suc: 3, peso: 28, tasa: 0.48 },
      { id: idUsuario.rodrigo, suc: 3, peso: 20, tasa: 0.26 },
    ]

    // Popularidad de cada material en el tiempo (la sinterizada Calacatta es la «moda»; el Verde Ubatuba cae)
    const diasHasta = (f) => (Date.parse(hoy) - Date.parse(f)) / 86400000
    const pesoMaterial = (m, fecha) => {
      const d = diasHasta(fecha)
      const base = { granito: 6, marmol: 2.4, cuarzo: 3, sinterizada: 1.4 }[m.tipo]
      if (m.cod === 'GRA-NSG') return 11
      if (m.cod === 'GRA-BIT') return 9
      if (m.cod === 'SIN-CAL') return d > 84 ? 0.5 : 0.5 + ((84 - d) / 84) * 22
      if (m.cod === 'GRA-VUB') return Math.max(0.6, 5 * (d / 365))
      if (m.cod === 'MAR-COR' || m.cod === 'SIN-ONX') return 0.6
      return base
    }
    const ESTACION = [0.72, 0.68, 0.85, 0.9, 1.0, 1.18, 1.22, 1.05, 0.95, 1.05, 1.32, 1.35] // ene … dic
    const SEMANA = [1, 1, 1, 1.05, 1.1, 1.45, 0.12] // lun … dom

    const itemsDeTrabajo = (tipo, material) => {
      const t = TRABAJOS[tipo]
      const m2 = r2(entre(t.m2[0], t.m2[1]))
      const precio = (p) => redondear5(p * entre(0.96, 1.04))
      const items = []
      if (tipo === 'plancha') {
        const nPlanchas = entero(1, 3)
        const area = (material.ancho * material.alto) / 10000
        items.push({ tipo: 'plancha', material_id: material.id, descripcion: `${material.nombre} — plancha entera ${material.ancho}×${material.alto} cm`, cantidad: r2(nPlanchas * area), unidad: 'm2', precio_unit: precio(material.precio * 0.93) })
        return items
      }
      if (tipo === 'meson' || tipo === 'bano') {
        const largo = Math.round(entre(tipo === 'meson' ? 180 : 80, tipo === 'meson' ? 360 : 160))
        const ancho = tipo === 'meson' ? 62 : 55
        const piezas = Math.max(1, Math.round((m2 * 10000) / (largo * ancho)))
        items.push({ tipo: 'pieza', material_id: material.id, descripcion: `${material.nombre} — ${t.nombre.toLowerCase()}`, ancho_cm: largo, alto_cm: ancho, piezas, unidad: 'm2', precio_unit: precio(material.precio) })
        items.push({ tipo: 'servicio', material_id: materiales['SER-CAN'].id, descripcion: 'Canto pulido', cantidad: r2((largo * piezas) / 100), unidad: 'ml', precio_unit: precio(materiales['SER-CAN'].precio) })
        items.push({ tipo: 'servicio', material_id: materiales['SER-PER'].id, descripcion: tipo === 'meson' ? 'Perforación para lavaplatos y grifería' : 'Perforación para lavamanos', cantidad: tipo === 'meson' ? 2 : 1, unidad: 'unidad', precio_unit: materiales['SER-PER'].precio })
        if (tipo === 'meson' && azar() < 0.35) items.push({ tipo: 'insumo', material_id: materiales['INS-LAV'].id, descripcion: materiales['INS-LAV'].nombre, cantidad: 1, unidad: 'unidad', precio_unit: materiales['INS-LAV'].precio })
      } else {
        items.push({ tipo: 'pieza', material_id: material.id, descripcion: `${material.nombre} — ${t.nombre.toLowerCase()}`, cantidad: m2, unidad: 'm2', precio_unit: precio(material.precio * 0.97) })
        items.push({ tipo: 'servicio', material_id: materiales['SER-COL'].id, descripcion: `Colocación de ${t.nombre.toLowerCase()}`, cantidad: m2, unidad: 'm2', precio_unit: precio(materiales['SER-COL'].precio) })
        if (azar() < 0.7) {
          items.push({ tipo: 'insumo', material_id: materiales['INS-PEG'].id, descripcion: materiales['INS-PEG'].nombre, cantidad: Math.ceil((m2 * 5) / 25), unidad: 'bolsa', precio_unit: materiales['INS-PEG'].precio })
          items.push({ tipo: 'insumo', material_id: materiales['INS-PRE'].id, descripcion: materiales['INS-PRE'].nombre, cantidad: Math.ceil((m2 * 0.5) / 5), unidad: 'bolsa', precio_unit: materiales['INS-PRE'].precio })
        }
        if (tipo === 'gradas') items.push({ tipo: 'servicio', material_id: materiales['SER-CAN'].id, descripcion: 'Canto pulido de huella', cantidad: r2(m2 * 3.2), unidad: 'ml', precio_unit: precio(materiales['SER-CAN'].precio) })
        if (tipo === 'fachada') items.push({ tipo: 'insumo', material_id: materiales['INS-ANC'].id, descripcion: materiales['INS-ANC'].nombre, cantidad: Math.ceil(m2 / 6), unidad: 'unidad', precio_unit: materiales['INS-ANC'].precio })
      }
      if (azar() < 0.45) items.push({ tipo: 'servicio', material_id: materiales['SER-TRA'].id, descripcion: 'Transporte e instalación en obra', cantidad: 1, unidad: 'servicio', precio_unit: materiales['SER-TRA'].precio })
      return items
    }

    // ── Generar negocios (proformas y ventas) día por día ──
    const negocios = []
    const diasTotales = Math.round((Date.parse(hoy) - Date.parse(inicio)) / 86400000)
    for (let i = 0; i <= diasTotales; i++) {
      const fecha = sumarDias(inicio, i)
      const esperado = 1.32 * ESTACION[Number(fecha.slice(5, 7)) - 1] * SEMANA[diaSemana(fecha)]
      const n = Math.floor(esperado + azar())
      for (let k = 0; k < n; k++) {
        const v = ponderado(vendedores, (x) => x.peso)
        const tipo = ponderado(Object.keys(TRABAJOS), (t) => TRABAJOS[t].peso)
        const material = ponderado(listaPlanchas, (m) => pesoMaterial(m, fecha))
        const cliente = ponderado(clientes, (c) => (c.empresa ? 3 : 1))
        const items = itemsDeTrabajo(tipo, material, fecha)
        const descuento = azar() < 0.68 ? 0 : azar() < 0.7 ? 5 : 10
        const conProforma = tipo !== 'plancha' ? azar() < 0.85 : azar() < 0.3
        const fechaProforma = conProforma ? sumarDias(fecha, -entero(1, 12)) : null
        negocios.push({ fechaVenta: fecha, fechaProforma: fechaProforma && fechaProforma >= sumarDias(inicio, -20) ? fechaProforma : conProforma ? fecha : null, vendedor: v, cliente, items, descuento, tipo, material })
        // Proformas que no se concretaron, según la tasa de cada vendedor
        if (conProforma) {
          const perdidasEsperadas = (1 - v.tasa) / v.tasa
          const n2 = Math.floor(perdidasEsperadas) + (azar() < perdidasEsperadas % 1 ? 1 : 0)
          for (let j = 0; j < n2; j++) {
            const f = sumarDias(fecha, -entero(0, 25))
            const t2 = ponderado(Object.keys(TRABAJOS), (t) => TRABAJOS[t].peso)
            const m2 = ponderado(listaPlanchas, (m) => pesoMaterial(m, f))
            negocios.push({ fechaVenta: null, fechaProforma: f < sumarDias(inicio, -20) ? sumarDias(inicio, -20) : f, vendedor: v, cliente: ponderado(clientes, (c) => (c.empresa ? 2 : 1)), items: itemsDeTrabajo(t2, m2, f), descuento: azar() < 0.7 ? 0 : 5, tipo: t2, material: m2 })
          }
        }
      }
    }
    // Algunas proformas recientes abiertas o en borrador
    for (let j = 0; j < 14; j++) {
      const f = sumarDias(hoy, -entero(0, 9))
      const v = ponderado(vendedores, (x) => x.peso)
      const t2 = ponderado(Object.keys(TRABAJOS).filter((t) => t !== 'plancha'), (t) => TRABAJOS[t].peso)
      const m2 = ponderado(listaPlanchas, (m) => pesoMaterial(m, f))
      negocios.push({ fechaVenta: null, fechaProforma: f, vendedor: v, cliente: elegir(clientes), items: itemsDeTrabajo(t2, m2, f), descuento: 0, tipo: t2, material: m2, borrador: j < 4 })
    }

    // ── Insertar proformas (en orden cronológico) ──
    const insProf = db.prepare(`INSERT INTO proformas (codigo, cliente_id, vendedor_id, sucursal_id, fecha, validez_dias, estado, descuento_pct, subtotal, total, notas, motivo, enviada_en)
                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const insPI = db.prepare(`INSERT INTO proforma_items (proforma_id, orden, tipo, material_id, descripcion, ancho_cm, alto_cm, piezas, cantidad, unidad, precio_unit, total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    const contador = {}
    const MOTIVOS = ['Precio alto', 'Eligió otro proveedor', 'Postergó la obra', 'No respondió', 'Cambió de material']
    for (const ng of negocios.filter((x) => x.fechaProforma).sort((a, b) => (a.fechaProforma < b.fechaProforma ? -1 : a.fechaProforma > b.fechaProforma ? 1 : 0))) {
      const items = normalizarItems(db, ng.items)
      ng.itemsNorm = items
      const t = calcularTotales(items, ng.descuento)
      const anio = ng.fechaProforma.slice(0, 4)
      contador[anio] = (contador[anio] ?? 0) + 1
      const validez = 15
      let estado
      let motivo = ''
      if (ng.fechaVenta) estado = 'convertida'
      else if (ng.borrador) estado = 'borrador'
      else if (sumarDias(ng.fechaProforma, validez) < hoy) {
        estado = azar() < 0.42 ? 'rechazada' : 'vencida'
        if (estado === 'rechazada') motivo = elegir(MOTIVOS)
      } else estado = azar() < 0.3 ? 'aceptada' : 'enviada'
      const info = insProf.run(`PRO-${anio}-${String(contador[anio]).padStart(4, '0')}`, ng.cliente.id, ng.vendedor.id, ng.vendedor.suc, ng.fechaProforma, validez, estado, t.descuentoPct, t.subtotal, t.total,
        `${TRABAJOS[ng.tipo].nombre} en ${elegir(BARRIOS)}.`, motivo, estado === 'borrador' ? null : ng.fechaProforma)
      ng.proformaId = Number(info.lastInsertRowid)
      for (const i of items) insPI.run(ng.proformaId, i.orden, i.tipo, i.material_id ?? null, i.descripcion, i.ancho_cm ?? null, i.alto_cm ?? null, i.piezas ?? null, i.cantidad, i.unidad, i.precio_unit, i.total)
    }

    // ── Insertar ventas y pagos ──
    const insPago = db.prepare('INSERT INTO pagos (venta_id, fecha, monto, metodo, referencia, usuario_id) VALUES (?,?,?,?,?,?)')
    const metodo = () => ponderado(['efectivo', 'qr', 'transferencia', 'tarjeta'], (m) => ({ efectivo: 30, qr: 32, transferencia: 30, tarjeta: 8 })[m])
    const contVenta = {}
    const ventasCreadas = []
    for (const ng of negocios.filter((x) => x.fechaVenta).sort((a, b) => (a.fechaVenta < b.fechaVenta ? -1 : a.fechaVenta > b.fechaVenta ? 1 : 0))) {
      const anio = ng.fechaVenta.slice(0, 4)
      contVenta[anio] = (contVenta[anio] ?? 0) + 1
      const id = crearVenta(db, {
        codigo: `VEN-${anio}-${String(contVenta[anio]).padStart(4, '0')}`,
        cliente_id: ng.cliente.id, vendedor_id: ng.vendedor.id, sucursal_id: ng.vendedor.suc, fecha: ng.fechaVenta,
        proforma_id: ng.proformaId ?? null, descuento_pct: ng.descuento, items: ng.items,
      }, { hoy, registrarStock: false })
      if (ng.proformaId) db.prepare('UPDATE proformas SET venta_id = ? WHERE id = ?').run(id, ng.proformaId)
      const total = db.prepare('SELECT total FROM ventas WHERE id = ?').get(id).total
      const antiguedadDias = diasHasta(ng.fechaVenta)
      const usuarioCaja = ng.vendedor.id
      const p = azar()
      if (antiguedadDias > 35 || p < 0.6) {
        if (ng.tipo === 'plancha' || azar() < 0.4) insPago.run(id, ng.fechaVenta, total, metodo(), '', usuarioCaja)
        else {
          const anticipo = r2(total * 0.5)
          insPago.run(id, ng.fechaVenta, anticipo, metodo(), 'Anticipo 50 %', usuarioCaja)
          const f2 = sumarDias(ng.fechaVenta, entero(4, 28))
          if (f2 <= hoy) insPago.run(id, f2, r2(total - anticipo), metodo(), 'Saldo contra entrega', usuarioCaja)
        }
      } else if (p < 0.9) insPago.run(id, ng.fechaVenta, r2(total * 0.5), metodo(), 'Anticipo 50 %', usuarioCaja)
      ventasCreadas.push({ id, ng, total })
    }
    // Una venta anulada (para mostrar el caso)
    if (ventasCreadas.length > 30) {
      const v = ventasCreadas[ventasCreadas.length - 30]
      db.prepare("UPDATE ventas SET estado = 'anulada', notas = notas || '\n[Anulada] Cliente desistió antes del corte' WHERE id = ?").run(v.id)
      db.prepare('DELETE FROM pagos WHERE venta_id = ?').run(v.id)
      if (v.ng.proformaId) db.prepare("UPDATE proformas SET estado = 'rechazada', venta_id = NULL, motivo = 'Desistió después de aceptar' WHERE id = ?").run(v.ng.proformaId)
    }

    // ── Proyectos con costos (pisos, gradas y fachadas) ──
    const insPry = db.prepare(`INSERT INTO proyectos (codigo, nombre, cliente_id, sucursal_id, material_id, venta_id, estado, fecha, fecha_fin, entrada, m2, costo_total, precio, creado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    let nPry = 0
    const nombreCliente = db.prepare('SELECT nombre FROM clientes WHERE id = ?')
    for (const v of ventasCreadas.filter((x) => ['piso', 'gradas', 'fachada'].includes(x.ng.tipo))) {
      const pieza = v.ng.items[0]
      const m2 = pieza.cantidad
      const lado = Math.sqrt(m2)
      const largo = r2(lado * entre(1.1, 1.4))
      const entrada = {
        largo_m: largo, ancho_m: r2(m2 / largo), costo_m2: v.ng.material.costo, desperdicio_pct: v.ng.tipo === 'gradas' ? 15 : 10,
        area_plancha_m2: r2((v.ng.material.ancho * v.ng.material.alto) / 10000), insumos: INSUMOS_TIPICOS,
        horas: Math.round(m2 * (v.ng.tipo === 'fachada' ? 1.6 : 1.1)), costo_hora: 28, otros: redondear5(entre(150, 450)), margen_pct: entero(28, 38),
      }
      const c = calcularCostoProyecto(entrada)
      const dias = diasHasta(v.ng.fechaVenta)
      const estado = dias > 25 ? 'colocado' : dias > 6 ? 'en_produccion' : 'cotizado'
      const anio = v.ng.fechaVenta.slice(0, 4)
      nPry += 1
      insPry.run(`PRY-${anio}-${String(nPry).padStart(4, '0')}`, `${TRABAJOS[v.ng.tipo].nombre} — ${nombreCliente.get(v.ng.cliente.id).nombre}`, v.ng.cliente.id, 2, v.ng.material.id, v.id,
        estado, v.ng.fechaVenta, estado === 'colocado' ? sumarDias(v.ng.fechaVenta, entero(10, 22)) : null, JSON.stringify(entrada), c.m2, c.costoTotal, c.precio, idUsuario.alvaro)
    }
    // El ejemplo del pedido: piso de 7 m × 8 m
    const ejemplo = { largo_m: 7, ancho_m: 8, costo_m2: materiales['GRA-NSG'].costo, desperdicio_pct: 10, area_plancha_m2: 5.1, insumos: INSUMOS_TIPICOS, horas: 60, costo_hora: 28, otros: 350, margen_pct: 30 }
    const ce = calcularCostoProyecto(ejemplo)
    insPry.run(`PRY-${hoy.slice(0, 4)}-${String(nPry + 1).padStart(4, '0')}`, 'Ejemplo: piso de 7 m × 8 m en Granito Negro San Gabriel', clientes[0].id, 2, materiales['GRA-NSG'].id, null, 'cotizado', hoy, null, JSON.stringify(ejemplo), ce.m2, ce.costoTotal, ce.precio, idUsuario.nain)

    // ── Planchas en inventario con cortes y retazos ──
    const planchasPorSuc = (m) => {
      const popular = ['GRA-NSG', 'GRA-BIT', 'GRA-BDA', 'CUA-BPO'].includes(m.cod)
      if (m.cod === 'SIN-CAL') return { 1: 0, 2: 2, 3: 1 } // la moda: poco stock → aparece en «qué comprar»
      if (m.cod === 'GRA-VUB') return { 1: 1, 2: 6, 3: 0 } // en caída: stock de sobra
      return { 1: popular ? 2 : entero(0, 1), 2: popular ? entero(5, 8) : entero(1, 4), 3: m.tipo === 'granito' ? 0 : entero(0, 1) }
    }
    const planchasCreadas = []
    for (const m of listaPlanchas) {
      for (const [suc, n] of Object.entries(planchasPorSuc(m))) {
        for (let k = 0; k < n; k++) {
          const f = sumarDias(hoy, -entero(10, 200))
          planchasCreadas.push({ id: crearPlancha(db, { material_id: m.id, sucursal_id: Number(suc), fecha: f, costo: m.costo }), m, suc: Number(suc), f })
        }
      }
    }
    // Cortar algunas planchas (en la fábrica) con la misma geometría del front
    const cortadores = [idUsuario.marcelo, idUsuario.marcelo, idUsuario.wilson, idUsuario.alvaro]
    const aCortar = planchasCreadas.filter((p) => p.suc === 2).filter(() => azar() < 0.42)
    for (const p of aCortar) {
      let estado = { plancha: { id: p.id, ancho: p.m.ancho, alto: p.m.alto, material: p.m.nombre, espesor: 2 }, cortes: [] }
      const cortador = elegir(cortadores)
      const descuidado = cortador === idUsuario.wilson
      let n = 0
      const intentar = (w, h, tipo, nota) => {
        for (let t = 0; t < 40; t++) {
          const x = entero(0, p.m.ancho - w)
          const y = entero(0, p.m.alto - h)
          const r = agregarCorte(estado, { x, y, w, h }, tipo, { id: `c${++n}`, nota })
          if (r.ok) {
            estado = r.estado
            return r.corte
          }
        }
        return null
      }
      // Canto irregular (merma) en un borde
      intentar(p.m.ancho, descuidado ? entero(5, 9) : entero(2, 5), 'merma', 'Canto de fábrica irregular')
      const piezas = entero(1, 4)
      for (let k = 0; k < piezas; k++) intentar(entero(120, 240), entero(55, 64), 'vendido', elegir(['Mesón cocina', 'Mesón baño', 'Isla', 'Barra desayunador']))
      for (let k = 0; k < entero(0, 3); k++) intentar(entero(30, 70), entero(30, 60), 'vendido', 'Zócalo / pieza chica')
      const retazo = intentar(entero(60, 110), entero(40, 70), 'retazo', '')
      if (retazo && azar() < 0.5) {
        // Recortar el retazo: una pieza hija dentro
        const w = Math.max(10, Math.floor(retazo.w * entre(0.3, 0.6)))
        const h = Math.max(10, Math.floor(retazo.h * entre(0.4, 0.9)))
        const r = agregarCorte(estado, { x: retazo.x, y: retazo.y, w, h }, 'vendido', { id: `c${++n}`, nota: 'Pieza de retazo' })
        if (r.ok) estado = r.estado
      }
      if (azar() < (descuidado ? 0.8 : 0.45)) intentar(entero(15, 45), entero(10, 30), 'merma', 'Fisura')
      const fecha = sumarDias(hoy, -entero(1, 85))
      guardarCortes(db, p.id, { plancha: estado.plancha, cortes: estado.cortes.map((c) => ({ ...c })) }, { usuarioId: cortador, fecha: fecha < p.f ? p.f : fecha })
    }
    for (const m of listaPlanchas) for (const suc of [1, 2, 3]) sincronizarExistenciaPlanchas(db, m.id, suc)

    // Mínimos de planchas por sucursal
    const minimoPlancha = db.prepare('UPDATE existencias SET minimo = ? WHERE material_id = ? AND sucursal_id = ?')
    for (const m of listaPlanchas) {
      const popular = ['GRA-NSG', 'GRA-BIT', 'GRA-BDA', 'CUA-BPO', 'SIN-CAL'].includes(m.cod)
      minimoPlancha.run(popular ? 4 : 1, m.id, 2)
      minimoPlancha.run(popular ? 1 : 0, m.id, 1)
      minimoPlancha.run(m.tipo === 'granito' ? 0 : popular ? 1 : 0, m.id, 3)
    }
    // Insumos: stock en fábrica y casa matriz
    const insEx = db.prepare('INSERT INTO existencias (material_id, sucursal_id, cantidad, minimo) VALUES (?,?,?,?) ON CONFLICT(material_id, sucursal_id) DO UPDATE SET cantidad = excluded.cantidad, minimo = excluded.minimo')
    const stockInsumos = { 'INS-PEG': [60, 40, 12, 10], 'INS-CEM': [35, 30, 0, 0], 'INS-PRE': [9, 15, 6, 5], 'INS-SEL': [14, 10, 8, 6], 'INS-DIS': [2, 4, 0, 0], 'INS-SIL': [30, 20, 10, 8],
      'INS-EPO': [6, 5, 2, 2], 'INS-PUL': [8, 6, 3, 3], 'INS-MAS': [12, 10, 0, 0], 'INS-ANC': [3, 6, 0, 0], 'INS-LAV': [4, 3, 3, 2] }
    for (const [cod, [s2, min2, s1, min1]] of Object.entries(stockInsumos)) {
      insEx.run(materiales[cod].id, 2, s2, min2)
      insEx.run(materiales[cod].id, 1, s1, min1)
    }

    // ── Egresos mensuales ──
    const insEg = db.prepare('INSERT INTO egresos (fecha, sucursal_id, categoria, descripcion, monto, proveedor, planilla_id) VALUES (?,?,?,?,?,?,?)')
    const meses = rangoMeses(inicio.slice(0, 7), mesActual)
    const ventasMesSuc = db.prepare("SELECT sucursal_id, SUM(total) total, SUM(costo) costo FROM ventas WHERE estado='vigente' AND fecha LIKE ? GROUP BY sucursal_id")
    const trabajadores = db.prepare('SELECT * FROM trabajadores').all()
    const enRango = (f) => (f <= hoy ? f : null)
    for (const mes of meses) {
      const dia = (d) => enRango(`${mes}-${String(d).padStart(2, '0')}`)
      const alquileres = { 1: 9000, 2: 6000, 3: 7500 }
      for (const suc of [1, 2, 3]) {
        if (dia(5)) insEg.run(dia(5), suc, 'alquiler', `Alquiler ${mes}`, alquileres[suc], 'Propietario del inmueble', null)
        if (dia(10)) insEg.run(dia(10), suc, 'servicios', `CRE (luz), SAGUAPAC (agua) e internet ${mes}`, redondear5(suc === 2 ? entre(2600, 3600) : entre(900, 1500)), 'CRE / SAGUAPAC / Tigo', null)
      }
      if (dia(12)) insEg.run(dia(12), 2, 'transporte', 'Combustible y mantenimiento de camioneta', redondear5(entre(1800, 3200)), 'Surtidor / taller', null)
      if (azar() < 0.55 && dia(18)) insEg.run(dia(18), 2, 'mantenimiento', elegir(['Cambio de discos y repuestos de la cortadora', 'Mantenimiento de pulidora', 'Reparación del puente grúa']), redondear5(entre(600, 2800)), 'Servicio técnico', null)
      // Compras: reposición del material vendido (importación desde Brasil + insumos)
      const vm = ventasMesSuc.all(`${mes}%`)
      const costoMes = vm.reduce((s, x) => s + x.costo, 0)
      const fCompra1 = dia(8)
      const fCompra2 = dia(22)
      if (fCompra1) insEg.run(fCompra1, 2, 'compras', 'Importación de planchas desde Brasil (contenedor parcial)', r2(costoMes * entre(0.55, 0.7)), 'Exportadora Vitória (ES, Brasil)', null)
      if (fCompra2) insEg.run(fCompra2, 2, 'compras', 'Insumos: pegamento, preciosa, discos y selladores', r2(costoMes * entre(0.12, 0.2)), 'Ferretería Industrial Santa Cruz', null)
      if (fCompra2) insEg.run(fCompra2, 1, 'compras', 'Reposición showroom y accesorios', r2(costoMes * entre(0.12, 0.2)), 'Distribuidora Oriente', null)
      // Impuestos (aproximación demo): al cierre del mes
      if (mes < mesActual) for (const x of vm) insEg.run(finDeMes(mes), x.sucursal_id, 'impuestos', `IVA e IT ${mes} (aprox.)`, r2(x.total * 0.055), 'Impuestos Nacionales', null)
      // Planilla cerrada de cada mes anterior
      if (mes < mesActual) {
        const datos = calcularPlanilla(trabajadores, mes, PLANILLA_POR_DEFECTO)
        const pid = Number(db.prepare('INSERT INTO planillas (periodo, datos, total, cerrada) VALUES (?,?,?,1)').run(mes, JSON.stringify(datos), datos.totales.total_ganado).lastInsertRowid)
        for (const [suc, tot] of Object.entries(datos.porSucursal)) insEg.run(finDeMes(mes), Number(suc), 'planilla', `Planilla ${mes} (${tot.trabajadores} trabajadores)`, tot.total_ganado, '', pid)
      }
    }

    // ── Movimientos de ejemplo (entradas recientes) ──
    const insMov = db.prepare('INSERT INTO movimientos (fecha, material_id, sucursal_id, tipo, cantidad, costo_unit, referencia, usuario_id) VALUES (?,?,?,?,?,?,?,?)')
    insMov.run(sumarDias(hoy, -12), materiales['INS-PEG'].id, 2, 'entrada', 40, 58, 'Ferretería Industrial Santa Cruz', idUsuario.marcelo)
    insMov.run(sumarDias(hoy, -6), materiales['INS-SIL'].id, 1, 'entrada', 12, 38, 'Distribuidora Oriente', idUsuario.nain)
    insMov.run(sumarDias(hoy, -3), materiales['INS-PRE'].id, 2, 'ajuste', -2, 45, 'Conteo físico: bolsas dañadas', idUsuario.marcelo)
  })()

  return { ok: true }
}

// Uso por terminal: node src/semilla.js --reiniciar
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ruta = config.rutaBD || path.join(config.dirDatos, 'jerusalen-erp.sqlite')
  if (process.argv.includes('--reiniciar')) {
    for (const sufijo of ['', '-wal', '-shm']) if (fs.existsSync(ruta + sufijo)) fs.rmSync(ruta + sufijo)
    console.log('Base anterior borrada.')
  }
  const db = abrirBD(ruta)
  if (db.prepare('SELECT COUNT(*) n FROM usuarios').get().n > 0) {
    console.log('La base ya tiene datos. Usa --reiniciar para borrarla y cargar la demo de nuevo.')
  } else {
    const t = Date.now()
    sembrar(db)
    const c = (t2) => db.prepare(`SELECT COUNT(*) n FROM ${t2}`).get().n
    console.log(`Demo cargada en ${((Date.now() - t) / 1000).toFixed(1)} s: ${c('ventas')} ventas, ${c('proformas')} proformas, ${c('planchas')} planchas, ${c('plancha_cortes')} cortes, ${c('egresos')} egresos.`)
    console.log(`Usuarios: nain@jerusalen.demo (administrador) y los demás @jerusalen.demo con clave «${config.claveDemo}». PIN del dueño: ${config.pinDemo}.`)
  }
  db.close()
}
