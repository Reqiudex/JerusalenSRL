'use strict';
/**
 * Seed realista boliviano (Santa Cruz de la Sierra, Bs) — ERP Jerusalén S.R.L.
 * Uso: node api/seed.js [--reset]
 */
require('./env');
const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./db');
const { r2, calcularCostoProyecto, calcularMatrizCorte, calcularAntiguedad } = require('./compute');

const RESET = process.argv.includes('--reset');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jerusalen2026';
const DUENO_PIN = process.env.DUENO_PIN || '1954';

function resetAll() {
  db.pragma('foreign_keys = OFF');
  const tablas = [
    'movimientos_contables',
    'retazos',
    'planchas_corte',
    'proyectos_produccion',
    'venta_pagos',
    'venta_items',
    'ventas',
    'proforma_items',
    'proformas',
    'materiales',
    'clientes',
    'planillas',
    'trabajadores',
    'ajustes',
    'sesiones',
    'usuarios',
    'sucursales',
  ];
  for (const t of tablas) {
    db.exec(`DELETE FROM ${t};`);
  }
  try {
    db.exec("DELETE FROM sqlite_sequence;");
  } catch (_) {
    /* ignore */
  }
  db.pragma('foreign_keys = ON');
}

function seed(forceReset = RESET) {
  initSchema();
  const count = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c;
  if (count > 0 && !forceReset) {
    return { ok: true, skipped: true };
  }
  if (forceReset || count > 0) {
    resetAll();
  }

  const tx = db.transaction(() => {
    // 1. SUCURSALES (~3 sucursales en Santa Cruz, Bolivia)
    const sucursalesData = [
      {
        id: 1,
        codigo: 'KM13',
        nombre: 'Fábrica & Taller Central Km 13',
        tipo: 'taller',
        direccion: 'Km 13 Doble Vía La Guardia, Santa Cruz de la Sierra',
        telefono: '+591 70314442',
        ciudad: 'Santa Cruz de la Sierra',
        encargado: 'Nain Torrico',
      },
      {
        id: 2,
        codigo: 'PIRAI',
        nombre: 'Showroom 4to Anillo y Av. Piraí',
        tipo: 'showroom',
        direccion: '4to Anillo esq. Av. Piraí, Santa Cruz de la Sierra',
        telefono: '+591 67981545',
        ciudad: 'Santa Cruz de la Sierra',
        encargado: 'Rocío Saucedo',
      },
      {
        id: 3,
        codigo: 'ROCA',
        nombre: 'Almacén & Corte Roca y Coronado',
        tipo: 'almacen',
        direccion: '4to Anillo entre Av. Roca y Coronado y Centenario',
        telefono: '+591 77614004',
        ciudad: 'Santa Cruz de la Sierra',
        encargado: 'Marco Antonio Justiniano',
      },
    ];
    const insSuc = db.prepare(`
      INSERT INTO sucursales (id, codigo, nombre, tipo, direccion, telefono, ciudad, encargado, activo)
      VALUES (@id, @codigo, @nombre, @tipo, @direccion, @telefono, @ciudad, @encargado, 1)
    `);
    for (const s of sucursalesData) insSuc.run(s);

    // 2. USUARIOS Y ROLES
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    const usuariosData = [
      {
        id: 'usr-dueno',
        email: 'emiliano@jerusalensrl.com',
        nombre: 'Don Emiliano Acero',
        telefono: '+591 70300001',
        rol: 'dueno',
        rol_nombre: 'Dueño Fundador',
        sucursal_id: null,
        pin: DUENO_PIN,
        permisos: '["dueno","reportes"]',
      },
      {
        id: 'usr-admin',
        email: 'nain@jerusalensrl.com',
        nombre: 'Nain Torrico',
        telefono: '+591 70314442',
        rol: 'administrador',
        rol_nombre: 'Administrador General',
        sucursal_id: 1,
        pin: '2026',
        permisos: '["*"]',
      },
      {
        id: 'usr-nain-demo',
        email: 'nain@demo.test',
        nombre: 'Nain Torrico (Demo)',
        telefono: '+591 70314442',
        rol: 'administrador',
        rol_nombre: 'Administrador General',
        sucursal_id: 1,
        pin: '1234',
        permisos: '["*"]',
      },
      {
        id: 'usr-vend-1',
        email: 'rocio@jerusalensrl.com',
        nombre: 'Rocío Saucedo',
        telefono: '+591 67981545',
        rol: 'vendedor',
        rol_nombre: 'Vendedora Showroom',
        sucursal_id: 2,
        pin: null,
        permisos: '["proformas","ventas","inventario"]',
      },
      {
        id: 'usr-vend-2',
        email: 'carlos@jerusalensrl.com',
        nombre: 'Carlos Vaca Díez',
        telefono: '+591 78457414',
        rol: 'vendedor',
        rol_nombre: 'Asesor Comercial Taller',
        sucursal_id: 1,
        pin: null,
        permisos: '["proformas","ventas","inventario"]',
      },
      {
        id: 'usr-vend-3',
        email: 'valeria@jerusalensrl.com',
        nombre: 'Valeria Cronenbold',
        telefono: '+591 75387052',
        rol: 'vendedor',
        rol_nombre: 'Ejecutiva Proyectos y Obras',
        sucursal_id: 2,
        pin: null,
        permisos: '["proformas","ventas","inventario"]',
      },
      {
        id: 'usr-cort-1',
        email: 'paco@jerusalensrl.com',
        nombre: 'Arq. Marco Justiniano',
        telefono: '+591 77614004',
        rol: 'cortador',
        rol_nombre: 'Maestro Cortador / Arquitecto',
        sucursal_id: 1,
        pin: null,
        permisos: '["produccion","matriz","inventario"]',
      },
      {
        id: 'usr-cort-2',
        email: 'Ramiro@jerusalensrl.com',
        nombre: 'Ramiro Mamani',
        telefono: '+591 71023411',
        rol: 'cortador',
        rol_nombre: 'Jefe de Sierra Puente',
        sucursal_id: 3,
        pin: null,
        permisos: '["produccion","matriz","inventario"]',
      },
      {
        id: 'usr-cont-1',
        email: 'contabilidad@jerusalensrl.com',
        nombre: 'Lic. Patricia Ribera',
        telefono: '+591 70981234',
        rol: 'contador',
        rol_nombre: 'Contadora General',
        sucursal_id: 1,
        pin: null,
        permisos: '["contabilidad","ventas","reportes"]',
      },
      {
        id: 'usr-rrhh-1',
        email: 'rrhh@jerusalensrl.com',
        nombre: 'Lic. Gabriela Paz',
        telefono: '+591 76012390',
        rol: 'rrhh',
        rol_nombre: 'Jefa de Recursos Humanos',
        sucursal_id: 1,
        pin: null,
        permisos: '["rrhh","contabilidad"]',
      },
    ];
    const insUsr = db.prepare(`
      INSERT INTO usuarios (id, email, nombre, telefono, rol, rol_nombre, sucursal_id, pin, activo, permisos, password_hash)
      VALUES (@id, @email, @nombre, @telefono, @rol, @rol_nombre, @sucursal_id, @pin, 1, @permisos, @password_hash)
    `);
    for (const u of usuariosData) insUsr.run({ ...u, password_hash: hash });

    // 3. TRABAJADORES (20 trabajadores ≈ 50.000 Bs/mes en total)
    const trabajadoresData = [
      // Sucursal 1: Fábrica Km 13 (10 trabajadores)
      { sucursal_id: 1, nombre: 'Nain Torrico', ci: '4612890 SC', cargo: 'Administrador General', seccion: 'administracion', fecha_ingreso: '2018-03-15', sueldo_bs: 4200, bono_bs: 300, coste_hora_bs: 35, telefono: '70314442' },
      { sucursal_id: 1, nombre: 'Marco Antonio Justiniano', ci: '5321980 SC', cargo: 'Arquitecto / Maestro Cortador', seccion: 'corte', fecha_ingreso: '2019-06-01', sueldo_bs: 3400, bono_bs: 200, coste_hora_bs: 32, telefono: '77614004' },
      { sucursal_id: 1, nombre: 'Carlos Vaca Díez', ci: '6214091 SC', cargo: 'Vendedor de Taller', seccion: 'showroom', fecha_ingreso: '2021-02-10', sueldo_bs: 2600, bono_bs: 250, coste_hora_bs: 25, telefono: '78457414' },
      { sucursal_id: 1, nombre: 'Patricia Ribera', ci: '5891203 SC', cargo: 'Contadora', seccion: 'administracion', fecha_ingreso: '2020-08-01', sueldo_bs: 3100, bono_bs: 150, coste_hora_bs: 28, telefono: '70981234' },
      { sucursal_id: 1, nombre: 'Gabriela Paz', ci: '6412098 SC', cargo: 'Encargada RRHH y Planillas', seccion: 'administracion', fecha_ingreso: '2022-01-15', sueldo_bs: 2700, bono_bs: 100, coste_hora_bs: 24, telefono: '76012390' },
      { sucursal_id: 1, nombre: 'Efraín Choque', ci: '7120491 LP', cargo: 'Operador Sierra Puente CNC', seccion: 'corte', fecha_ingreso: '2017-11-20', sueldo_bs: 2850, bono_bs: 200, coste_hora_bs: 28, telefono: '71392011' },
      { sucursal_id: 1, nombre: 'Wilfredo Condori', ci: '6981234 CB', cargo: 'Pulidor y Biselador 45°', seccion: 'taller', fecha_ingreso: '2020-04-12', sueldo_bs: 2450, bono_bs: 150, coste_hora_bs: 24, telefono: '72184920' },
      { sucursal_id: 1, nombre: 'Juan Carlos Flores', ci: '7812349 SC', cargo: 'Instalador Senior de Mesones', seccion: 'instalacion', fecha_ingreso: '2019-09-05', sueldo_bs: 2600, bono_bs: 200, coste_hora_bs: 26, telefono: '73109482' },
      { sucursal_id: 1, nombre: 'Rubén Darío Suárez', ci: '8123904 SC', cargo: 'Ayudante de Taller y Carga', seccion: 'taller', fecha_ingreso: '2023-05-10', sueldo_bs: 2100, bono_bs: 100, coste_hora_bs: 19, telefono: '69012384' },
      { sucursal_id: 1, nombre: 'Miguel Ángel Soliz', ci: '7492018 SC', cargo: 'Chofer Grúa Pluma', seccion: 'instalacion', fecha_ingreso: '2021-07-01', sueldo_bs: 2500, bono_bs: 150, coste_hora_bs: 24, telefono: '75019283' },

      // Sucursal 2: Showroom 4to Anillo Piraí (5 trabajadores)
      { sucursal_id: 2, nombre: 'Rocío Saucedo', ci: '5901283 SC', cargo: 'Jefa de Showroom y Ventas', seccion: 'showroom', fecha_ingreso: '2019-02-01', sueldo_bs: 2900, bono_bs: 350, coste_hora_bs: 28, telefono: '67981545' },
      { sucursal_id: 2, nombre: 'Valeria Cronenbold', ci: '6719204 SC', cargo: 'Ejecutiva Comercial Proyectos', seccion: 'showroom', fecha_ingreso: '2022-03-14', sueldo_bs: 2550, bono_bs: 300, coste_hora_bs: 25, telefono: '75387052' },
      { sucursal_id: 2, nombre: 'Fernando Gutiérrez', ci: '7391024 SC', cargo: 'Medidor Técnico de Obras', seccion: 'instalacion', fecha_ingreso: '2021-10-01', sueldo_bs: 2500, bono_bs: 150, coste_hora_bs: 24, telefono: '76610293' },
      { sucursal_id: 2, nombre: 'Daniela Melgar', ci: '8492011 SC', cargo: 'Recepción y Atención Showroom', seccion: 'showroom', fecha_ingreso: '2024-01-10', sueldo_bs: 2150, bono_bs: 100, coste_hora_bs: 20, telefono: '68910234' },
      { sucursal_id: 2, nombre: 'Héctor Pedraza', ci: '7612093 SC', cargo: 'Instalador de Revestimientos', seccion: 'instalacion', fecha_ingreso: '2020-11-18', sueldo_bs: 2450, bono_bs: 150, coste_hora_bs: 24, telefono: '77391022' },

      // Sucursal 3: Almacén & Corte Roca y Coronado (5 trabajadores)
      { sucursal_id: 3, nombre: 'Ramiro Mamani', ci: '6019283 LP', cargo: 'Maestro Cortador Almacén', seccion: 'corte', fecha_ingreso: '2018-08-20', sueldo_bs: 2950, bono_bs: 200, coste_hora_bs: 29, telefono: '71023411' },
      { sucursal_id: 3, nombre: 'Oscar Salvatierra', ci: '7219048 SC', cargo: 'Encargado de Caballetes y Stock', seccion: 'taller', fecha_ingreso: '2021-04-05', sueldo_bs: 2400, bono_bs: 150, coste_hora_bs: 23, telefono: '74901238' },
      { sucursal_id: 3, nombre: 'Limberg Quispe', ci: '7901284 CB', cargo: 'Pulidor de Cantos y Zócalos', seccion: 'taller', fecha_ingreso: '2022-09-12', sueldo_bs: 2300, bono_bs: 100, coste_hora_bs: 22, telefono: '67109283' },
      { sucursal_id: 3, nombre: 'Rolando Arteaga', ci: '8301924 SC', cargo: 'Instalador de Baños y Gradas', seccion: 'instalacion', fecha_ingreso: '2023-02-01', sueldo_bs: 2350, bono_bs: 150, coste_hora_bs: 22, telefono: '70019284' },
      { sucursal_id: 3, nombre: 'Bismarck Rojas', ci: '8601923 SC', cargo: 'Ayudante de Corte y Despacho', seccion: 'corte', fecha_ingreso: '2024-06-01', sueldo_bs: 2050, bono_bs: 100, coste_hora_bs: 19, telefono: '69201938' },
    ];

    const insTrab = db.prepare(`
      INSERT INTO trabajadores (sucursal_id, nombre, ci, cargo, seccion, fecha_ingreso, sueldo_bs, bono_bs, coste_hora_bs, telefono, activo)
      VALUES (@sucursal_id, @nombre, @ci, @cargo, @seccion, @fecha_ingreso, @sueldo_bs, @bono_bs, @coste_hora_bs, @telefono, 1)
    `);
    for (const t of trabajadoresData) insTrab.run(t);

    // Generar planilla mensual para 2026-10 y 2026-11
    const trabajadoresDB = db.prepare('SELECT * FROM trabajadores').all();
    const insPlan = db.prepare(`
      INSERT INTO planillas (periodo, sucursal_id, trabajador_id, sueldo_base_bs, bono_antiguedad_bs, otros_bonos_bs, descuentos_bs, liquido_bs, pagado, fecha_pago)
      VALUES (@periodo, @sucursal_id, @trabajador_id, @sueldo_base_bs, @bono_antiguedad_bs, @otros_bonos_bs, @descuentos_bs, @liquido_bs, 1, @fecha_pago)
    `);
    for (const per of ['2026-10', '2026-11']) {
      for (const t of trabajadoresDB) {
        const ant = calcularAntiguedad(t.fecha_ingreso, `${per}-25`);
        const bonoAnt = r2(t.sueldo_bs * (ant.pct_bono / 100) * 0.35);
        const liquido = r2(t.sueldo_bs + bonoAnt + t.bono_bs);
        insPlan.run({
          periodo: per,
          sucursal_id: t.sucursal_id,
          trabajador_id: t.id,
          sueldo_base_bs: t.sueldo_bs,
          bono_antiguedad_bs: bonoAnt,
          otros_bonos_bs: t.bono_bs,
          descuentos_bs: 0,
          liquido_bs: liquido,
          fecha_pago: `${per}-25`,
        });
      }
    }

    // 4. CLIENTES BOLIVIANOS (Santa Cruz)
    const clientesData = [
      { nombre: 'Constructora Urubó Golf S.A.', tipo: 'constructora', nit_ci: '1029384029', telefono: '+591 70011223', email: 'compras@urubogolf.bo', direccion: 'Condominio Urubó Golf Mz. 4', zona: 'Urubó' },
      { nombre: 'Sra. Hortensia Vda. de Cronenbold', tipo: 'particular', nit_ci: '2819203', telefono: '+591 70819203', email: 'hortensia@correo.bo', direccion: 'Barrio Equipetrol Calle 7 Oeste #45', zona: 'Equipetrol' },
      { nombre: 'Dr. Humberto Castedo & Familia', tipo: 'particular', nit_ci: '1928374', telefono: '+591 77312094', email: 'hcastedo@clinica.bo', direccion: 'Las Palmas Av. Ibérica #120', zona: 'Las Palmas' },
      { nombre: 'Arq. Claudia Foianini Estudio', tipo: 'arquitecto', nit_ci: '4819203018', telefono: '+591 75019284', email: 'estudio@foianini.bo', direccion: 'Av. San Martín Calle Guapomo', zona: 'Equipetrol Norte' },
      { nombre: 'Condominio La Hacienda del Norte', tipo: 'condominio', nit_ci: '3910284011', telefono: '+591 76301928', email: 'admin@lahacienda.bo', direccion: 'Av. Banzer Km 8.5 al Norte', zona: 'Zona Norte' },
      { nombre: 'Don Ruperto Aguilera', tipo: 'particular', nit_ci: '1582910', telefono: '+591 71029384', email: '', direccion: 'Av. Santos Dumont 3er Anillo Interno', zona: 'Sur' },
      { nombre: 'Sra. Martha Kempff de Paz', tipo: 'particular', nit_ci: '1829301', telefono: '+591 72109384', email: '', direccion: 'Barrio Urbarí Calle Igmiri #88', zona: 'Urbarí' },
      { nombre: 'Edificio Torre Platinum II', tipo: 'constructora', nit_ci: '5019283019', telefono: '+591 78019283', email: 'obras@platinumscz.bo', direccion: '4to Anillo Canal Isuto', zona: 'Equipetrol' },
      { nombre: 'Don Teófilo Monasterio', tipo: 'particular', nit_ci: '1492019', telefono: '+591 70918273', email: '', direccion: 'Av. Busch 2do Anillo #310', zona: 'Centro / Busch' },
      { nombre: 'Sra. Gladys Coimbra', tipo: 'particular', nit_ci: '2109384', telefono: '+591 76019284', email: '', direccion: 'Doble Vía La Guardia Km 9', zona: 'La Guardia' },
      { nombre: 'Restaurante Churrasquería El Arriero', tipo: 'particular', nit_ci: '3019284012', telefono: '+591 75510293', email: 'gerencia@elarriero.bo', direccion: 'Av. Cristo Redentor 5to Anillo', zona: 'Norte' },
      { nombre: 'Ing. Roberto Landívar', tipo: 'arquitecto', nit_ci: '3819204', telefono: '+591 77601928', email: 'rlandivar@proyectos.bo', direccion: 'Colinas del Urubó Sector 2', zona: 'Urubó' },
    ];
    const insCli = db.prepare(`
      INSERT INTO clientes (nombre, tipo, nit_ci, telefono, email, direccion, zona, notas)
      VALUES (@nombre, @tipo, @nit_ci, @telefono, @email, @direccion, @zona, 'Cliente atendido en showroom/taller')
    `);
    for (const c of clientesData) insCli.run(c);

    // 5. MATERIALES (~40 materiales importados de Brasil + insumos de colocación)
    const materialesData = [
      // Piedra Sinterizada (LA MODA CRECIENTE 2026)
      { codigo: 'SIN-001', sucursal_id: 1, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Taj Mahal Gold Brasil', acabado: 'Satinado Velvet', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Sinterizados Paraná Tech', costo_bs: 720, precio_m2_bs: 1250, stock: 18.4, planchas_stock: 3, minimo: 30, muestra: { fondo: '#f2ece1', veta: '#c9a86a', motas: '#d8ccb8' } },
      { codigo: 'SIN-002', sucursal_id: 2, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Laurent Noir Gold', acabado: 'Mate Sedoso', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Sinterizados Paraná Tech', costo_bs: 760, precio_m2_bs: 1320, stock: 12.8, planchas_stock: 2, minimo: 25, muestra: { fondo: '#18181b', veta: '#d4af37', motas: '#3f3f46' } },
      { codigo: 'SIN-003', sucursal_id: 1, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Calacatta Viola Lux', acabado: 'Pulido Espejo', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Brasil Stone Tech', costo_bs: 790, precio_m2_bs: 1380, stock: 25.6, planchas_stock: 5, minimo: 20, muestra: { fondo: '#faf8f5', veta: '#6b3fa0', motas: '#c9a86a' } },
      { codigo: 'SIN-004', sucursal_id: 2, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Patagonia Translúcida', acabado: 'Alto Brillo', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 820, precio_m2_bs: 1450, stock: 10.2, planchas_stock: 2, minimo: 20, muestra: { fondo: '#ede6d6', veta: '#8c6239', motas: '#2b2b2b' } },
      { codigo: 'SIN-005', sucursal_id: 3, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Travertino Romano Mate', acabado: 'Poroso Natural', grosor_mm: 12, largo_cm: 300, ancho_cm: 150, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Sinterizados Paraná Tech', costo_bs: 680, precio_m2_bs: 1180, stock: 31.5, planchas_stock: 7, minimo: 18, muestra: { fondo: '#dfd3c3', veta: '#b09b82', motas: '#c7b198' } },
      { codigo: 'SIN-006', sucursal_id: 1, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Grigio Carnico', acabado: 'Satinado', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Brasil Stone Tech', costo_bs: 690, precio_m2_bs: 1190, stock: 35.8, planchas_stock: 7, minimo: 15, muestra: { fondo: '#3b3d42', veta: '#e2e4e8', motas: '#6c7078' } },
      { codigo: 'SIN-007', sucursal_id: 2, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Statuario Extra Brasil', acabado: 'Pulido Cristal', grosor_mm: 15, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Sinterizados Paraná Tech', costo_bs: 740, precio_m2_bs: 1290, stock: 15.3, planchas_stock: 3, minimo: 25, muestra: { fondo: '#ffffff', veta: '#8e939e', motas: '#d4af37' } },
      { codigo: 'SIN-008', sucursal_id: 3, familia: 'plancha', categoria: 'sinterizado', nombre: 'Piedra Sinterizada Sahara Noir Brasil', acabado: 'Mate', grosor_mm: 12, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Sinterizados Paraná Tech', costo_bs: 710, precio_m2_bs: 1240, stock: 20.4, planchas_stock: 4, minimo: 15, muestra: { fondo: '#121316', veta: '#c9a86a', motas: '#ffffff' } },

      // Mármoles Brasileños e Importados (10 materiales)
      { codigo: 'MAR-001', sucursal_id: 1, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Blanco Calacatta Gold Brasil', acabado: 'Pulido Espejo', grosor_mm: 20, largo_cm: 300, ancho_cm: 170, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 650, precio_m2_bs: 1150, stock: 15.3, planchas_stock: 3, minimo: 25, muestra: { fondo: '#fbf9f5', veta: '#c9a86a', motas: '#9ca3af' } },
      { codigo: 'MAR-002', sucursal_id: 2, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Negro Marquina Royal', acabado: 'Pulido', grosor_mm: 20, largo_cm: 295, ancho_cm: 175, unidad: 'm2', origen: 'Minas Gerais, Brasil', proveedor: 'Granitos do Brasil Export', costo_bs: 580, precio_m2_bs: 980, stock: 30.9, planchas_stock: 6, minimo: 15, muestra: { fondo: '#16171a', veta: '#f3f4f6', motas: '#d4af37' } },
      { codigo: 'MAR-003', sucursal_id: 1, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Blanco Paraná Clásico', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 170, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Mármores do Sul', costo_bs: 520, precio_m2_bs: 890, stock: 45.9, planchas_stock: 9, minimo: 20, muestra: { fondo: '#f5f5f4', veta: '#a8a29e', motas: '#d6d3d1' } },
      { codigo: 'MAR-004', sucursal_id: 3, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Crema Marfil Imperial', acabado: 'Pulido Suave', grosor_mm: 20, largo_cm: 290, ancho_cm: 170, unidad: 'm2', origen: 'Bahia, Brasil', proveedor: 'Pedras Raras da Bahia', costo_bs: 490, precio_m2_bs: 840, stock: 39.4, planchas_stock: 8, minimo: 15, muestra: { fondo: '#f3ead8', veta: '#d2b48c', motas: '#e6d7be' } },
      { codigo: 'MAR-005', sucursal_id: 2, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Carrara Venato Brasil', acabado: 'Apomazado', grosor_mm: 20, largo_cm: 300, ancho_cm: 170, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 540, precio_m2_bs: 920, stock: 10.2, planchas_stock: 2, minimo: 18, muestra: { fondo: '#f1f2f4', veta: '#7b818a', motas: '#b6bcc4' } },
      { codigo: 'MAR-006', sucursal_id: 1, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Gris Michelangelo Brasil', acabado: 'Pulido Espejo', grosor_mm: 20, largo_cm: 300, ancho_cm: 175, unidad: 'm2', origen: 'Paraná, Brasil', proveedor: 'Mármores do Sul', costo_bs: 610, precio_m2_bs: 1050, stock: 26.2, planchas_stock: 5, minimo: 15, muestra: { fondo: '#8a8d93', veta: '#ffffff', motas: '#c9a86a' } },
      { codigo: 'MAR-007', sucursal_id: 3, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Travertino Navona al Agua', acabado: 'Apomazado', grosor_mm: 20, largo_cm: 285, ancho_cm: 165, unidad: 'm2', origen: 'Bahia, Brasil', proveedor: 'Pedras Raras da Bahia', costo_bs: 470, precio_m2_bs: 810, stock: 32.9, planchas_stock: 7, minimo: 15, muestra: { fondo: '#e5d8c5', veta: '#bfa888', motas: '#d4c3aa' } },
      { codigo: 'MAR-008', sucursal_id: 2, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Verde Alpi Brasileño', acabado: 'Pulido', grosor_mm: 20, largo_cm: 290, ancho_cm: 170, unidad: 'm2', origen: 'Minas Gerais, Brasil', proveedor: 'Granitos do Brasil Export', costo_bs: 590, precio_m2_bs: 990, stock: 9.8, planchas_stock: 2, minimo: 5, muestra: { fondo: '#1e3a2f', veta: '#a7f3d0', motas: '#064e3b' } },
      { codigo: 'MAR-009', sucursal_id: 1, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Emperador Marrón Oscuro', acabado: 'Pulido', grosor_mm: 20, largo_cm: 290, ancho_cm: 170, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 480, precio_m2_bs: 820, stock: 14.7, planchas_stock: 3, minimo: 8, muestra: { fondo: '#452c1e', veta: '#d2b48c', motas: '#2b1a10' } },
      { codigo: 'MAR-010', sucursal_id: 3, familia: 'plancha', categoria: 'marmol', nombre: 'Mármol Rosa Portugués Clásico', acabado: 'Pulido', grosor_mm: 20, largo_cm: 280, ancho_cm: 160, unidad: 'm2', origen: 'Ceará, Brasil', proveedor: 'Nordeste Pedras', costo_bs: 430, precio_m2_bs: 720, stock: 17.9, planchas_stock: 4, minimo: 5, muestra: { fondo: '#e8c5c0', veta: '#9e7b77', motas: '#f5e1de' } },

      // Granitos Brasileños (10 materiales)
      { codigo: 'GRA-001', sucursal_id: 1, familia: 'plancha', categoria: 'granito', nombre: 'Granito Negro São Gabriel Brasil', acabado: 'Pulido / Leather', grosor_mm: 20, largo_cm: 310, ancho_cm: 185, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 340, precio_m2_bs: 620, stock: 68.8, planchas_stock: 12, minimo: 30, muestra: { fondo: '#1c1d21', veta: '#33363d', motas: '#4b5059' } },
      { codigo: 'GRA-002', sucursal_id: 1, familia: 'plancha', categoria: 'granito', nombre: 'Granito Exótico Vía Láctea Brasil', acabado: 'Pulido Espejo', grosor_mm: 20, largo_cm: 305, ancho_cm: 185, unidad: 'm2', origen: 'Bahia, Brasil', proveedor: 'Pedras Raras da Bahia', costo_bs: 410, precio_m2_bs: 740, stock: 16.9, planchas_stock: 3, minimo: 25, muestra: { fondo: '#141518', veta: '#e5e7eb', motas: '#9ca3af' } },
      { codigo: 'GRA-003', sucursal_id: 3, familia: 'plancha', categoria: 'granito', nombre: 'Granito Blanco Dallas Brasil', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 180, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 310, precio_m2_bs: 560, stock: 54.0, planchas_stock: 10, minimo: 25, muestra: { fondo: '#e5e2dc', veta: '#7c7270', motas: '#574c4a' } },
      { codigo: 'GRA-004', sucursal_id: 3, familia: 'plancha', categoria: 'granito', nombre: 'Granito Blanco Siena Itaúnas', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 180, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 330, precio_m2_bs: 590, stock: 48.6, planchas_stock: 9, minimo: 20, muestra: { fondo: '#ece9e2', veta: '#9e978e', motas: '#736c64' } },
      { codigo: 'GRA-005', sucursal_id: 2, familia: 'plancha', categoria: 'granito', nombre: 'Granito Gris Corumbá Económico', acabado: 'Pulido', grosor_mm: 20, largo_cm: 295, ancho_cm: 175, unidad: 'm2', origen: 'Mato Grosso do Sul, Brasil', proveedor: 'Fronteira Granitos', costo_bs: 260, precio_m2_bs: 460, stock: 61.9, planchas_stock: 12, minimo: 25, muestra: { fondo: '#8c9096', veta: '#4a4e54', motas: '#d1d5db' } },
      { codigo: 'GRA-006', sucursal_id: 1, familia: 'plancha', categoria: 'granito', nombre: 'Granito Verde Ubatuba Brasil', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 180, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Granitos do Brasil Export', costo_bs: 295, precio_m2_bs: 520, stock: 37.8, planchas_stock: 7, minimo: 15, muestra: { fondo: '#1d2b24', veta: '#3b5246', motas: '#84a98c' } },
      { codigo: 'GRA-007', sucursal_id: 2, familia: 'plancha', categoria: 'granito', nombre: 'Granito Amarillo Ornamental', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 180, unidad: 'm2', origen: 'Espírito Santo, Brasil', proveedor: 'Mineração Capixaba S.A.', costo_bs: 320, precio_m2_bs: 580, stock: 27.0, planchas_stock: 5, minimo: 15, muestra: { fondo: '#dfcca8', veta: '#8c6d3b', motas: '#4a3b22' } },
      { codigo: 'GRA-008', sucursal_id: 3, familia: 'plancha', categoria: 'granito', nombre: 'Granito Café Imperial Brasil', acabado: 'Pulido', grosor_mm: 20, largo_cm: 300, ancho_cm: 180, unidad: 'm2', origen: 'Minas Gerais, Brasil', proveedor: 'Granitos do Brasil Export', costo_bs: 360, precio_m2_bs: 640, stock: 21.6, planchas_stock: 4, minimo: 12, muestra: { fondo: '#3d281d', veta: '#6e4a35', motas: '#1f130d' } },
      { codigo: 'GRA-009', sucursal_id: 2, familia: 'plancha', categoria: 'granito', nombre: 'Granito Azul Bahia Exótico', acabado: 'Pulido Espejo', grosor_mm: 20, largo_cm: 290, ancho_cm: 175, unidad: 'm2', origen: 'Bahia, Brasil', proveedor: 'Pedras Raras da Bahia', costo_bs: 890, precio_m2_bs: 1550, stock: 10.1, planchas_stock: 2, minimo: 5, muestra: { fondo: '#1e3a8a', veta: '#60a5fa', motas: '#e0f2fe' } },
      { codigo: 'GRA-010', sucursal_id: 3, familia: 'plancha', categoria: 'granito', nombre: 'Granito Rojo Brasilia', acabado: 'Flameado / Pulido', grosor_mm: 20, largo_cm: 295, ancho_cm: 175, unidad: 'm2', origen: 'Goiás, Brasil', proveedor: 'Nordeste Pedras', costo_bs: 280, precio_m2_bs: 490, stock: 20.6, planchas_stock: 4, minimo: 6, muestra: { fondo: '#7f2b24', veta: '#3d1511', motas: '#cfa19d' } },

      // Cuarzos (8 materiales)
      { codigo: 'CUA-001', sucursal_id: 2, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Blanco Norte Absoluto', acabado: 'Brillo Antibacteriano', grosor_mm: 15, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Cachoeiro de Itapemirim, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 480, precio_m2_bs: 860, stock: 15.3, planchas_stock: 3, minimo: 25, muestra: { fondo: '#ffffff', veta: '#f3f4f6', motas: '#e5e7eb' } },
      { codigo: 'CUA-002', sucursal_id: 1, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Calacatta Gold Veta Ancha', acabado: 'Brillo Ultra', grosor_mm: 20, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Cachoeiro de Itapemirim, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 590, precio_m2_bs: 1040, stock: 20.4, planchas_stock: 4, minimo: 25, muestra: { fondo: '#fcfbf9', veta: '#c9a86a', motas: '#9ca3af' } },
      { codigo: 'CUA-003', sucursal_id: 2, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Gris Kensho Urbano', acabado: 'Mate', grosor_mm: 15, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 450, precio_m2_bs: 790, stock: 30.7, planchas_stock: 6, minimo: 15, muestra: { fondo: '#9ca3af', veta: '#6b7280', motas: '#d1d5db' } },
      { codigo: 'CUA-004', sucursal_id: 1, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Negro Stellar Destellos', acabado: 'Pulido Espejo', grosor_mm: 15, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Cachoeiro de Itapemirim, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 510, precio_m2_bs: 890, stock: 25.6, planchas_stock: 5, minimo: 15, muestra: { fondo: '#111827', veta: '#374151', motas: '#f3e5ab' } },
      { codigo: 'CUA-005', sucursal_id: 3, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Beige Sahara Arena', acabado: 'Brillo', grosor_mm: 15, largo_cm: 300, ancho_cm: 150, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 430, precio_m2_bs: 760, stock: 27.0, planchas_stock: 6, minimo: 15, muestra: { fondo: '#e6dac8', veta: '#cbb89d', motas: '#f4ece1' } },
      { codigo: 'CUA-006', sucursal_id: 2, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Marengo Antracita', acabado: 'Satinado', grosor_mm: 15, largo_cm: 300, ancho_cm: 150, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 440, precio_m2_bs: 780, stock: 22.5, planchas_stock: 5, minimo: 12, muestra: { fondo: '#374151', veta: '#1f2937', motas: '#6b7280' } },
      { codigo: 'CUA-007', sucursal_id: 3, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Blanco Zeus Extra', acabado: 'Brillo Puro', grosor_mm: 20, largo_cm: 320, ancho_cm: 160, unidad: 'm2', origen: 'Cachoeiro de Itapemirim, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 560, precio_m2_bs: 980, stock: 10.2, planchas_stock: 2, minimo: 20, muestra: { fondo: '#ffffff', veta: '#fafafa', motas: '#f0f0f0' } },
      { codigo: 'CUA-008', sucursal_id: 2, familia: 'plancha', categoria: 'cuarzo', nombre: 'Cuarzo Rojo Eros Clásico', acabado: 'Brillo', grosor_mm: 15, largo_cm: 300, ancho_cm: 140, unidad: 'm2', origen: 'São Paulo, Brasil', proveedor: 'Quartzo do Sul Brasil', costo_bs: 410, precio_m2_bs: 690, stock: 16.8, planchas_stock: 4, minimo: 4, muestra: { fondo: '#991b1b', veta: '#7f1d1d', motas: '#fca5a5' } },

      // Insumos de Producción y Colocación (4 insumos clave con rendimiento kg/m2)
      { codigo: 'INS-001', sucursal_id: 1, familia: 'insumo', categoria: 'insumo', nombre: 'Cola / Masa Plástica Preciosa Brasil (Lata 1 kg)', acabado: 'Resina Poliéster', grosor_mm: 0, largo_cm: 0, ancho_cm: 0, unidad: 'kg', origen: 'Santa Catarina, Brasil', proveedor: 'Química Catarinense', costo_bs: 12.0, precio_m2_bs: 18.0, stock: 180, planchas_stock: 180, minimo: 60, rendimiento_kg_m2: 4.5, muestra: { fondo: '#e7e5e4', veta: '#a8a29e', motas: '#78716c' } },
      { codigo: 'INS-002', sucursal_id: 1, familia: 'insumo', categoria: 'insumo', nombre: 'Cemento Cola Flexible Porcelanato/Mármol (kg)', acabado: 'Gris / Blanco', grosor_mm: 0, largo_cm: 0, ancho_cm: 0, unidad: 'kg', origen: 'Santa Cruz, Bolivia', proveedor: 'Fancesa / Camba', costo_bs: 2.5, precio_m2_bs: 4.0, stock: 850, planchas_stock: 42, minimo: 300, rendimiento_kg_m2: 6.0, muestra: { fondo: '#d6d3d1', veta: '#78716c', motas: '#57534e' } },
      { codigo: 'INS-003', sucursal_id: 1, familia: 'insumo', categoria: 'insumo', nombre: 'Pegamento Epóxico Estructural Bicomp. (kg)', acabado: 'Transparente Cristal', grosor_mm: 0, largo_cm: 0, ancho_cm: 0, unidad: 'kg', origen: 'São Paulo, Brasil', proveedor: 'Abrasivos Brasil', costo_bs: 28.0, precio_m2_bs: 42.0, stock: 75, planchas_stock: 75, minimo: 30, rendimiento_kg_m2: 1.8, muestra: { fondo: '#fef3c7', veta: '#f59e0b', motas: '#d97706' } },
      { codigo: 'INS-004', sucursal_id: 3, familia: 'insumo', categoria: 'insumo', nombre: 'Disco Diamantado Continuo 350mm Sierra Puente', acabado: 'Corte Húmedo', grosor_mm: 3, largo_cm: 35, ancho_cm: 35, unidad: 'ud', origen: 'São Paulo, Brasil', proveedor: 'Abrasivos Brasil', costo_bs: 680.0, precio_m2_bs: 950.0, stock: 4, planchas_stock: 4, minimo: 6, rendimiento_kg_m2: 0, muestra: { fondo: '#71717a', veta: '#d4af37', motas: '#27272a' } },
    ];

    const insMat = db.prepare(`
      INSERT INTO materiales (
        codigo, sucursal_id, familia, categoria, nombre, acabado, grosor_mm, largo_cm, ancho_cm,
        unidad, origen, proveedor, costo_bs, precio_m2_bs, precio_plancha_bs, stock, planchas_stock,
        minimo, rendimiento_kg_m2, muestra, activo
      ) VALUES (
        @codigo, @sucursal_id, @familia, @categoria, @nombre, @acabado, @grosor_mm, @largo_cm, @ancho_cm,
        @unidad, @origen, @proveedor, @costo_bs, @precio_m2_bs, @precio_plancha_bs, @stock, @planchas_stock,
        @minimo, @rendimiento_kg_m2, @muestra, 1
      )
    `);

    for (const m of materialesData) {
      const areaPlancha = m.largo_cm && m.ancho_cm ? (m.largo_cm * m.ancho_cm) / 10000 : 1;
      const precioPlancha = r2(areaPlancha * m.precio_m2_bs * 0.94);
      insMat.run({
        rendimiento_kg_m2: 0,
        ...m,
        precio_plancha_bs: precioPlancha,
        muestra: JSON.stringify(m.muestra),
      });
    }

    const matsDB = db.prepare("SELECT * FROM materiales WHERE familia = 'plancha'").all();
    const clientesDB = db.prepare('SELECT * FROM clientes').all();
    const vendedores = [
      { id: 'usr-vend-1', nombre: 'Rocío Saucedo', sucursal_id: 2 },
      { id: 'usr-vend-2', nombre: 'Carlos Vaca Díez', sucursal_id: 1 },
      { id: 'usr-vend-3', nombre: 'Valeria Cronenbold', sucursal_id: 2 },
      { id: 'usr-admin', nombre: 'Nain Torrico', sucursal_id: 1 },
    ];

    // 6. VENTAS DE 12 MESES (2025-12 a 2026-11) CON ESTACIONALIDAD Y MODA CRECIENTE (Piedra Sinterizada)
    const meses12 = [
      { ym: '2025-12', factor: 1.35, sinBoost: 0.5 }, // Diciembre alto por fiestas/fin de año
      { ym: '2026-01', factor: 0.75, sinBoost: 0.6 }, // Enero lluvias
      { ym: '2026-02', factor: 0.80, sinBoost: 0.7 }, // Febrero carnaval
      { ym: '2026-03', factor: 0.90, sinBoost: 0.8 },
      { ym: '2026-04', factor: 0.95, sinBoost: 0.9 },
      { ym: '2026-05', factor: 1.05, sinBoost: 1.1 },
      { ym: '2026-06', factor: 1.00, sinBoost: 1.2 },
      { ym: '2026-07', factor: 1.10, sinBoost: 1.4 },
      { ym: '2026-08', factor: 1.20, sinBoost: 1.7 },
      { ym: '2026-09', factor: 1.45, sinBoost: 2.1 }, // Septiembre mes de Santa Cruz / Expocruz
      { ym: '2026-10', factor: 1.35, sinBoost: 2.5 },
      { ym: '2026-11', factor: 1.50, sinBoost: 3.1 }, // Noviembre pico actual + auge de Piedra Sinterizada
    ];

    const insProforma = db.prepare(`
      INSERT INTO proformas (
        codigo, sucursal_id, cliente_id, cliente_nombre, cliente_nit, cliente_telefono,
        vendedor_id, vendedor_nombre, fecha, validez_dias, fecha_vencimiento, estado,
        subtotal_bs, descuento_pct, descuento_bs, total_bs, notas, venta_id
      ) VALUES (
        @codigo, @sucursal_id, @cliente_id, @cliente_nombre, @cliente_nit, @cliente_telefono,
        @vendedor_id, @vendedor_nombre, @fecha, @validez_dias, @fecha_vencimiento, @estado,
        @subtotal_bs, @descuento_pct, @descuento_bs, @total_bs, @notas, @venta_id
      )
    `);
    const insProfItem = db.prepare(`
      INSERT INTO proforma_items (
        proforma_id, material_id, tipo_item, descripcion, largo_m, ancho_m, cantidad, precio_unit_bs, costo_unit_bs, subtotal_bs
      ) VALUES (
        @proforma_id, @material_id, @tipo_item, @descripcion, @largo_m, @ancho_m, @cantidad, @precio_unit_bs, @costo_unit_bs, @subtotal_bs
      )
    `);
    const insVenta = db.prepare(`
      INSERT INTO ventas (
        codigo, sucursal_id, proforma_id, cliente_id, cliente_nombre, cliente_nit, cliente_telefono,
        vendedor_id, vendedor_nombre, fecha, metodo_pago, total_bs, costo_total_bs, pagado_bs, saldo_bs, estado_pago, notas
      ) VALUES (
        @codigo, @sucursal_id, @proforma_id, @cliente_id, @cliente_nombre, @cliente_nit, @cliente_telefono,
        @vendedor_id, @vendedor_nombre, @fecha, @metodo_pago, @total_bs, @costo_total_bs, @pagado_bs, @saldo_bs, @estado_pago, @notas
      )
    `);
    const insVentaItem = db.prepare(`
      INSERT INTO venta_items (
        venta_id, material_id, tipo_item, descripcion, cantidad, m2, precio_unit_bs, costo_unit_bs, subtotal_bs
      ) VALUES (
        @venta_id, @material_id, @tipo_item, @descripcion, @cantidad, @m2, @precio_unit_bs, @costo_unit_bs, @subtotal_bs
      )
    `);
    const insVentaPago = db.prepare(`
      INSERT INTO venta_pagos (venta_id, fecha, metodo_pago, monto_bs, referencia, usuario_nombre)
      VALUES (@venta_id, @fecha, @metodo_pago, @monto_bs, @referencia, @usuario_nombre)
    `);
    const insMovCont = db.prepare(`
      INSERT INTO movimientos_contables (sucursal_id, fecha, tipo, categoria, concepto, metodo_pago, monto_bs, referencia, venta_id, usuario_nombre)
      VALUES (@sucursal_id, @fecha, @tipo, @categoria, @concepto, @metodo_pago, @monto_bs, @referencia, @venta_id, @usuario_nombre)
    `);

    const metodosPago = ['Transferencia', 'QR', 'Efectivo', 'Tarjeta'];
    let seqProf = 1;
    let seqVenta = 1;

    // Selección ponderada de materiales: top sellers + moda creciente (SIN-001, SIN-002, SIN-003) vs lentos (MAR-010, GRA-010, CUA-008)
    for (let mIdx = 0; mIdx < meses12.length; mIdx++) {
      const { ym, factor, sinBoost } = meses12[mIdx];
      const numOperaciones = Math.round(7 * factor);

      for (let i = 0; i < numOperaciones; i++) {
        const dia = String(Math.min(25, 2 + ((i * 3 + mIdx * 2) % 23))).padStart(2, '0');
        const fecha = `${ym}-${dia}`;
        const cli = clientesDB[(i + mIdx) % clientesDB.length];
        const vend = vendedores[(i + mIdx) % vendedores.length];
        const sucursal_id = (i % 3) + 1;

        // En los últimos meses, alta probabilidad de elegir Piedra Sinterizada (moda nueva)
        let mat;
        if (mIdx >= 8 && i % 2 === 0) {
          const sinterizados = matsDB.filter(x => x.categoria === 'sinterizado');
          mat = sinterizados[(i + mIdx) % sinterizados.length];
        } else if (i % 3 === 0) {
          // Clásicos muy vendidos: Calacatta Gold, Negro São Gabriel, Blanco Norte, Vía Láctea
          const favoritos = matsDB.filter(x => ['MAR-001', 'GRA-001', 'GRA-002', 'CUA-001', 'CUA-002'].includes(x.codigo));
          mat = favoritos[(i + mIdx) % favoritos.length];
        } else {
          mat = matsDB[(i * 3 + mIdx) % matsDB.length];
        }

        const m2 = r2((3.5 + ((i * 1.7 + mIdx) % 9.5)) * (mat.categoria === 'sinterizado' ? Math.min(1.6, 0.8 + sinBoost * 0.2) : 1));
        const precioPiedra = r2(m2 * mat.precio_m2_bs);
        const costoPiedra = r2(m2 * mat.costo_bs);
        const precioColocacion = r2(m2 * 180);
        const costoColocacion = r2(m2 * 105);

        const subtotal = r2(precioPiedra + precioColocacion);
        const descPct = i % 4 === 0 ? 5 : 0;
        const descBs = r2(subtotal * (descPct / 100));
        const total = r2(subtotal - descBs);
        const costoTotal = r2(costoPiedra + costoColocacion);

        const codProf = `PRF-26-${String(seqProf++).padStart(4, '0')}`;

        // Determinar estado de la proforma para tener conversión realista por vendedor
        // Rocío: ~75% conversión, Valeria: ~65%, Carlos: ~55%, Nain: ~80%
        let convierte = true;
        let estadoProf = 'convertida';
        if (i % 5 === 4) {
          convierte = false;
          estadoProf = mIdx === 11 ? 'enviada' : 'vencida';
        } else if (mIdx === 11 && i >= numOperaciones - 2) {
          convierte = false;
          estadoProf = i % 2 === 0 ? 'aceptada' : 'enviada';
        } else if (i % 7 === 6) {
          convierte = false;
          estadoProf = 'rechazada';
        }

        const profInfo = insProforma.run({
          codigo: codProf,
          sucursal_id,
          cliente_id: cli.id,
          cliente_nombre: cli.nombre,
          cliente_nit: cli.nit_ci,
          cliente_telefono: cli.telefono,
          vendedor_id: vend.id,
          vendedor_nombre: vend.nombre,
          fecha,
          validez_dias: 15,
          fecha_vencimiento: `${ym}-28`,
          estado: estadoProf,
          subtotal_bs: subtotal,
          descuento_pct: descPct,
          descuento_bs: descBs,
          total_bs: total,
          notas: `Provisión e instalación de ${mat.nombre} (${m2} m²) con biselado 45°.`,
          venta_id: null,
        });

        const profId = profInfo.lastInsertRowid;

        insProfItem.run({
          proforma_id: profId,
          material_id: mat.id,
          tipo_item: 'm2',
          descripcion: `${mat.nombre} (${mat.acabado})`,
          largo_m: r2(m2 / 1.5),
          ancho_m: 1.5,
          cantidad: m2,
          precio_unit_bs: mat.precio_m2_bs,
          costo_unit_bs: mat.costo_bs,
          subtotal_bs: precioPiedra,
        });

        insProfItem.run({
          proforma_id: profId,
          material_id: null,
          tipo_item: 'corte_colocacion',
          descripcion: 'Servicio de corte en sierra puente, biselado y colocación en obra',
          largo_m: 1,
          ancho_m: 1,
          cantidad: m2,
          precio_unit_bs: 180,
          costo_unit_bs: 105,
          subtotal_bs: precioColocacion,
        });

        if (convierte) {
          const codVenta = `VTA-26-${String(seqVenta++).padStart(4, '0')}`;
          const metodo = metodosPago[(i + mIdx) % metodosPago.length];
          // Algunas ventas recientes con saldo a crédito (cuentas por cobrar)
          const esParcial = mIdx >= 10 && i % 4 === 1;
          const pagado = esParcial ? r2(total * 0.6) : total;
          const saldo = r2(total - pagado);
          const estadoPago = saldo > 0 ? 'parcial' : 'pagado';

          const vInfo = insVenta.run({
            codigo: codVenta,
            sucursal_id,
            proforma_id: profId,
            cliente_id: cli.id,
            cliente_nombre: cli.nombre,
            cliente_nit: cli.nit_ci,
            cliente_telefono: cli.telefono,
            vendedor_id: vend.id,
            vendedor_nombre: vend.nombre,
            fecha,
            metodo_pago: metodo,
            total_bs: total,
            costo_total_bs: costoTotal,
            pagado_bs: pagado,
            saldo_bs: saldo,
            estado_pago: estadoPago,
            notas: `Venta desde proforma ${codProf}`,
          });

          const ventaId = vInfo.lastInsertRowid;
          db.prepare('UPDATE proformas SET venta_id = ? WHERE id = ?').run(ventaId, profId);

          insVentaItem.run({
            venta_id: ventaId,
            material_id: mat.id,
            tipo_item: 'm2',
            descripcion: `${mat.nombre} (${mat.acabado})`,
            cantidad: m2,
            m2,
            precio_unit_bs: mat.precio_m2_bs,
            costo_unit_bs: mat.costo_bs,
            subtotal_bs: precioPiedra,
          });

          insVentaItem.run({
            venta_id: ventaId,
            material_id: null,
            tipo_item: 'corte_colocacion',
            descripcion: 'Servicio de corte y colocación en obra',
            cantidad: m2,
            m2,
            precio_unit_bs: 180,
            costo_unit_bs: 105,
            subtotal_bs: precioColocacion,
          });

          insVentaPago.run({
            venta_id: ventaId,
            fecha,
            metodo_pago: metodo,
            monto_bs: pagado,
            referencia: `${metodo.toUpperCase()}-${codVenta}`,
            usuario_nombre: vend.nombre,
          });

          insMovCont.run({
            sucursal_id,
            fecha,
            tipo: 'ingreso',
            categoria: 'Ventas',
            concepto: `Cobro ${codVenta} · ${cli.nombre} (${mat.nombre})`,
            metodo_pago: metodo,
            monto_bs: pagado,
            referencia: codVenta,
            venta_id: ventaId,
            usuario_nombre: vend.nombre,
          });
        }
      }

      // Egresos mensuales contables por sucursal (Compras Brasil, Planilla, Insumos, Servicios)
      insMovCont.run({
        sucursal_id: 1,
        fecha: `${ym}-10`,
        tipo: 'egreso',
        categoria: 'Compra Planchas Brasil',
        concepto: `Importación lote planchas Vitória/Paraná (${ym})`,
        metodo_pago: 'Transferencia',
        monto_bs: r2(32000 * factor),
        referencia: `IMP-${ym}`,
        venta_id: null,
        usuario_nombre: 'Nain Torrico',
      });
      insMovCont.run({
        sucursal_id: 1,
        fecha: `${ym}-25`,
        tipo: 'egreso',
        categoria: 'Planilla Sueldos',
        concepto: `Planilla mensual Taller Km 13 (${ym})`,
        metodo_pago: 'Transferencia',
        monto_bs: 28500,
        referencia: `PLA-KM13-${ym}`,
        venta_id: null,
        usuario_nombre: 'Lic. Gabriela Paz',
      });
      insMovCont.run({
        sucursal_id: 2,
        fecha: `${ym}-25`,
        tipo: 'egreso',
        categoria: 'Planilla Sueldos',
        concepto: `Planilla mensual Showroom Piraí (${ym})`,
        metodo_pago: 'Transferencia',
        monto_bs: 12550,
        referencia: `PLA-PIRAI-${ym}`,
        venta_id: null,
        usuario_nombre: 'Lic. Gabriela Paz',
      });
      insMovCont.run({
        sucursal_id: 3,
        fecha: `${ym}-25`,
        tipo: 'egreso',
        categoria: 'Planilla Sueldos',
        concepto: `Planilla mensual Almacén Roca y Coronado (${ym})`,
        metodo_pago: 'Transferencia',
        monto_bs: 12050,
        referencia: `PLA-ROCA-${ym}`,
        venta_id: null,
        usuario_nombre: 'Lic. Gabriela Paz',
      });
      insMovCont.run({
        sucursal_id: 2,
        fecha: `${ym}-15`,
        tipo: 'egreso',
        categoria: 'Servicios y Alquiler',
        concepto: `CRE Energía Eléctrica, Saguapac y mantenimiento Showroom (${ym})`,
        metodo_pago: 'QR',
        monto_bs: 4800,
        referencia: `SRV-${ym}`,
        venta_id: null,
        usuario_nombre: 'Lic. Patricia Ribera',
      });
      insMovCont.run({
        sucursal_id: 3,
        fecha: `${ym}-18`,
        tipo: 'egreso',
        categoria: 'Insumos y Discos',
        concepto: `Reposición masa plástica Preciosa, discos diamantados y cemento cola (${ym})`,
        metodo_pago: 'Efectivo',
        monto_bs: 5400,
        referencia: `INS-${ym}`,
        venta_id: null,
        usuario_nombre: 'Marco Antonio Justiniano',
      });
    }

    // 7. PROYECTOS DE PRODUCCIÓN Y COSTOS (incluyendo ejemplo 7m x 8m = 56 m2 del PEDIDO.md)
    const proyectosSeed = [
      {
        codigo: 'PRY-26-001',
        sucursal_id: 1,
        cliente_id: 1,
        cliente_nombre: 'Constructora Urubó Golf S.A.',
        nombre: 'Lobby y Salón Principal Condominio Urubó (7m × 8m)',
        tipo_trabajo: 'Piso y Revestimiento Gran Formato',
        fecha: '2026-11-12',
        estado: 'terminado',
        largo_m: 7,
        ancho_m: 8,
        material_id: 1,
        material_nombre: 'Piedra Sinterizada Taj Mahal Gold Brasil',
        costo_material_m2_bs: 720,
        cola_kg_m2: 4.5,
        costo_cola_kg_bs: 12,
        cemento_kg_m2: 6.0,
        costo_cemento_kg_bs: 2.5,
        pegamento_kg_m2: 1.8,
        costo_pegamento_kg_bs: 28,
        horas_mo: 64,
        costo_hora_mo_bs: 35,
        desperdicio_pct: 10,
        margen_pct: 35,
        cortador_nombre: 'Arq. Marco Justiniano',
        notas: 'Proyecto insignia de 56 m² con juntas invisibles epóxicas y zócalos perimetrales.',
      },
      {
        codigo: 'PRY-26-002',
        sucursal_id: 2,
        cliente_id: 2,
        cliente_nombre: 'Sra. Hortensia Vda. de Cronenbold',
        nombre: 'Isla Central y Mesones Cocina Equipetrol',
        tipo_trabajo: 'Cocina / Mesón',
        fecha: '2026-11-18',
        estado: 'instalacion',
        largo_m: 4.2,
        ancho_m: 2.5,
        material_id: 9,
        material_nombre: 'Mármol Blanco Calacatta Gold Brasil',
        costo_material_m2_bs: 650,
        cola_kg_m2: 4.2,
        costo_cola_kg_bs: 12,
        cemento_kg_m2: 5.5,
        costo_cemento_kg_bs: 2.5,
        pegamento_kg_m2: 2.0,
        costo_pegamento_kg_bs: 28,
        horas_mo: 28,
        costo_hora_mo_bs: 32,
        desperdicio_pct: 12,
        margen_pct: 38,
        cortador_nombre: 'Arq. Marco Justiniano',
        notas: 'Faldón ingletado a 45° con caída cascada en ambos extremos.',
      },
      {
        codigo: 'PRY-26-003',
        sucursal_id: 3,
        cliente_id: 11,
        cliente_nombre: 'Restaurante Churrasquería El Arriero',
        nombre: 'Barra Principal de Carnes y Buffets',
        tipo_trabajo: 'Mesón Comercial Alta Dureza',
        fecha: '2026-11-21',
        estado: 'en_taller',
        largo_m: 6.5,
        ancho_m: 1.8,
        material_id: 20,
        material_nombre: 'Granito Exótico Vía Láctea Brasil',
        costo_material_m2_bs: 410,
        cola_kg_m2: 4.0,
        costo_cola_kg_bs: 12,
        cemento_kg_m2: 6.5,
        costo_cemento_kg_bs: 2.5,
        pegamento_kg_m2: 1.5,
        costo_pegamento_kg_bs: 28,
        horas_mo: 34,
        costo_hora_mo_bs: 29,
        desperdicio_pct: 8,
        margen_pct: 40,
        cortador_nombre: 'Ramiro Mamani',
        notas: 'Doble refuerzo inferior y 4 huecos para bandejas térmicas.',
      },
      {
        codigo: 'PRY-26-004',
        sucursal_id: 1,
        cliente_id: 3,
        cliente_nombre: 'Dr. Humberto Castedo & Familia',
        nombre: 'Escalinata Principal y 3 Tocadores de Baño Las Palmas',
        tipo_trabajo: 'Gradas y Baños',
        fecha: '2026-11-05',
        estado: 'terminado',
        largo_m: 5.0,
        ancho_m: 3.6,
        material_id: 2,
        material_nombre: 'Piedra Sinterizada Laurent Noir Gold',
        costo_material_m2_bs: 760,
        cola_kg_m2: 4.5,
        costo_cola_kg_bs: 12,
        cemento_kg_m2: 6.0,
        costo_cemento_kg_bs: 2.5,
        pegamento_kg_m2: 1.9,
        costo_pegamento_kg_bs: 28,
        horas_mo: 38,
        costo_hora_mo_bs: 35,
        desperdicio_pct: 9,
        margen_pct: 36,
        cortador_nombre: 'Arq. Marco Justiniano',
        notas: 'Huellas y contrahuellas con ranura antideslizante.',
      },
    ];

    const insPry = db.prepare(`
      INSERT INTO proyectos_produccion (
        codigo, sucursal_id, cliente_id, cliente_nombre, nombre, tipo_trabajo, fecha, estado,
        largo_m, ancho_m, area_m2, material_id, material_nombre, costo_material_m2_bs,
        cola_kg_m2, costo_cola_kg_bs, cemento_kg_m2, costo_cemento_kg_bs, pegamento_kg_m2, costo_pegamento_kg_bs,
        horas_mo, costo_hora_mo_bs, desperdicio_pct, margen_pct,
        costo_piedra_bs, costo_insumos_bs, costo_mo_bs, costo_desperdicio_bs, costo_total_bs, precio_servicio_bs,
        cortador_nombre, notas
      ) VALUES (
        @codigo, @sucursal_id, @cliente_id, @cliente_nombre, @nombre, @tipo_trabajo, @fecha, @estado,
        @largo_m, @ancho_m, @area_m2, @material_id, @material_nombre, @costo_material_m2_bs,
        @cola_kg_m2, @costo_cola_kg_bs, @cemento_kg_m2, @costo_cemento_kg_bs, @pegamento_kg_m2, @costo_pegamento_kg_bs,
        @horas_mo, @costo_hora_mo_bs, @desperdicio_pct, @margen_pct,
        @costo_piedra_bs, @costo_insumos_bs, @costo_mo_bs, @costo_desperdicio_bs, @costo_total_bs, @precio_servicio_bs,
        @cortador_nombre, @notas
      )
    `);

    for (const p of proyectosSeed) {
      const calc = calcularCostoProyecto(p);
      insPry.run({ ...p, ...calc });
    }

    // 8. PLANCHAS CORTADAS (MATRIZ DE CORTE 300x170 cm) + RETAZOS ÚTILES + MERMAS
    const cortesSeed = [
      {
        codigo: 'PLC-26-001',
        sucursal_id: 1,
        material_id: 9,
        material_nombre: 'Mármol Blanco Calacatta Gold Brasil',
        cortador_id: 'usr-cort-1',
        cortador_nombre: 'Arq. Marco Justiniano',
        fecha: '2026-11-18',
        ancho_cm: 300,
        alto_cm: 170,
        costo_m2_bs: 650,
        notas: 'Corte de isla y mesón Sra. Hortensia Cronenbold',
        rectangulos: [
          { id: 'R-1', x: 0, y: 0, w: 220, h: 95, tipo: 'usada', etiqueta: 'Isla Central 220×95cm', cliente: 'Sra. Hortensia' },
          { id: 'R-2', x: 0, y: 95, w: 220, h: 65, tipo: 'usada', etiqueta: 'Mesón Lateral 220×65cm', cliente: 'Sra. Hortensia' },
          { id: 'R-3', x: 220, y: 0, w: 80, h: 120, tipo: 'retazo', etiqueta: 'Retazo Útil Vanitory 80×120cm', cliente: '' },
          { id: 'R-4', x: 220, y: 120, w: 80, h: 50, tipo: 'merma', etiqueta: 'Despunte y Fisura Veta 80×50cm', cliente: '' },
          { id: 'R-5', x: 0, y: 160, w: 220, h: 10, tipo: 'merma', etiqueta: 'Tira Descarte Canto 220×10cm', cliente: '' },
        ],
      },
      {
        codigo: 'PLC-26-002',
        sucursal_id: 1,
        material_id: 1,
        material_nombre: 'Piedra Sinterizada Taj Mahal Gold Brasil',
        cortador_id: 'usr-cort-1',
        cortador_nombre: 'Arq. Marco Justiniano',
        fecha: '2026-11-14',
        ancho_cm: 320,
        alto_cm: 160,
        costo_m2_bs: 720,
        notas: 'Paneles Lobby Condominio Urubó Golf',
        rectangulos: [
          { id: 'R-1', x: 0, y: 0, w: 240, h: 120, tipo: 'usada', etiqueta: 'Panel Muro A 240×120cm', cliente: 'Urubó Golf' },
          { id: 'R-2', x: 0, y: 120, w: 240, h: 40, tipo: 'usada', etiqueta: 'Zócalos y Faldón 240×40cm', cliente: 'Urubó Golf' },
          { id: 'R-3', x: 240, y: 0, w: 80, h: 110, tipo: 'retazo', etiqueta: 'Retazo Útil Mesa Auxiliar 80×110cm', cliente: '' },
          { id: 'R-4', x: 240, y: 110, w: 80, h: 50, tipo: 'merma', etiqueta: 'Recorte Esquina Columna 80×50cm', cliente: '' },
        ],
      },
      {
        codigo: 'PLC-26-003',
        sucursal_id: 3,
        material_id: 20,
        material_nombre: 'Granito Exótico Vía Láctea Brasil',
        cortador_id: 'usr-cort-2',
        cortador_nombre: 'Ramiro Mamani',
        fecha: '2026-11-21',
        ancho_cm: 300,
        alto_cm: 170,
        costo_m2_bs: 410,
        notas: 'Barra Churrasquería El Arriero',
        rectangulos: [
          { id: 'R-1', x: 0, y: 0, w: 260, h: 90, tipo: 'usada', etiqueta: 'Barra Principal 260×90cm', cliente: 'El Arriero' },
          { id: 'R-2', x: 0, y: 90, w: 180, h: 80, tipo: 'retazo', etiqueta: 'Retazo Útil Mesón Lavaplatos 180×80cm', cliente: '' },
          { id: 'R-3', x: 180, y: 90, w: 80, h: 80, tipo: 'usada', etiqueta: 'Mesa Caja 80×80cm', cliente: 'El Arriero' },
          { id: 'R-4', x: 260, y: 0, w: 40, h: 170, tipo: 'merma', etiqueta: 'Merma Corte Disco y Orilla 40×170cm', cliente: '' },
        ],
      },
    ];

    const insCorte = db.prepare(`
      INSERT INTO planchas_corte (
        codigo, sucursal_id, material_id, material_nombre, cortador_id, cortador_nombre, fecha,
        ancho_cm, alto_cm, area_total_m2, usado_m2, retazo_m2, merma_m2, sin_asignar_m2,
        usado_pct, retazo_pct, merma_pct, costo_m2_bs, costo_merma_bs, rectangulos, notas
      ) VALUES (
        @codigo, @sucursal_id, @material_id, @material_nombre, @cortador_id, @cortador_nombre, @fecha,
        @ancho_cm, @alto_cm, @area_total_m2, @usado_m2, @retazo_m2, @merma_m2, @sin_asignar_m2,
        @usado_pct, @retazo_pct, @merma_pct, @costo_m2_bs, @costo_merma_bs, @rectangulos, @notas
      )
    `);

    const insRetazo = db.prepare(`
      INSERT INTO retazos (
        codigo, sucursal_id, plancha_corte_id, material_id, material_nombre, ancho_cm, alto_cm, area_m2, valor_estimado_bs, estado, ubicacion
      ) VALUES (
        @codigo, @sucursal_id, @plancha_corte_id, @material_id, @material_nombre, @ancho_cm, @alto_cm, @area_m2, @valor_estimado_bs, 'disponible', @ubicacion
      )
    `);

    let seqRet = 1;
    for (const c of cortesSeed) {
      const calc = calcularMatrizCorte(c.ancho_cm, c.alto_cm, c.rectangulos, c.costo_m2_bs);
      const info = insCorte.run({
        ...c,
        ...calc,
        rectangulos: JSON.stringify(calc.rectangulos),
      });
      const corteId = info.lastInsertRowid;

      for (const r of calc.rectangulos.filter(x => x.tipo === 'retazo')) {
        insRetazo.run({
          codigo: `RET-26-${String(seqRet++).padStart(3, '0')}`,
          sucursal_id: c.sucursal_id,
          plancha_corte_id: corteId,
          material_id: c.material_id,
          material_nombre: c.material_nombre,
          ancho_cm: r.w,
          alto_cm: r.h,
          area_m2: r.area_m2,
          valor_estimado_bs: r2(r.area_m2 * c.costo_m2_bs * 0.85),
          ubicacion: c.sucursal_id === 1 ? 'Caballete Retazos Km 13' : 'Caballete Retazos Roca y Coronado',
        });
      }
    }

    // 9. AJUSTES DE EMPRESA
    const insAj = db.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?)');
    insAj.run('empresa', JSON.stringify({
      nombre: 'Jerusalén S.R.L.',
      lema: 'Mármol, Granito, Cuarzo y Piedra Sinterizada · Importado de Brasil',
      nit: '389421029',
      dueno: 'Don Emiliano Acero',
      administrador: 'Nain Torrico',
      moneda: 'Bs',
      tipo_cambio_usd: 6.96,
      telefono_principal: '+591 70314442',
      ciudad: 'Santa Cruz de la Sierra, Bolivia',
    }));
  });

  tx();
  return { ok: true, seeded: true };
}

module.exports = seed;
if (require.main === module) {
  const res = seed(true);
  console.log('Seed completado:', res);
}
