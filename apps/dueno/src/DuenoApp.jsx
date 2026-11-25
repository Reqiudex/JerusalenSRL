import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Sun, Moon, ArrowLeft, ArrowRight, Building2, Lock, LogOut } from 'lucide-react';
import { MarbleBackground, fmtBs, fmtNum } from '@jerusalen/ui';
import { apiFetch, guardarToken } from '../../../src/api';

const MESES = [
  '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
  '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
];

const NOMBRES_MES = {
  '2025-12': 'Diciembre 2025',
  '2026-01': 'Enero 2026',
  '2026-02': 'Febrero 2026',
  '2026-03': 'Marzo 2026',
  '2026-04': 'Abril 2026',
  '2026-05': 'Mayo 2026',
  '2026-06': 'Junio 2026',
  '2026-07': 'Julio 2026',
  '2026-08': 'Agosto 2026',
  '2026-09': 'Septiembre 2026',
  '2026-10': 'Octubre 2026',
  '2026-11': 'Noviembre 2026',
};

export default function DuenoApp({ theme, onToggleTheme, onSwitchToErp }) {
  const [autenticado, setAutenticado] = useState(false);
  const [pin, setPin] = useState('1954');
  const [errorPin, setErrorPin] = useState('');
  const [mes, setMes] = useState('2026-11');
  const [sucursal, setSucursal] = useState('todas');
  const [datos, setDatos] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/erp/dueno?mes=${mes}&sucursal_id=${sucursal}`);
      setDatos(res);
      setAutenticado(true);
    } catch (e) {
      if (e.status === 401) setAutenticado(false);
    }
  }, [mes, sucursal]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const ingresarConPin = async (e) => {
    e?.preventDefault();
    setErrorPin('');
    try {
      const res = await apiFetch('/api/auth/pin', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      guardarToken(res.token);
      setAutenticado(true);
      cargarDatos();
    } catch (err) {
      setErrorPin(err.message || 'PIN incorrecto');
    }
  };

  const cambiarMes = (delta) => {
    const idx = MESES.indexOf(mes);
    if (idx === -1) return;
    const nextIdx = Math.max(0, Math.min(MESES.length - 1, idx + delta));
    setMes(MESES[nextIdx]);
  };

  const leerEnVozAlta = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !datos) return;
    window.speechSynthesis.cancel();
    const gane = Math.round(datos.tarjetas?.loQueGaneBs || 0);
    const gaste = Math.round(datos.tarjetas?.loQueGasteBs || 0);
    const queda = Math.round(datos.tarjetas?.loQueMeQuedaBs || 0);
    const topProd = datos.produccionProductos?.[0]?.nombre || 'Piedra Sinterizada';
    const mermaM2 = datos.mermasResumen?.merma_m2 || 0;
    const comprarCount = datos.queComprar?.length || 0;

    const texto = [
      `Resumen de Jerusalén S.R.L. para Don Emiliano Acero, mes de ${NOMBRES_MES[mes] || mes}.`,
      `Lo que ganó este mes: ${gane} bolivianos.`,
      `Lo que gastó: ${gaste} bolivianos.`,
      `Lo que le queda libre: ${queda} bolivianos.`,
      `El material más producido es ${topProd}.`,
      `Las mermas registradas son ${mermaM2} metros cuadrados y hay ${comprarCount} materiales que necesitan comprarse.`,
    ].join(' ');

    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'es-BO';
    msg.rate = 0.92;
    window.speechSynthesis.speak(msg);
  };

  // Pantalla de Ingreso con PIN de 4–6 dígitos (botones grandes para Don Emiliano)
  if (!autenticado) {
    return (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <MarbleBackground mode={theme === 'dark' ? 'dark' : 'light'} />
        <div className="dueno-app" style={{ maxWidth: 560, paddingTop: 48 }}>
          <div className="dueno-tarjeta" style={{ textAlign: 'center', border: '3px solid var(--caliza)' }}>
            <div className="grabado" style={{ fontSize: 30, fontWeight: 700 }}>JERUSALÉN S.R.L.</div>
            <h1 className="serif" style={{ fontSize: 34, margin: '8px 0 12px', color: 'var(--caliza-osc)' }}>
              Bienvenido, Don Emiliano
            </h1>
            <p style={{ fontSize: 22, marginBottom: 18 }}>
              Escriba su PIN de 4 a 6 números para ver cómo va la marmolería:
            </p>

            {errorPin && (
              <div style={{ background: 'var(--t-rojo-bg)', color: 'var(--t-rojo)', padding: 14, borderRadius: 10, marginBottom: 16, fontWeight: 700 }}>
                {errorPin}
              </div>
            )}

            <form onSubmit={ingresarConPin}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1954"
                style={{
                  fontSize: 38,
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  minHeight: 72,
                  fontWeight: 700,
                  marginBottom: 16,
                  fontFamily: 'var(--mono)',
                }}
              />

              {/* Teclado numérico táctil gigante */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    className="dueno-btn"
                    style={{ fontSize: 28, minHeight: 64 }}
                    onClick={() => setPin(prev => (prev.length < 6 ? prev + String(num) : prev))}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="dueno-btn"
                  style={{ fontSize: 20, minHeight: 64 }}
                  onClick={() => setPin('')}
                >
                  Borrar
                </button>
                <button
                  type="button"
                  className="dueno-btn"
                  style={{ fontSize: 28, minHeight: 64 }}
                  onClick={() => setPin(prev => (prev.length < 6 ? prev + '0' : prev))}
                >
                  0
                </button>
                <button
                  type="button"
                  className="dueno-btn"
                  style={{ fontSize: 20, minHeight: 64 }}
                  onClick={() => setPin('1954')}
                >
                  PIN 1954
                </button>
              </div>

              <button type="submit" className="dueno-btn oro" style={{ width: '100%', minHeight: 68, fontSize: 24 }}>
                <Lock size={26} /> Entrar a Mi Panel
              </button>
            </form>

            {onSwitchToErp && (
              <button
                type="button"
                className="dueno-btn"
                style={{ width: '100%', marginTop: 14, fontSize: 18 }}
                onClick={onSwitchToErp}
              >
                Ir al ERP Completo (Nain y Empleados)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tarjetas = datos?.tarjetas || { loQueGaneBs: 0, loQueGasteBs: 0, loQueMeQuedaBs: 0 };
  const produccion = datos?.produccionProductos || [];
  const maxProdM2 = Math.max(1, ...produccion.map(p => p.m2));
  const mermas = datos?.mermasResumen || {};
  const queComprar = datos?.queComprar || [];
  const vendedores = datos?.vendedores || [];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <MarbleBackground mode={theme === 'dark' ? 'dark' : 'light'} />

      <div className="dueno-app">
        {/* Cabecera Principal con Botón Leer en Voz Alta */}
        <header className="dueno-cabecera">
          <div>
            <div className="grabado" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.08em' }}>
              JERUSALÉN S.R.L.
            </div>
            <div className="serif" style={{ fontSize: 24, color: 'var(--caliza-osc)', fontWeight: 600 }}>
              Panel de Don Emiliano Acero (Solo Lectura)
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" className="dueno-btn oro" onClick={leerEnVozAlta}>
              <Volume2 size={28} /> Leer en voz alta
            </button>
            <button type="button" className="dueno-btn" onClick={onToggleTheme}>
              {theme === 'dark' ? <Sun size={26} /> : <Moon size={26} />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Noche'}
            </button>
            {onSwitchToErp && (
              <button type="button" className="dueno-btn" onClick={onSwitchToErp}>
                ERP (Nain)
              </button>
            )}
            <button
              type="button"
              className="dueno-btn"
              onClick={() => {
                guardarToken('');
                setAutenticado(false);
              }}
            >
              <LogOut size={24} /> Salir
            </button>
          </div>
        </header>

        {/* Selector de Mes con Flechas Enormes y Selector de Sucursal */}
        <div className="dueno-cabecera" style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="dueno-btn"
              onClick={() => cambiarMes(-1)}
              disabled={MESES.indexOf(mes) <= 0}
            >
              <ArrowLeft size={28} /> Mes Anterior
            </button>
            <strong className="serif" style={{ fontSize: 32, padding: '0 10px' }}>
              {NOMBRES_MES[mes] || mes}
            </strong>
            <button
              type="button"
              className="dueno-btn"
              onClick={() => cambiarMes(1)}
              disabled={MESES.indexOf(mes) >= MESES.length - 1}
            >
              Mes Siguiente <ArrowRight size={28} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Building2 size={28} />
            <select
              value={sucursal}
              onChange={e => setSucursal(e.target.value)}
              style={{ fontSize: 22, minHeight: 58, padding: '10px 18px', fontWeight: 700, width: 'auto' }}
            >
              <option value="todas">Todas las Sucursales</option>
              {(datos?.sucursales || []).map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 1. Tarjetas Principales: Lo que gané este mes, Lo que gasté, Lo que me queda */}
        <div className="dueno-tarjetas-3">
          <div className="dueno-tarjeta" style={{ borderTop: '8px solid var(--estado)' }}>
            <h2>Lo que gané este mes</h2>
            <div className="dueno-monto verde">{fmtBs(tarjetas.loQueGaneBs)}</div>
            <div>Todo lo cobrado por ventas de mármol, granito y trabajos</div>
          </div>

          <div className="dueno-tarjeta" style={{ borderTop: '8px solid var(--oxido)' }}>
            <h2>Lo que gasté</h2>
            <div className="dueno-monto rojo">{fmtBs(tarjetas.loQueGasteBs)}</div>
            <div>Compras de planchas de Brasil, sueldos y gastos</div>
          </div>

          <div className="dueno-tarjeta" style={{ borderTop: '8px solid var(--caliza)' }}>
            <h2>Lo que me queda</h2>
            <div className="dueno-monto oro">{fmtBs(tarjetas.loQueMeQuedaBs)}</div>
            <div>Dinero libre después de pagar todo</div>
          </div>
        </div>

        {/* 2. Producción de cada producto (barras simples) + 3. Mermas */}
        <div className="mj-dos-igual" style={{ marginBottom: 22 }}>
          <section className="dueno-tarjeta">
            <h2>Producción de cada producto</h2>
            <p className="suave" style={{ fontSize: 19, marginBottom: 14 }}>
              Metros cuadrados (m²) vendidos y cortados en {NOMBRES_MES[mes] || mes}:
            </p>
            {produccion.length === 0 ? (
              <div>No hay producción registrada en este mes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {produccion.map((p, i) => {
                  const pct = Math.max(8, Math.round((p.m2 / maxProdM2) * 100));
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                        <span>{p.nombre}</span>
                        <span className="mono">{fmtNum(p.m2)} m²</span>
                      </div>
                      <div style={{ background: 'var(--superficie-suave)', height: 24, borderRadius: 6, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #2f7d5b, #c9a86a)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dueno-tarjeta">
            <h2>Mermas y Aprovechamiento de Planchas</h2>
            <p className="suave" style={{ fontSize: 19, marginBottom: 14 }}>
              Resumen de las planchas cortadas en el taller:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--borde)', paddingBottom: 10 }}>
                <span>Piedra bien aprovechada (Vendida):</span>
                <strong className="mono verde">{fmtNum(mermas.usado_m2)} m²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--borde)', paddingBottom: 10 }}>
                <span>Pedazos buenos guardados (Retazos):</span>
                <strong className="mono oro">{fmtNum(mermas.retazo_util_m2)} m²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--borde)', paddingBottom: 10 }}>
                <span>Desperdicio / Merma rota:</span>
                <strong className="mono rojo">{fmtNum(mermas.merma_m2)} m²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Valor perdido en mermas:</span>
                <strong className="mono rojo">{fmtBs(mermas.costo_merma_bs)}</strong>
              </div>
            </div>
          </section>
        </div>

        {/* 4. Qué tengo que comprar + 5. Cómo van mis vendedores (proformas -> ventas) */}
        <div className="mj-dos-igual">
          <section className="dueno-tarjeta">
            <h2>Qué tengo que comprar</h2>
            <p className="suave" style={{ fontSize: 19, marginBottom: 14 }}>
              Materiales que se están acabando y hay que pedir a Brasil:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {queComprar.map(m => (
                <div
                  key={m.id}
                  style={{
                    border: '2px solid var(--borde)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: 22 }}>{m.nombre}</strong>
                    <span className="suave" style={{ fontSize: 18 }}>
                      Quedan {fmtNum(m.stock)} m² (Mínimo: {fmtNum(m.minimo)} m²)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700 }} className="rojo">
                    Pedir {m.planchas_comprar} planchas
                    <div style={{ fontSize: 17 }} className="mono">({fmtNum(m.faltante_m2)} m²)</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dueno-tarjeta">
            <h2>Cómo van mis vendedores</h2>
            <p className="suave" style={{ fontSize: 19, marginBottom: 14 }}>
              Cuántas cotizaciones (proformas) se convirtieron en ventas:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {vendedores.map((v, i) => (
                <div
                  key={i}
                  style={{
                    border: '2px solid var(--borde)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: 22 }}>{v.nombre}</strong>
                    <span style={{ fontSize: 19 }}>
                      Hizo <strong>{v.proformas}</strong> proformas → cerró <strong>{v.ventas}</strong> ventas ({v.conversion_pct}%)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong className="mono verde" style={{ fontSize: 23 }}>{fmtBs(v.vendido_bs)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
