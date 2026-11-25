import React, { useState, useEffect } from 'react';
import { Users, Building2, Plus, Award } from 'lucide-react';
import { fmtBs } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

export default function RrhhView({ sucursal, onNotificar }) {
  const [datos, setDatos] = useState({
    periodo: '2026-11',
    totalTrabajadores: 0,
    totalGeneralBs: 0,
    planillaPorSucursal: [],
    trabajadores: [],
  });
  const [sucursales, setSucursales] = useState([]);
  const [modalTrabajador, setModalTrabajador] = useState(false);
  const [modalSucursal, setModalSucursal] = useState(false);

  // Nuevo trabajador
  const [nombre, setNombre] = useState('');
  const [ci, setCi] = useState('');
  const [cargo, setCargo] = useState('Cortador / Pulidor');
  const [seccion, setSeccion] = useState('corte');
  const [sucIdForm, setSucIdForm] = useState(1);
  const [fechaIngreso, setFechaIngreso] = useState('2023-04-10');
  const [sueldoBs, setSueldoBs] = useState(2500);
  const [bonoBs, setBonoBs] = useState(150);

  // Alta/Edición de sucursal
  const [sucEditId, setSucEditId] = useState(null);
  const [sucCodigo, setSucCodigo] = useState('');
  const [sucNombre, setSucNombre] = useState('');
  const [sucDireccion, setSucDireccion] = useState('');
  const [sucEncargado, setSucEncargado] = useState('');
  const [sucTelefono, setSucTelefono] = useState('');

  const cargar = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        apiFetch(`/api/erp/rrhh?sucursal_id=${sucursal}`),
        apiFetch('/api/erp/sucursales'),
      ]);
      setDatos(rRes);
      setSucursales(sRes.sucursales || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const guardarTrabajador = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/erp/rrhh/trabajadores', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: Number(sucIdForm),
          nombre,
          ci,
          cargo,
          seccion,
          fecha_ingreso: fechaIngreso,
          sueldo_bs: Number(sueldoBs),
          bono_bs: Number(bonoBs),
        }),
      });
      onNotificar?.(`Trabajador ${nombre} incorporado a planilla.`);
      setModalTrabajador(false);
      setNombre('');
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const abrirModalSucursal = (s = null) => {
    if (s) {
      setSucEditId(s.id);
      setSucCodigo(s.codigo);
      setSucNombre(s.nombre);
      setSucDireccion(s.direccion || '');
      setSucEncargado(s.encargado || '');
      setSucTelefono(s.telefono || '');
    } else {
      setSucEditId(null);
      setSucCodigo('');
      setSucNombre('');
      setSucDireccion('');
      setSucEncargado('');
      setSucTelefono('');
    }
    setModalSucursal(true);
  };

  const guardarSucursal = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/erp/sucursales', {
        method: 'POST',
        body: JSON.stringify({
          id: sucEditId,
          codigo: sucCodigo,
          nombre: sucNombre,
          direccion: sucDireccion,
          encargado: sucEncargado,
          telefono: sucTelefono,
        }),
      });
      onNotificar?.(`Sucursal ${sucNombre} guardada correctamente.`);
      setModalSucursal(false);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Personal por Fábrica y Showroom · Antigüedad Automática y Planilla Mensual</p>
          <h1>Recursos Humanos y Planilla</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => abrirModalSucursal(null)}>
            <Building2 size={16} /> Nueva Sucursal
          </button>
          <button type="button" className="btn primario" onClick={() => setModalTrabajador(true)}>
            <Plus size={16} /> Incorporar Trabajador
          </button>
        </div>
      </div>

      <div className="mj-cifras">
        <div className="mj-cifra oro-top">
          <span>Planilla Mensual Total</span>
          <strong>{fmtBs(datos.totalGeneralBs)}</strong>
          <small>{datos.totalTrabajadores} trabajadores activos en planilla</small>
        </div>
        {datos.planillaPorSucursal.map(ps => (
          <div className="mj-cifra" key={ps.sucursal_id}>
            <span>{ps.sucursal_nombre}</span>
            <strong>{fmtBs(ps.liquido_total_bs)}</strong>
            <small>{ps.trabajadores_count} trabajadores ({ps.sucursal_codigo})</small>
          </div>
        ))}
      </div>

      {/* Sucursales y Fábricas (Alta / Edición) */}
      <section className="mj-bloque">
        <header>
          <h2>Sucursales y Fábricas en Santa Cruz ({sucursales.length})</h2>
          <span className="suave">Alta y edición de sedes operativas</span>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de Fábrica / Sucursal</th>
                <th>Dirección</th>
                <th>Encargado</th>
                <th>Teléfono</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map(s => (
                <tr key={s.id}>
                  <td className="mono"><strong>{s.codigo}</strong></td>
                  <td><strong>{s.nombre}</strong></td>
                  <td>{s.direccion}</td>
                  <td>{s.encargado}</td>
                  <td className="mono">{s.telefono}</td>
                  <td>
                    <button type="button" className="btn pequeno" onClick={() => abrirModalSucursal(s)}>
                      Editar Sede
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Planilla Mensual de Personal con Antigüedad Automática */}
      <section className="mj-bloque">
        <header>
          <h2>Planilla Mensual General y por Sucursal ({datos.periodo})</h2>
          <span className="suave">Antigüedad y bono calculados automáticamente desde la fecha de ingreso</span>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Trabajador / C.I.</th>
                <th>Cargo / Sección</th>
                <th>Fábrica / Sucursal</th>
                <th>Fecha Ingreso</th>
                <th>Antigüedad Automática</th>
                <th className="derecha">Haber Básico</th>
                <th className="derecha">Bono Antig. + Prod.</th>
                <th className="derecha">Líquido Pagable</th>
              </tr>
            </thead>
            <tbody>
              {datos.trabajadores.map(t => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.nombre}</strong>
                    <div><small className="mono suave">CI: {t.ci || 'S/N'}</small></div>
                  </td>
                  <td>
                    <div>{t.cargo}</div>
                    <small className="suave">{t.seccion}</small>
                  </td>
                  <td><span className="etiqueta tono-gris">{t.sucursal_codigo}</span> {t.sucursal_nombre}</td>
                  <td className="mono">{t.fecha_ingreso}</td>
                  <td>
                    <span className="etiqueta tono-ambar">
                      <Award size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                      {t.antiguedad?.texto} ({t.antiguedad?.pct_bono}%)
                    </span>
                  </td>
                  <td className="derecha">{fmtBs(t.sueldo_bs)}</td>
                  <td className="derecha">{fmtBs(t.bono_antiguedad_bs + (t.bono_bs || 0))}</td>
                  <td className="derecha verde"><strong>{fmtBs(t.total_ganado_bs)}</strong></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--superficie-suave)', fontWeight: 700, fontSize: 15 }}>
                <td colSpan={5}>TOTAL PLANILLA MENSUAL ({datos.trabajadores.length} trabajadores)</td>
                <td className="derecha">
                  {fmtBs(datos.trabajadores.reduce((s, t) => s + t.sueldo_bs, 0))}
                </td>
                <td className="derecha">
                  {fmtBs(datos.trabajadores.reduce((s, t) => s + t.bono_antiguedad_bs + (t.bono_bs || 0), 0))}
                </td>
                <td className="derecha verde">{fmtBs(datos.totalGeneralBs)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Nuevo Trabajador */}
      {modalTrabajador && (
        <div className="capa" onClick={() => setModalTrabajador(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Incorporar Trabajador a Planilla</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalTrabajador(false)}>Cerrar</button>
            </header>
            <form onSubmit={guardarTrabajador}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo">
                    <span>Nombre Completo *</span>
                    <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Mario Salvatierra" />
                  </label>
                  <label className="campo">
                    <span>Cédula de Identidad (C.I.)</span>
                    <input value={ci} onChange={e => setCi(e.target.value)} placeholder="6819203 SC" />
                  </label>
                  <label className="campo">
                    <span>Cargo *</span>
                    <input required value={cargo} onChange={e => setCargo(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Sección</span>
                    <select value={seccion} onChange={e => setSeccion(e.target.value)}>
                      <option value="corte">Corte Sierra Puente</option>
                      <option value="taller">Taller y Pulido</option>
                      <option value="instalacion">Instalación en Obra</option>
                      <option value="showroom">Showroom y Ventas</option>
                      <option value="administracion">Administración</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Fábrica / Sucursal</span>
                    <select value={sucIdForm} onChange={e => setSucIdForm(e.target.value)}>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Fecha de Ingreso (Calcula Antigüedad)</span>
                    <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Haber Básico Mensual (Bs)</span>
                    <input type="number" value={sueldoBs} onChange={e => setSueldoBs(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Bono Producción Mensual (Bs)</span>
                    <input type="number" value={bonoBs} onChange={e => setBonoBs(e.target.value)} />
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalTrabajador(false)}>Cancelar</button>
                <button type="submit" className="btn primario"><Users size={15} /> Guardar en Planilla</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alta/Edición de Sucursal */}
      {modalSucursal && (
        <div className="capa" onClick={() => setModalSucursal(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>{sucEditId ? 'Editar Sucursal' : 'Registrar Nueva Sucursal / Fábrica'}</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalSucursal(false)}>Cerrar</button>
            </header>
            <form onSubmit={guardarSucursal}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo">
                    <span>Código Corto *</span>
                    <input required value={sucCodigo} onChange={e => setSucCodigo(e.target.value)} placeholder="Ej. NORTE" />
                  </label>
                  <label className="campo">
                    <span>Nombre de la Sucursal *</span>
                    <input required value={sucNombre} onChange={e => setSucNombre(e.target.value)} placeholder="Ej. Showroom Av. Cristo Redentor" />
                  </label>
                  <label className="campo completo">
                    <span>Dirección en Santa Cruz</span>
                    <input value={sucDireccion} onChange={e => setSucDireccion(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Encargado</span>
                    <input value={sucEncargado} onChange={e => setSucEncargado(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Teléfono</span>
                    <input value={sucTelefono} onChange={e => setSucTelefono(e.target.value)} />
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalSucursal(false)}>Cancelar</button>
                <button type="submit" className="btn primario">Guardar Sucursal</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
