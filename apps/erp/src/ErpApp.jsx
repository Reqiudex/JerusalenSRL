import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Calculator,
  Grid,
  Package,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Building2,
  Eye
} from 'lucide-react';
import { MarbleBackground, fmtBs } from '@jerusalen/ui';

const SECCIONES = [
  { grupo: 'Comercial', items: [
    { id: 'panel', label: 'Panel General', icon: LayoutDashboard },
    { id: 'proformas', label: 'Proformas de Venta', icon: FileText },
    { id: 'ventas', label: 'Ventas y Cobros', icon: ShoppingBag },
  ]},
  { grupo: 'Taller e Inventario', items: [
    { id: 'produccion', label: 'Producción y Costos', icon: Calculator },
    { id: 'matriz', label: 'Matriz de Corte', icon: Grid },
    { id: 'inventario', label: 'Inventario y Compras', icon: Package },
  ]},
  { grupo: 'Administración', items: [
    { id: 'contabilidad', label: 'Contabilidad Simple', icon: Wallet },
    { id: 'rrhh', label: 'RRHH y Planilla', icon: Users },
    { id: 'reportes', label: 'Reportes y Gráficas', icon: BarChart3 },
    { id: 'ajustes', label: 'Usuarios y Ajustes', icon: Settings },
  ]},
];

const SUCURSALES_BASE = [
  { id: 'todas', nombre: 'Todas las sedes', codigo: 'SCZ' },
  { id: '1', nombre: 'Taller Central Km 13', codigo: 'KM13' },
  { id: '2', nombre: 'Showroom 4to Anillo Piraí', codigo: 'PIRAI' },
  { id: '3', nombre: 'Almacén Roca y Coronado', codigo: 'ROCA' },
];

export default function ErpApp({ theme, onToggleTheme, onSwitchToDueno }) {
  const [seccion, setSeccion] = useState('panel');
  const [sucursal, setSucursal] = useState('todas');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const itemActual = SECCIONES.flatMap(g => g.items).find(i => i.id === seccion) || SECCIONES[0].items[0];

  return (
    <div className="armazon">
      <MarbleBackground mode={theme === 'dark' ? 'dark' : 'light'} />

      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}

      <aside className={`lateral ${menuAbierto ? 'abierto' : ''}`}>
        <div className="mj-marca">
          <span className="mj-marca-nombre">JERUSALÉN</span>
          <span className="mj-marca-filete" />
          <span className="mj-marca-oficio">Mármol, Granito &amp; Cuarzo · S.R.L.</span>
        </div>

        <nav>
          {SECCIONES.map(grupo => (
            <React.Fragment key={grupo.grupo}>
              <div className="nav-seccion">{grupo.grupo}</div>
              {grupo.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item ${seccion === item.id ? 'activo' : ''}`}
                    onClick={() => { setSeccion(item.id); setMenuAbierto(false); }}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="mj-provisional" style={{ borderTop: '1px solid #2e2e32', paddingTop: 12, marginTop: 14, fontSize: 12, color: '#9a9ca1' }}>
          <div><strong style={{ color: '#fff' }}>Nain Torrico</strong></div>
          <div>Administrador General</div>
          {onSwitchToDueno && (
            <button
              type="button"
              className="btn pequeno"
              style={{ marginTop: 10, width: '100%', background: '#26262a', color: '#f3e5ab', borderColor: '#c9a86a' }}
              onClick={onSwitchToDueno}
            >
              <Eye size={14} /> Vista Don Emiliano (adminj)
            </button>
          )}
        </div>
      </aside>

      <div className="principal">
        <header className="barra-superior">
          <button
            type="button"
            className="btn-icono solo-movil"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X size={20} /> : <Menu size={20} />}
          </button>

          <span className="barra-titulo">{itemActual.label}</span>

          <div className="hueco" />

          <div className="mj-sede" role="group" aria-label="Filtrar por sucursal">
            {SUCURSALES_BASE.map(s => (
              <button
                key={s.id}
                type="button"
                className={sucursal === s.id ? 'activa' : ''}
                onClick={() => setSucursal(s.id)}
              >
                <span>{s.nombre}</span>
                <small>{s.codigo}</small>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn pequeno"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Claro' : 'Noche'}</span>
          </button>
        </header>

        <main className="contenido">
          <div className="mj-titular con-accion">
            <div>
              <p className="mj-ceja">Jerusalén S.R.L. · Santa Cruz, Bolivia</p>
              <h1>{itemActual.label}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="etiqueta tono-ambar">
                <Building2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {SUCURSALES_BASE.find(s => s.id === sucursal)?.nombre}
              </span>
            </div>
          </div>

          <div className="mj-cifras">
            <div className="mj-cifra oro-top">
              <span>Ventas del Mes</span>
              <strong>{fmtBs(184500)}</strong>
              <small>Taller + Showroom (Santa Cruz)</small>
            </div>
            <div className="mj-cifra">
              <span>Proformas Activas</span>
              <strong>18</strong>
              <small>Tasa de conversión: 64%</small>
            </div>
            <div className="mj-cifra">
              <span>Planchas y Retazos</span>
              <strong>142 pzas</strong>
              <small>38 retazos útiles reutilizables</small>
            </div>
            <div className="mj-cifra alerta">
              <span>Stock Bajo Mínimo</span>
              <strong>5 materiales</strong>
              <small>Requieren reposición de Brasil</small>
            </div>
          </div>

          <section className="mj-bloque">
            <header>
              <h2>Arquitectura Base ERP Lista ({itemActual.label})</h2>
              <span className="suave">Etapa 1 — Diseño mármol/oro, estructura monorepo y modo claro/noche</span>
            </header>
            <p className="suave">
              El módulo <strong>{itemActual.label}</strong> está estructurado y conectado al diseño base.
              Sin tienda online ni módulo ganadero, enfocado 100% en la operación de marmolería en taller y showroom.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
