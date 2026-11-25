import React, { useState } from 'react';
import { Volume2, Sun, Moon, ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { MarbleBackground, fmtBs } from '@jerusalen/ui';

export default function DuenoApp({ theme, onToggleTheme, onSwitchToErp }) {
  const [mes, setMes] = useState('2026-11');
  const [sucursal, setSucursal] = useState('todas');

  const leerEnVozAlta = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(
      'Resumen de Jerusalén S.R.L. Don Emiliano: Este mes ingresaron 184 mil 500 bolivianos. Se gastaron 112 mil 300 bolivianos. Le quedan libres 72 mil 200 bolivianos.'
    );
    msg.lang = 'es-BO';
    msg.rate = 0.95;
    window.speechSynthesis.speak(msg);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <MarbleBackground mode={theme === 'dark' ? 'dark' : 'light'} />

      <div className="dueno-app">
        <header className="dueno-cabecera">
          <div>
            <div className="grabado" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.1em' }}>
              JERUSALÉN S.R.L.
            </div>
            <div className="serif" style={{ fontSize: 22, color: 'var(--caliza-osc)' }}>
              Resumen para Don Emiliano Acero
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" className="dueno-btn oro" onClick={leerEnVozAlta}>
              <Volume2 size={26} /> Leer en voz alta
            </button>
            <button type="button" className="dueno-btn" onClick={onToggleTheme}>
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Noche'}
            </button>
            {onSwitchToErp && (
              <button type="button" className="dueno-btn" onClick={onSwitchToErp}>
                Ir al ERP (Nain)
              </button>
            )}
          </div>
        </header>

        <div className="dueno-cabecera" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="dueno-btn" onClick={() => setMes('2026-10')}>
              <ArrowLeft size={24} /> Mes Anterior
            </button>
            <strong className="serif" style={{ fontSize: 28, padding: '0 12px' }}>
              Noviembre 2026 ({mes})
            </strong>
            <button type="button" className="dueno-btn" onClick={() => setMes('2026-11')}>
              Mes Actual <ArrowRight size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={24} />
            <select
              value={sucursal}
              onChange={e => setSucursal(e.target.value)}
              style={{ fontSize: 20, minHeight: 54, padding: '8px 16px', fontWeight: 700 }}
            >
              <option value="todas">Todas las Sucursales</option>
              <option value="1">Taller Central Km 13</option>
              <option value="2">Showroom 4to Anillo Piraí</option>
              <option value="3">Almacén Roca y Coronado</option>
            </select>
          </div>
        </div>

        <div className="dueno-tarjetas-3">
          <div className="dueno-tarjeta" style={{ borderTop: '6px solid var(--estado)' }}>
            <h2>Lo que gané este mes</h2>
            <div className="dueno-monto verde">{fmtBs(184500)}</div>
            <div>Ventas cobradas en taller y showroom</div>
          </div>

          <div className="dueno-tarjeta" style={{ borderTop: '6px solid var(--oxido)' }}>
            <h2>Lo que gasté</h2>
            <div className="dueno-monto rojo">{fmtBs(112300)}</div>
            <div>Compras de piedra, sueldos y gastos</div>
          </div>

          <div className="dueno-tarjeta" style={{ borderTop: '6px solid var(--caliza)' }}>
            <h2>Lo que me queda</h2>
            <div className="dueno-monto oro">{fmtBs(72200)}</div>
            <div>Ganancia limpia del mes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
