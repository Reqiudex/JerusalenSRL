import React, { useState, useEffect } from 'react';
import { Settings, UserPlus, RotateCcw, Shield } from 'lucide-react';
import { apiFetch } from '../../../../src/api';

export default function AjustesView({ sucursal, onNotificar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [sucursales, setSucursales] = useState([]);
  const [modalUsuario, setModalUsuario] = useState(false);

  // Nuevo usuario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('vendedor');
  const [sucursalId, setSucursalId] = useState(1);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('jerusalen2026');

  const cargar = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        apiFetch('/api/erp/usuarios'),
        apiFetch('/api/erp/sucursales'),
      ]);
      setUsuarios(uRes.usuarios || []);
      setEmpresa(uRes.empresa || {});
      setSucursales(sRes.sucursales || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const guardarUsuario = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/erp/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          email,
          rol,
          sucursal_id: sucursalId ? Number(sucursalId) : null,
          pin: pin || null,
          password,
        }),
      });
      onNotificar?.(`Usuario ${nombre} creado/actualizado.`);
      setModalUsuario(false);
      setNombre('');
      setEmail('');
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const reiniciarDemo = async () => {
    try {
      const res = await apiFetch('/api/erp/reset-demo', { method: 'POST' });
      onNotificar?.(res.message || 'Demo reiniciada.');
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Administración del Sistema · Roles, Accesos y Configuración de Empresa</p>
          <h1>Usuarios y Ajustes</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn peligro" onClick={reiniciarDemo}>
            <RotateCcw size={15} /> Reiniciar Datos Demo
          </button>
          <button type="button" className="btn primario" onClick={() => setModalUsuario(true)}>
            <UserPlus size={15} /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="mj-dos">
        <section className="mj-bloque">
          <header>
            <h2><Shield size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Usuarios y Roles del Sistema</h2>
            <span className="suave">{usuarios.length} cuentas activas</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Sucursal</th>
                  <th>PIN (adminj)</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td className="mono">{u.email}</td>
                    <td><span className="etiqueta tono-ambar">{u.rol_nombre} ({u.rol})</span></td>
                    <td>{u.sucursal_nombre || 'Todas las sedes'}</td>
                    <td className="mono">{u.pin || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mj-bloque">
          <header>
            <h2><Settings size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Datos Oficiales de la Empresa</h2>
            <span className="suave">Santa Cruz de la Sierra, Bolivia</span>
          </header>
          <div className="formulario">
            <div className="campo">
              <span>Razón Social</span>
              <strong>{empresa.nombre || 'Jerusalén S.R.L.'}</strong>
            </div>
            <div className="campo">
              <span>NIT</span>
              <strong className="mono">{empresa.nit || '389421029'}</strong>
            </div>
            <div className="campo">
              <span>Dueño Fundador (Panel adminj)</span>
              <strong>{empresa.dueno || 'Don Emiliano Acero'} (PIN: 1954)</strong>
            </div>
            <div className="campo">
              <span>Administrador General (Panel erpj)</span>
              <strong>{empresa.administrador || 'Nain Torrico'}</strong>
            </div>
            <div className="campo">
              <span>Moneda Oficial</span>
              <strong>Bolivianos ({empresa.moneda || 'Bs'})</strong>
            </div>
            <div className="campo">
              <span>Teléfono / WhatsApp Comercial</span>
              <strong className="mono">{empresa.telefono_principal || '+591 70314442'}</strong>
            </div>
          </div>
        </section>
      </div>

      {modalUsuario && (
        <div className="capa" onClick={() => setModalUsuario(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Crear Usuario con Rol y Sucursal</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalUsuario(false)}>Cerrar</button>
            </header>
            <form onSubmit={guardarUsuario}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo">
                    <span>Nombre Completo *</span>
                    <input required value={nombre} onChange={e => setNombre(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Correo Electrónico *</span>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Rol en Jerusalén S.R.L.</span>
                    <select value={rol} onChange={e => setRol(e.target.value)}>
                      <option value="administrador">Administrador (Nain: Todo)</option>
                      <option value="dueno">Dueño (Solo adminj)</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="cortador">Cortador / Arquitecto</option>
                      <option value="contador">Contador</option>
                      <option value="rrhh">Recursos Humanos (RRHH)</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Sucursal / Fábrica Asignada</span>
                    <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
                      <option value="">Todas las sucursales</option>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Contraseña</span>
                    <input value={password} onChange={e => setPassword(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>PIN de 4-6 dígitos (Opcional, para adminj)</span>
                    <input maxLength={6} value={pin} onChange={e => setPin(e.target.value)} placeholder="Ej. 1954" />
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalUsuario(false)}>Cancelar</button>
                <button type="submit" className="btn primario">Guardar Usuario</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
