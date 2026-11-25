'use strict';
// Motor de cálculos de negocio de Jerusalén S.R.L. (Santa Cruz, Bolivia)

const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const HOY = () => process.env.FECHA_HOY || '2026-11-25';

/**
 * 1. Cálculo de Producción y Costos por Proyecto
 * Medidas (ej. 7m x 8m = 56 m2), material (plancha + cola + cemento + pegamento con rendimiento kg/m2),
 * mano de obra (horas x costo), desperdicio %, margen % -> costo total y precio del servicio.
 */
function calcularCostoProyecto(params = {}) {
  const largo_m = Math.max(0.01, Number(params.largo_m ?? 7));
  const ancho_m = Math.max(0.01, Number(params.ancho_m ?? 8));
  const area_m2 = r2(params.area_m2 != null ? Number(params.area_m2) : largo_m * ancho_m);

  const costo_material_m2_bs = Number(params.costo_material_m2_bs ?? 850);

  // Insumos con rendimiento en kg/m2
  const cola_kg_m2 = Number(params.cola_kg_m2 ?? 4.5);
  const costo_cola_kg_bs = Number(params.costo_cola_kg_bs ?? 12);
  const cemento_kg_m2 = Number(params.cemento_kg_m2 ?? 6.0);
  const costo_cemento_kg_bs = Number(params.costo_cemento_kg_bs ?? 2.5);
  const pegamento_kg_m2 = Number(params.pegamento_kg_m2 ?? 1.8);
  const costo_pegamento_kg_bs = Number(params.costo_pegamento_kg_bs ?? 28);

  const horas_mo = Number(params.horas_mo ?? 40);
  const costo_hora_mo_bs = Number(params.costo_hora_mo_bs ?? 35);

  const desperdicio_pct = Number(params.desperdicio_pct ?? 10);
  const margen_pct = Number(params.margen_pct ?? 35);

  const costo_piedra_bs = r2(area_m2 * costo_material_m2_bs);

  const cola_total_kg = r2(area_m2 * cola_kg_m2);
  const cemento_total_kg = r2(area_m2 * cemento_kg_m2);
  const pegamento_total_kg = r2(area_m2 * pegamento_kg_m2);

  const costo_cola_bs = r2(cola_total_kg * costo_cola_kg_bs);
  const costo_cemento_bs = r2(cemento_total_kg * costo_cemento_kg_bs);
  const costo_pegamento_bs = r2(pegamento_total_kg * costo_pegamento_kg_bs);
  const costo_insumos_bs = r2(costo_cola_bs + costo_cemento_bs + costo_pegamento_bs);

  const costo_mo_bs = r2(horas_mo * costo_hora_mo_bs);
  const costo_desperdicio_bs = r2((costo_piedra_bs + costo_insumos_bs) * (desperdicio_pct / 100));

  const costo_total_bs = r2(costo_piedra_bs + costo_insumos_bs + costo_mo_bs + costo_desperdicio_bs);

  // Precio del servicio aplicando margen sobre costo (o margen comercial)
  const precio_servicio_bs = r2(costo_total_bs * (1 + margen_pct / 100));
  const utilidad_estimada_bs = r2(precio_servicio_bs - costo_total_bs);
  const costo_por_m2_bs = area_m2 > 0 ? r2(costo_total_bs / area_m2) : 0;
  const precio_por_m2_bs = area_m2 > 0 ? r2(precio_servicio_bs / area_m2) : 0;

  return {
    largo_m: r2(largo_m),
    ancho_m: r2(ancho_m),
    area_m2,
    costo_material_m2_bs: r2(costo_material_m2_bs),
    cola_kg_m2: r2(cola_kg_m2),
    costo_cola_kg_bs: r2(costo_cola_kg_bs),
    cola_total_kg,
    costo_cola_bs,
    cemento_kg_m2: r2(cemento_kg_m2),
    costo_cemento_kg_bs: r2(costo_cemento_kg_bs),
    cemento_total_kg,
    costo_cemento_bs,
    pegamento_kg_m2: r2(pegamento_kg_m2),
    costo_pegamento_kg_bs: r2(costo_pegamento_kg_bs),
    pegamento_total_kg,
    costo_pegamento_bs,
    horas_mo: r2(horas_mo),
    costo_hora_mo_bs: r2(costo_hora_mo_bs),
    desperdicio_pct: r2(desperdicio_pct),
    margen_pct: r2(margen_pct),
    costo_piedra_bs,
    costo_insumos_bs,
    costo_mo_bs,
    costo_desperdicio_bs,
    costo_total_bs,
    precio_servicio_bs,
    utilidad_estimada_bs,
    costo_por_m2_bs,
    precio_por_m2_bs,
  };
}

