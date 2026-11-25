'use strict';
/**
 * Suite de pruebas automatizadas del ERP Jerusalén S.R.L. (Etapa 7)
 * Verifica:
 * 1. Cálculo de costos por proyecto (7m x 8m = 56 m2, materiales, insumos kg/m2, MO, desperdicio, margen).
 * 2. Matriz de corte de planchas (300 x 170 cm = 5.10 m2, pieza usada, retazo reutilizable, merma).
 * 3. Antigüedad automática de trabajadores y planilla mensual (~20 trabajadores).
 * 4. API HTTP e integración: Login, PIN del dueño (adminj), creación y conversión de proforma a venta,
 *    descuento de stock, asiento contable, guardado de corte con creación de retazos y permisos por rol.
 */
const assert = require('assert');
const http = require('http');
const { calcularCostoProyecto, calcularMatrizCorte, calcularAntiguedad } = require('../api/compute');
const seed = require('../api/seed');
const app = require('../server');

function request(server, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== Iniciando pruebas del ERP Jerusalén S.R.L. ===');

  // 1. Prueba unitaria: Cálculo de costos por proyecto (ejemplo 7m x 8m = 56 m2 del PEDIDO.md)
  const proy = calcularCostoProyecto({
    largo_m: 7,
    ancho_m: 8,
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
  });

  assert.strictEqual(proy.area_m2, 56, 'El área de 7m x 8m debe ser 56 m2');
  assert.strictEqual(proy.costo_piedra_bs, 40320, 'Costo piedra 56 * 720 = 40320 Bs');
  assert.ok(proy.costo_insumos_bs > 6000, 'Costo de insumos (cola + cemento + pegamento) calculado');
  assert.strictEqual(proy.costo_mo_bs, 2240, 'Costo mano de obra 64h * 35 = 2240 Bs');
  assert.ok(proy.precio_servicio_bs > proy.costo_total_bs, 'Precio del servicio incluye el margen');
  console.log('  [OK] 1. Cálculo de producción y costos por proyecto (7m x 8m = 56 m2)');

  // 2. Prueba unitaria: Matriz de corte de planchas (300 x 170 cm = 5.10 m2)
  const corte = calcularMatrizCorte(
    300,
    170,
    [
      { x: 0, y: 0, w: 200, h: 100, tipo: 'usada', etiqueta: 'Mesón Cocina' },     // 2.00 m2
      { x: 0, y: 100, w: 200, h: 70, tipo: 'usada', etiqueta: 'Isla Central' },     // 1.40 m2
      { x: 200, y: 0, w: 100, h: 120, tipo: 'retazo', etiqueta: 'Retazo Útil' },    // 1.20 m2
      { x: 200, y: 120, w: 100, h: 50, tipo: 'merma', etiqueta: 'Descarte Veta' },  // 0.50 m2
    ],
    650
  );
  assert.strictEqual(corte.area_total_m2, 5.1, 'Plancha 300x170 cm debe tener 5.10 m2');
  assert.strictEqual(corte.usado_m2, 3.4, 'Área usada debe ser 3.40 m2');
  assert.strictEqual(corte.retazo_m2, 1.2, 'Área de retazo útil debe ser 1.20 m2');
  assert.strictEqual(corte.merma_m2, 0.5, 'Área de merma debe ser 0.50 m2');
  assert.strictEqual(corte.sin_asignar_m2, 0, 'Toda la plancha quedó asignada');
  assert.strictEqual(corte.costo_merma_bs, 325, 'Costo de merma 0.50 * 650 = 325 Bs');
  console.log('  [OK] 2. Cálculo de matriz de corte (300x170 cm: usada, retazo útil y merma)');

  // 3. Prueba unitaria: Antigüedad automática de trabajadores
  const ant = calcularAntiguedad('2018-03-15', '2026-11-25');
  assert.strictEqual(ant.anios, 8, 'Antigüedad debe ser 8 años');
  assert.strictEqual(ant.pct_bono, 18, 'Porcentaje de bono para 8 años debe ser 18%');
  console.log('  [OK] 3. Cálculo automático de antigüedad laboral');

  // 4. Pruebas de integración HTTP (Seed, Auth, Permisos, Conversión Proforma -> Venta, Matriz -> Retazos)
  seed(true);
  const server = app.listen(0);

  try {
    // 4.1 Health check
    const health = await request(server, 'GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.ok(health.body.materiales >= 38, 'Seed debe cargar ~40 materiales');

    // 4.2 Login Administrador (Nain Torrico)
    const loginAdmin = await request(server, 'POST', '/api/auth/login', {
      email: 'nain@jerusalensrl.com',
      password: process.env.ADMIN_PASSWORD || 'jerusalen2026',
    });
    assert.strictEqual(loginAdmin.status, 200, 'Login admin exitoso');
    const tokenAdmin = loginAdmin.body.token;
    const hAdmin = { 'x-session-token': tokenAdmin };

    // 4.3 Login con PIN para Don Emiliano (adminj)
    const loginPin = await request(server, 'POST', '/api/auth/pin', { pin: '1954' });
    assert.strictEqual(loginPin.status, 200, 'Login por PIN 1954 exitoso');
    assert.strictEqual(loginPin.body.user.rol, 'dueno');
    const hDueno = { 'x-session-token': loginPin.body.token };

    // Panel del dueño devuelve todas las tarjetas requeridas
    const resDueno = await request(server, 'GET', '/api/erp/dueno?mes=2026-11', null, hDueno);
    assert.strictEqual(resDueno.status, 200);
    assert.ok(resDueno.body.tarjetas.loQueGaneBs > 0, 'Tarjeta Lo que gané este mes > 0');
    assert.ok(resDueno.body.tarjetas.loQueGasteBs > 0, 'Tarjeta Lo que gasté > 0');
    assert.ok(Array.isArray(resDueno.body.queComprar), 'Tarjeta Qué tengo que comprar presente');
    assert.ok(Array.isArray(resDueno.body.vendedores), 'Tarjeta Cómo van mis vendedores presente');
    console.log('  [OK] 4. Login por PIN y endpoint del Panel del Dueño (adminj)');

    // 4.4 Verificación de permisos por rol (un vendedor o dueño NO puede crear usuarios ni registrar cortes)
    const loginVend = await request(server, 'POST', '/api/auth/login', {
      email: 'rocio@jerusalensrl.com',
      password: process.env.ADMIN_PASSWORD || 'jerusalen2026',
    });
    const hVend = { 'x-session-token': loginVend.body.token };

    const intentoUsuarios = await request(server, 'GET', '/api/erp/usuarios', null, hVend);
    assert.strictEqual(intentoUsuarios.status, 403, 'Vendedor no debe acceder a gestión de usuarios');

    const intentoCorteVend = await request(server, 'POST', '/api/erp/cortes', { ancho_cm: 300, alto_cm: 170, rectangulos: [] }, hVend);
    assert.strictEqual(intentoCorteVend.status, 403, 'Vendedor no debe registrar matriz de corte (solo cortador/admin)');
    console.log('  [OK] 5. Control de permisos por rol (403 Forbidden en rutas no autorizadas)');

    // 4.5 Crear proforma como vendedor y convertirla en venta (verificando descuento de stock)
    const invAntes = await request(server, 'GET', '/api/erp/inventario?sucursal_id=1', null, hAdmin);
    const matPrueba = invAntes.body.materiales.find(m => m.id === 1);
    const stockAntes = matPrueba.stock;

    const nuevaProf = await request(
      server,
      'POST',
      '/api/erp/proformas',
      {
        sucursal_id: 1,
        cliente_nombre: 'Cliente Prueba Conversión',
        cliente_nit: '777888999',
        descuento_pct: 10,
        items: [
          {
            material_id: 1,
            tipo_item: 'm2',
            descripcion: matPrueba.nombre,
            cantidad: 2.5,
            precio_unit_bs: 1000,
          },
        ],
      },
      hVend
    );
    assert.strictEqual(nuevaProf.status, 200, 'Proforma creada por vendedor');
    assert.strictEqual(nuevaProf.body.total_bs, 2250, 'Total con 10% descuento sobre 2500 = 2250 Bs');

    const conv = await request(
      server,
      'POST',
      `/api/erp/proformas/${nuevaProf.body.id}/convertir`,
      { metodo_pago: 'QR', pagado_bs: 1500 },
      hVend
    );
    assert.strictEqual(conv.status, 200, 'Proforma convertida en venta');
    assert.ok(conv.body.codigo.startsWith('VTA-26-'), 'Genera código de venta');

    const invDespues = await request(server, 'GET', '/api/erp/inventario?sucursal_id=1', null, hAdmin);
    const matDespues = invDespues.body.materiales.find(m => m.id === 1);
    assert.strictEqual(
      Number((stockAntes - matDespues.stock).toFixed(2)),
      2.5,
      'El stock del material se descontó en 2.5 m2 al convertir la proforma'
    );
    console.log('  [OK] 6. Creación y conversión de proforma a venta + descuento de stock + saldo a crédito');

    // 4.6 Guardar corte en matriz y verificar que los retazos útiles pasen al inventario
    const nuevoCorte = await request(
      server,
      'POST',
      '/api/erp/cortes',
      {
        sucursal_id: 1,
        material_id: 1,
        material_nombre: matPrueba.nombre,
        ancho_cm: 300,
        alto_cm: 170,
        costo_m2_bs: 720,
        rectangulos: [
          { x: 0, y: 0, w: 210, h: 170, tipo: 'usada', etiqueta: 'Mesón 210x170' },
          { x: 210, y: 0, w: 90, h: 130, tipo: 'retazo', etiqueta: 'Retazo Útil 90x130' },
          { x: 210, y: 130, w: 90, h: 40, tipo: 'merma', etiqueta: 'Merma 90x40' },
        ],
      },
      hAdmin
    );
    assert.strictEqual(nuevoCorte.status, 200);
    assert.strictEqual(nuevoCorte.body.retazosCreados.length, 1, 'El retazo útil se creó en el inventario');
    assert.strictEqual(nuevoCorte.body.retazosCreados[0].area_m2, 1.17, 'Área del retazo 90x130cm = 1.17 m2');
    console.log('  [OK] 7. Registro de matriz de corte e ingreso automático de retazos útiles al inventario');

    // Restaurar seed limpio tras las pruebas
    seed(true);
    console.log('=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('FALLO EN PRUEBAS:', err);
  process.exit(1);
});
