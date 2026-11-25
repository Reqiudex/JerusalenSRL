// Punto de entrada: abre la base, la llena (demo o inicio limpio) si está vacía y escucha.
import { abrirBD, guardarAjuste } from './db.js'
import { config, hoy } from './config.js'
import { crearApp } from './app.js'
import { sembrar } from './semilla.js'
import { hashClave } from './auth.js'
import { AJUSTES_POR_DEFECTO } from './rutas/base.js'

const db = abrirBD()
if (db.prepare('SELECT COUNT(*) n FROM usuarios').get().n === 0) {
  if (process.env.SEMBRAR_DEMO === '0') {
    // Inicio limpio para datos reales: una sucursal y el administrador indicado en el entorno
    const email = process.env.ADMIN_EMAIL
    const clave = process.env.ADMIN_CLAVE
    if (!email || !clave || clave.length < 8) {
      console.error('Base vacía con SEMBRAR_DEMO=0: define ADMIN_EMAIL y ADMIN_CLAVE (mínimo 8 caracteres) para crear el administrador.')
      process.exit(1)
    }
    db.transaction(() => {
      db.prepare("INSERT INTO sucursales (nombre, tipo) VALUES ('Casa Matriz', 'mixta')").run()
      db.prepare("INSERT INTO usuarios (nombre, email, rol, sucursal_id, password_hash) VALUES (?, ?, 'administrador', 1, ?)").run(process.env.ADMIN_NOMBRE || 'Administrador', email, hashClave(clave))
      for (const [k, v] of Object.entries(AJUSTES_POR_DEFECTO)) guardarAjuste(db, k, v)
    })()
    console.log(`Base nueva creada sin demo. Ingresa con ${email}.`)
  } else {
    console.log('Base vacía: cargando datos de demostración…')
    sembrar(db)
  }
}
const app = crearApp(db)
app.listen(config.puerto, () => {
  console.log(`ERP Jerusalén escuchando en http://localhost:${config.puerto} (hoy = ${hoy()})`)
  console.log('  ERP: /   ·   Panel del dueño: /dueno/   ·   API: /api/salud')
})

const cerrar = () => {
  db.close()
  process.exit(0)
}
process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)
