import React from 'react';
import MarbleBackground from '../../../src/components/MarbleBackground';

export { MarbleBackground };

export const fmtBs = (n) => {
  const num = Number(n || 0);
  return 'Bs ' + num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtNum = (n, dec = 2) => {
  const num = Number(n || 0);
  return num.toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

export function MuestraPiedra({ muestra, className = 'mj-muestra', style = {} }) {
  if (!muestra) {
    return <span className={`${className} sin-muestra`} style={style} />;
  }
  const m = typeof muestra === 'string' ? (() => { try { return JSON.parse(muestra); } catch { return null; } })() : muestra;
  if (!m) return <span className={`${className} sin-muestra`} style={style} />;
  const bg = m.veta
    ? `radial-gradient(circle at 28% 35%, ${m.motas || m.veta}44 0 2px, transparent 3px) 0 0 / 16px 16px, linear-gradient(132deg, ${m.fondo} 0%, ${m.fondo} 42%, ${m.veta}88 48%, ${m.fondo} 55%, ${m.veta}44 78%, ${m.fondo} 100%)`
    : m.fondo || '#e5e0d5';
  return <span className={className} style={{ background: bg, ...style }} />;
}

export function EtiquetaEstado({ estado, texto }) {
  const mapa = {
    enviada: 'tono-ambar',
    enviado: 'tono-ambar',
    borrador: 'tono-gris',
    aceptada: 'tono-verde',
    aceptado: 'tono-verde',
    convertida: 'tono-azul',
    terminada: 'tono-verde',
    hecho: 'tono-verde',
    pagado: 'tono-verde',
    ok: 'tono-verde',
    en_curso: 'tono-ambar',
    taller: 'tono-ambar',
    instalacion: 'tono-azul',
    medicion: 'tono-gris',
    pendiente: 'tono-ambar',
    parcial: 'tono-ambar',
    justo: 'tono-ambar',
    vencida: 'tono-rojo',
    rechazada: 'tono-rojo',
    perdido: 'tono-rojo',
    bajo: 'tono-rojo',
  };
  return (
    <span className={`etiqueta ${mapa[estado] || 'tono-gris'}`}>
      {texto || estado}
    </span>
  );
}
