// Pantalla de ingreso con correo y contraseña.
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Campo } from '../componentes.jsx'

const DEMO = [
  ['nain@jerusalen.demo', 'Administrador'],
  ['carla@jerusalen.demo', 'Vendedora'],
  ['marcelo@jerusalen.demo', 'Cortador'],
  ['patricia@jerusalen.demo', 'Contadora'],
  ['fernanda@jerusalen.demo', 'RRHH'],
]

export default function Ingresar({ alIngresar }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [rolesDemo, setRolesDemo] = useState([])
  useEffect(() => {
    // Solo existe si el servidor tiene DEMO_SIN_LOGIN=1; si no, 404 y no se muestra nada.
    api.get('/demo/roles').then((r) => setRolesDemo((r?.roles ?? []).filter((x) => x.rol !== 'dueno'))).catch(() => setRolesDemo([]))
  }, [])
  const entrarDemo = async (rol) => {
    setOcupado(true)
    setError('')
    try {
      const r = await api.post('/demo/entrar', { rol })
      location.hash = '#/'
      alIngresar(r.usuario)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }
  const enviar = async (e) => {
    e.preventDefault()
    setOcupado(true)
    setError('')
    try {
      const r = await api.post('/auth/ingresar', { email: email.trim(), clave })
      alIngresar(r.usuario)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <main className="ingreso-erp">
      <form className="tarjeta pila" onSubmit={enviar}>
        <div>
          <span className="marca-logo" aria-hidden="true">J</span>
          <h1>JERUSALÉN</h1>
          <p className="suave">Ingresa al sistema de gestión del taller.</p>
        </div>
        <Campo etiqueta="Correo" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        {error ? <p className="aviso aviso-error" role="alert">{error}</p> : null}
        <button type="submit" className="boton boton-primario" disabled={ocupado}>{ocupado ? 'Ingresando…' : 'Ingresar'}</button>
        {rolesDemo.length ? (
          <section className="demo-sin-clave" aria-label="Entrar sin clave (demo)">
            <p className="demo-titulo">Entrar sin clave (demo)</p>
            {rolesDemo.map((x) => (
              <button key={x.rol} type="button" className="boton boton-demo" disabled={ocupado} onClick={() => entrarDemo(x.rol)}>
                {x.etiqueta}
              </button>
            ))}
          </section>
        ) : null}
        <p className="suave" style={{ fontSize: 13, margin: 0 }}>Don Emiliano entra con su PIN en el <a href="/dueno/">panel del dueño</a>.</p>
        <details className="usuarios-demo">
          <summary>Usuarios de la demo</summary>
          <p>Pide la clave de la demo a CERICE 360.</p>
          <ul>
            {DEMO.map(([c, r]) => (
              <li key={c}><button type="button" onClick={() => setEmail(c)}>{c}</button> — {r}</li>
            ))}
          </ul>
        </details>
      </form>
    </main>
  )
}
