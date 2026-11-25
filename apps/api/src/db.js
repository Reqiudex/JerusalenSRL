// Conexión SQLite (better-sqlite3, modo WAL) y creación del esquema.
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { RAIZ_API, config } from './config.js'

export function abrirBD(ruta) {
  const destino = ruta ?? (config.rutaBD || path.join(config.dirDatos, 'jerusalen-erp.sqlite'))
  if (destino !== ':memory:') fs.mkdirSync(path.dirname(destino), { recursive: true })
  const db = new Database(destino)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.exec(fs.readFileSync(path.join(RAIZ_API, 'src', 'esquema.sql'), 'utf8'))
  return db
}

/** Lee un ajuste JSON con valor por defecto. */
export function leerAjuste(db, clave, defecto = {}) {
  const fila = db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get(clave)
  if (!fila) return defecto
  try {
    return { ...defecto, ...JSON.parse(fila.valor) }
  } catch {
    return defecto
  }
}

export function guardarAjuste(db, clave, valor) {
  db.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor').run(clave, JSON.stringify(valor))
}
