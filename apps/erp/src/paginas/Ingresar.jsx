// Pantalla de ingreso con correo y contraseña.
import { useState } from 'react'
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
        <p className="suave" style={{ fontSize: 13, margin: 0 }}>Don Emiliano entra con su PIN en el <a href="/dueno/">panel del dueño</a>.</p>
        <details className="usuarios-demo">
          <summary>Usuarios de la demo</summary>
          <p>Clave de todos: <code>jerusalen2026</code></p>
          <ul>
            {DEMO.map(([c, r]) => (
              <li key={c}><button type="button" onClick={() => { setEmail(c); setClave('jerusalen2026') }}>{c}</button> — {r}</li>
            ))}
          </ul>
        </details>
      </form>
    </main>
  )
}
