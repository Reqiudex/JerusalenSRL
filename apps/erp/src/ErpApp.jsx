import React, { useState, useEffect, useCallback } from 'react';
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
  Eye,
  LogOut,
  Lock
} from 'lucide-react';
import { MarbleBackground, fmtBs, fmtNum, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch, guardarToken } from '../../../src/api';
import ProformasView from './views/ProformasView';
import VentasView from './views/VentasView';
import ProduccionView from './views/ProduccionView';
import MatrizCorteView from './views/MatrizCorteView';
import InventarioView from './views/InventarioView';
import ContabilidadView from './views/ContabilidadView';
import RrhhView from './views/RrhhView';
import ReportesView from './views/ReportesView';
import AjustesView from './views/AjustesView';

const SECCIONES = [
  {
    grupo: 'Comercial',
    items: [
      { id: 'panel', label: 'Panel General', icon: LayoutDashboard, roles: ['*'] },
      { id: 'proformas', label: 'Proformas de Venta', icon: FileText, roles: ['administrador', 'vendedor', 'contador'] },
      { id: 'ventas', label: 'Ventas y Cobros', icon: ShoppingBag, roles: ['administrador', 'vendedor', 'contador'] },
    ],
  },
  {
    grupo: 'Taller e Inventario',
    items: [
      { id: 'produccion', label: 'Producción y Costos', icon: Calculator, roles: ['administrador', 'cortador', 'vendedor'] },
      { id: 'matriz', label: 'Matriz de Corte', icon: Grid, roles: ['administrador', 'cortador'] },
      { id: 'inventario', label: 'Inventario y Compras', icon: Package, roles: ['administrador', 'cortador', 'vendedor', 'contador'] },
    ],
  },
  {
    grupo: 'Administración',
    items: [
      { id: 'contabilidad', label: 'Contabilidad Simple', icon: Wallet, roles: ['administrador', 'contador', 'rrhh'] },
      { id: 'rrhh', label: 'RRHH y Planilla', icon: Users, roles: ['administrador', 'rrhh', 'contador'] },
      { id: 'reportes', label: 'Reportes y Gráficas', icon: BarChart3, roles: ['administrador', 'contador', 'vendedor', 'dueno'] },
      { id: 'ajustes', label: 'Usuarios y Ajustes', icon: Settings, roles: ['administrador'] },
    ],
  },
];