/**
 * 2. Cálculo de Matriz de Corte de Plancha (por defecto 300 x 170 cm = 5.10 m2, 1 cuadro = 1 cm)
 * Clasifica cada rectángulo en: 'usada' (pieza vendida/usada), 'retazo' (parte útil reutilizable), 'merma' (desperdicio).
 */
function calcularMatrizCorte(ancho_cm = 300, alto_cm = 170, rectangulos = [], costo_m2_bs = 850) {
  const W = Math.max(10, Math.round(Number(ancho_cm) || 300));
  const H = Math.max(10, Math.round(Number(alto_cm) || 170));
  const area_total_m2 = r2((W * H) / 10000);

  let usado_cm2 = 0;
  let retazo_cm2 = 0;
  let merma_cm2 = 0;

  const rectsNormalizados = (Array.isArray(rectangulos) ? rectangulos : []).map((r, idx) => {
    const x = Math.max(0, Math.min(W, Math.round(Number(r.x) || 0)));
    const y = Math.max(0, Math.min(H, Math.round(Number(r.y) || 0)));
    const w = Math.max(1, Math.min(W - x, Math.round(Number(r.w) || 10)));
    const h = Math.max(1, Math.min(H - y, Math.round(Number(r.h) || 10)));
    const area_cm2 = w * h;
    const area_m2 = r2(area_cm2 / 10000);
    const tipo = ['usada', 'retazo', 'merma'].includes(r.tipo) ? r.tipo : 'usada';

    if (tipo === 'usada') usado_cm2 += area_cm2;
    else if (tipo === 'retazo') retazo_cm2 += area_cm2;
    else if (tipo === 'merma') merma_cm2 += area_cm2;

    return {
      id: r.id || `R-${idx + 1}`,
      x,
      y,
      w,
      h,
      area_m2,
      tipo,
      etiqueta: r.etiqueta || (tipo === 'usada' ? `Pieza ${w}×${h}cm` : tipo === 'retazo' ? `Retazo útil ${w}×${h}cm` : `Merma ${w}×${h}cm`),
      cliente: r.cliente || '',
    };
  });

  const total_cm2 = W * H;
  const usado_m2 = r2(usado_cm2 / 10000);
  const retazo_m2 = r2(retazo_cm2 / 10000);
  const merma_m2 = r2(merma_cm2 / 10000);
  const sin_asignar_cm2 = Math.max(0, total_cm2 - (usado_cm2 + retazo_cm2 + merma_cm2));
  const sin_asignar_m2 = r2(sin_asignar_cm2 / 10000);

  const usado_pct = total_cm2 > 0 ? r2((usado_cm2 / total_cm2) * 100) : 0;
  const retazo_pct = total_cm2 > 0 ? r2((retazo_cm2 / total_cm2) * 100) : 0;
  const merma_pct = total_cm2 > 0 ? r2((merma_cm2 / total_cm2) * 100) : 0;
  const sin_asignar_pct = total_cm2 > 0 ? r2((sin_asignar_cm2 / total_cm2) * 100) : 0;

  const costo_merma_bs = r2(merma_m2 * Number(costo_m2_bs || 0));

  return {
    ancho_cm: W,
    alto_cm: H,
    area_total_m2,
    usado_m2,
    retazo_m2,
    merma_m2,
    sin_asignar_m2,
    usado_pct,
    retazo_pct,
    merma_pct,
    sin_asignar_pct,
    costo_m2_bs: r2(costo_m2_bs),
    costo_merma_bs,
    rectangulos: rectsNormalizados,
  };
}

/**
 * 3. Antigüedad y Bono de Antigüedad (Bolivia)
 */
function calcularAntiguedad(fecha_ingreso, hoy = HOY()) {
  if (!fecha_ingreso) return { anios: 0, meses: 0, texto: 'Reciente', pct_bono: 0 };
  const inicio = new Date(fecha_ingreso);
  const fin = new Date(hoy);
  let mesesTotales = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  if (mesesTotales < 0) mesesTotales = 0;
  const anios = Math.floor(mesesTotales / 12);
  const meses = mesesTotales % 12;

  // Escala referencial bono antigüedad boliviano
  let pct_bono = 0;
  if (anios >= 15) pct_bono = 34;
  else if (anios >= 11) pct_bono = 26;
  else if (anios >= 8) pct_bono = 18;
  else if (anios >= 5) pct_bono = 11;
  else if (anios >= 2) pct_bono = 5;

  const texto = anios > 0 ? `${anios} año${anios > 1 ? 's' : ''} y ${meses} mes${meses !== 1 ? 'es' : ''}` : `${meses} mes${meses !== 1 ? 'es' : ''}`;
  return { anios, meses, mesesTotales, texto, pct_bono };
}

module.exports = {
  r2,
  HOY,
  calcularCostoProyecto,
  calcularMatrizCorte,
  calcularAntiguedad,
};