export default function ErpApp({ theme, onToggleTheme, onSwitchToDueno }) {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  // Login form
  const [email, setEmail] = useState('nain@jerusalensrl.com');
  const [password, setPassword] = useState('jerusalen2026');
  const [errorLogin, setErrorLogin] = useState('');

  const [seccion, setSeccion] = useState('panel');
  const [sucursales, setSucursales] = useState([]);
  const [sucursal, setSucursal] = useState('todas');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [toast, setToast] = useState(null);

  // Datos del Panel General
  const [resumenPanel, setResumenPanel] = useState(null);

  const notificar = useCallback((texto, tipo = 'ok') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(res => {
        setUsuario(res.user);
        if (res.user.rol !== 'administrador' && res.user.sucursal_id) {
          setSucursal(String(res.user.sucursal_id));
        }
      })
      .catch(() => {
        setUsuario(null);
      })
      .finally(() => setVerificandoSesion(false));

    apiFetch('/api/auth/demo-users')
      .then(res => setDemoUsers(res.users || []))
      .catch(() => {});
  }, []);

  const cargarResumenPanel = useCallback(async () => {
    if (!usuario) return;
    try {
      const [rRes, sRes] = await Promise.all([
        apiFetch(`/api/erp/resumen?sucursal_id=${sucursal}`),
        apiFetch('/api/erp/sucursales'),
      ]);
      setResumenPanel(rRes);
      setSucursales(sRes.sucursales || []);
    } catch (e) {
      notificar(e.message, 'error');
    }
  }, [usuario, sucursal, notificar]);

  useEffect(() => {
    if (usuario) cargarResumenPanel();
  }, [usuario, sucursal, cargarResumenPanel]);

  const iniciarSesion = async (e) => {
    e?.preventDefault();
    setErrorLogin('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      guardarToken(res.token);
      if (res.user.rol === 'dueno' && onSwitchToDueno) {
        onSwitchToDueno();
        return;
      }
      setUsuario(res.user);
      if (res.user.rol !== 'administrador' && res.user.sucursal_id) {
        setSucursal(String(res.user.sucursal_id));
      } else {
        setSucursal('todas');
      }
    } catch (err) {
      setErrorLogin(err.message);
    }
  };

  const cerrarSesion = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    guardarToken('');
    setUsuario(null);
  };

  const tieneAcceso = (item) => {
    if (!usuario) return false;
    if (usuario.rol === 'administrador' || item.roles.includes('*')) return true;
    return item.roles.includes(usuario.rol);
  };

  if (verificandoSesion) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando ERP Jerusalén S.R.L....
      </div>
    );
  }

  // Pantalla de Acceso al ERP (erpj.cerice360.com)
  if (!usuario) {
    return (
      <div className="acceso mj-acceso">
        <MarbleBackground mode={theme === 'dark' ? 'dark' : 'light'} />
        <div className="mj-acceso-losa">
          <div className="mj-marca grande">
            <span className="mj-marca-nombre" style={{ fontSize: 36 }}>JERUSALÉN S.R.L.</span>
            <span className="mj-marca-filete" />
            <span className="mj-marca-oficio" style={{ fontSize: 18 }}>
              Mármol, Granito, Cuarzo y Piedra Sinterizada · Importado de Brasil
            </span>
          </div>

          <div>
            <p className="serif" style={{ fontSize: 22, color: '#e2ded5', fontStyle: 'italic', maxWidth: 460 }}>
              “Gestión integral de taller, showroom, matriz de corte de planchas, costos de obra y contabilidad en Santa Cruz de la Sierra.”
            </p>
            <div style={{ fontSize: 13, color: '#a3a29e', marginTop: 14 }}>
              Dueño: <strong>Don Emiliano Acero</strong> · Administrador: <strong>Nain Torrico</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {onSwitchToDueno && (
              <button
                type="button"
                className="btn oro"
                onClick={onSwitchToDueno}
              >
                <Eye size={16} /> Abrir Panel Simplificado Don Emiliano (adminj · PIN 1954)
              </button>
            )}
          </div>
        </div>

        <div className="mj-acceso-form">
          <div className="acceso-caja">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mj-ceja">Acceso Empleados y Administración (erpj)</span>
              <button type="button" className="btn pequeno" onClick={onToggleTheme}>
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
            <h1 className="serif" style={{ fontSize: 32, margin: '4px 0 8px' }}>Iniciar Sesión ERP</h1>

            {errorLogin && (
              <div style={{ background: 'var(--t-rojo-bg)', color: 'var(--t-rojo)', padding: '10px 12px', borderRadius: 4, fontSize: 13 }}>
                {errorLogin}
              </div>
            )}

            <form onSubmit={iniciarSesion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="campo">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nain@jerusalensrl.com"
                />
              </label>
              <label className="campo">
                <span>Contraseña</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </label>
              <button type="submit" className="btn primario" style={{ minHeight: 44, fontSize: 15 }}>
                <Lock size={16} /> Entrar al Sistema ERP
              </button>
            </form>

            {demoUsers.length > 0 && (
              <div style={{ borderTop: '1px solid var(--borde)', paddingTop: 12, marginTop: 6 }}>
                <small className="suave" style={{ display: 'block', marginBottom: 6 }}>
                  Accesos rápidos de demostración (clave: <code>jerusalen2026</code>):
                </small>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {demoUsers.map(u => (
                    <button
                      key={u.email}
                      type="button"
                      className="btn pequeno"
                      onClick={() => {
                        setEmail(u.email);
                        setPassword('jerusalen2026');
                      }}
                    >
                      {u.nombre.split(' ')[0]} ({u.rol})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const itemActual = SECCIONES.flatMap(g => g.items).find(i => i.id === seccion) || SECCIONES[0].items[0];
  const kpis = resumenPanel?.kpis || {};

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
          {SECCIONES.map(grupo => {
            const itemsVisibles = grupo.items.filter(tieneAcceso);
            if (itemsVisibles.length === 0) return null;
            return (
              <React.Fragment key={grupo.grupo}>
                <div className="nav-seccion">{grupo.grupo}</div>
                {itemsVisibles.map(item => {
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
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid #2e2e32', paddingTop: 12, marginTop: 14, fontSize: 12, color: '#9a9ca1' }}>
          <div><strong style={{ color: '#fff' }}>{usuario.nombre}</strong></div>
          <div>{usuario.rolNombre} · {usuario.sucursalCodigo}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {onSwitchToDueno && (
              <button
                type="button"
                className="btn pequeno"
                style={{ width: '100%', background: '#26262a', color: '#f3e5ab', borderColor: '#c9a86a' }}
                onClick={onSwitchToDueno}
              >
                <Eye size={14} /> Panel Don Emiliano (adminj)
              </button>
            )}
            <button
              type="button"
              className="btn pequeno"
              style={{ width: '100%', background: 'transparent', color: '#d1d5db', borderColor: '#3f3f46' }}
              onClick={cerrarSesion}
            >
              <LogOut size={14} /> Cerrar Sesión
            </button>
          </div>
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

          {/* Selector de Sucursal (El administrador ve todas o filtra) */}
          <div className="mj-sede" role="group" aria-label="Filtrar por sucursal">
            {usuario.rol === 'administrador' && (
              <button
                type="button"
                className={sucursal === 'todas' ? 'activa' : ''}
                onClick={() => setSucursal('todas')}
              >
                <span>Todas las sedes</span>
                <small>SCZ</small>
              </button>
            )}
            {sucursales
              .filter(s => usuario.rol === 'administrador' || !usuario.sucursal_id || s.id === usuario.sucursal_id)
              .map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={String(sucursal) === String(s.id) ? 'activa' : ''}
                  onClick={() => setSucursal(String(s.id))}
                >
                  <span>{s.nombre.split(' ').slice(0, 2).join(' ')}</span>
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

        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 80,
              padding: '12px 18px',
              borderRadius: 6,
              background: toast.tipo === 'error' ? '#a63d2f' : '#1c1c1e',
              color: '#fff',
              border: '1px solid #c9a86a',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              fontWeight: 600,
            }}
          >
            {toast.texto}
          </div>
        )}

        <main className="contenido">
          {seccion === 'panel' && (
            <div>
              <div className="mj-titular con-accion">
                <div>
                  <p className="mj-ceja">Jerusalén S.R.L. · Taller y Showroom en Santa Cruz de la Sierra</p>
                  <h1>Panel General de Operaciones</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn primario" onClick={() => setSeccion('proformas')}>
                    + Nueva Proforma
                  </button>
                  <button type="button" className="btn oro" onClick={() => setSeccion('matriz')}>
                    Abrir Matriz de Corte
                  </button>
                </div>
              </div>

              <div className="mj-cifras">
                <div className="mj-cifra oro-top">
                  <span>Ventas del Mes ({resumenPanel?.mes || '2026-11'})</span>
                  <strong>{fmtBs(kpis.totalVentasBs)}</strong>
                  <small>Cobrado: {fmtBs(kpis.totalCobradoBs)}</small>
                </div>
                <div className="mj-cifra" style={{ borderTopColor: '#2f7d5b' }}>
                  <span>Resultado Neto Contable</span>
                  <strong className="verde">{fmtBs(kpis.resultadoMesBs)}</strong>
                  <small>Ingresos: {fmtBs(kpis.ingresosContablesBs)} · Gastos: {fmtBs(kpis.egresosContablesBs)}</small>
                </div>
                <div className="mj-cifra">
                  <span>Proformas y Conversión</span>
                  <strong>{kpis.proformasCount || 0} proformas</strong>
                  <small>Tasa de conversión: {kpis.tasaConversionPct || 0}% ({kpis.proformasConvertidas || 0} ventas)</small>
                </div>
                <div className="mj-cifra">
                  <span>Retazos Reutilizables</span>
                  <strong>{kpis.retazosCount || 0} piezas</strong>
                  <small>{fmtNum(kpis.retazosM2)} m² útiles en taller</small>
                </div>
                <div className="mj-cifra alerta">
                  <span>Stock Bajo Mínimo</span>
                  <strong>{kpis.bajoMinimoCount || 0} materiales</strong>
                  <small>Cuentas por cobrar: {fmtBs(kpis.cuentasPorCobrarBs)}</small>
                </div>
              </div>

              <div className="mj-dos">
                <section className="mj-bloque">
                  <header>
                    <h2>Últimas Ventas Registradas</h2>
                    <button type="button" className="btn pequeno" onClick={() => setSeccion('ventas')}>Ver todas</button>
                  </header>
                  <div className="tabla-marco">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Cliente</th>
                          <th>Vendedor</th>
                          <th>Estado</th>
                          <th className="derecha">Total (Bs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(resumenPanel?.ultimasVentas || []).map(v => (
                          <tr key={v.id}>
                            <td className="mono"><strong>{v.codigo}</strong></td>
                            <td>{v.cliente_nombre}</td>
                            <td>{v.vendedor_nombre}</td>
                            <td><EtiquetaEstado estado={v.estado_pago} /></td>
                            <td className="derecha"><strong>{fmtBs(v.total_bs)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mj-bloque">
                  <header>
                    <h2>Materiales que Requieren Compra (Bajo Mínimo)</h2>
                    <button type="button" className="btn pequeno oro" onClick={() => setSeccion('inventario')}>
                      Ir a Lista de Compras
                    </button>
                  </header>
                  <div className="tabla-marco">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th className="derecha">Stock Actual</th>
                          <th className="derecha">Mínimo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(resumenPanel?.alertasStock || []).map(m => (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.nombre}</strong>
                              <div><small className="suave">{m.proveedor}</small></div>
                            </td>
                            <td className="derecha rojo"><strong>{fmtNum(m.stock)} {m.unidad}</strong></td>
                            <td className="derecha">{fmtNum(m.minimo)} {m.unidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}

          {seccion === 'proformas' && (
            <ProformasView
              sucursal={sucursal}
              usuario={usuario}
              onNotificar={notificar}
              onConvertida={cargarResumenPanel}
            />
          )}

          {seccion === 'ventas' && (
            <VentasView sucursal={sucursal} usuario={usuario} onNotificar={notificar} />
          )}

          {seccion === 'produccion' && (
            <ProduccionView sucursal={sucursal} usuario={usuario} onNotificar={notificar} />
          )}

          {seccion === 'matriz' && (
            <MatrizCorteView sucursal={sucursal} usuario={usuario} onNotificar={notificar} />
          )}

          {seccion === 'inventario' && (
            <InventarioView sucursal={sucursal} usuario={usuario} onNotificar={notificar} />
          )}

          {seccion === 'contabilidad' && (
            <ContabilidadView sucursal={sucursal} usuario={usuario} onNotificar={notificar} />
          )}

          {seccion === 'rrhh' && (
            <RrhhView sucursal={sucursal} onNotificar={notificar} />
          )}

          {seccion === 'reportes' && (
            <ReportesView sucursal={sucursal} onNotificar={notificar} />
          )}

          {seccion === 'ajustes' && (
            <AjustesView sucursal={sucursal} onNotificar={notificar} />
          )}
        </main>
      </div>
    </div>
  );
}
