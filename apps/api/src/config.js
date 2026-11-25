// Configuración leída de variables de entorno (y de un archivo .env si existe).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
export const RAIZ_API = path.resolve(aqui, '..')
export const RAIZ_REPO = path.resolve(RAIZ_API, '..', '..')

// Carga simple de .env (sin dependencias): CLAVE=valor, ignora comentarios.
for (const archivo of [path.join(RAIZ_REPO, '.env'), path.join(RAIZ_API, '.env')]) {
  if (!fs.existsSync(archivo)) continue
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const e = process.env
export const config = {
  puerto: Number(e.PORT || 3100),
  dirDatos: e.DATA_DIR || path.join(RAIZ_REPO, 'datos'),
  rutaBD: e.DB_PATH || '',
  // Fecha "de hoy" fija para la demo (los datos demo terminan el 25-11-2026). Vacío = fecha real.
  fechaHoy: e.FECHA_HOY || '',
  cookieSegura: e.COOKIE_SEGURA === '1',
  claveDemo: e.CLAVE_DEMO || 'jerusalen2026',
  pinDemo: e.PIN_DEMO || '2580',
  // DEMO_SIN_LOGIN=1 habilita /api/demo/* (botones «Entrar sin clave»). Apagar en producción real.
  demoSinLogin: e.DEMO_SIN_LOGIN === '1',
  servirEstaticos: e.SERVIR_ESTATICOS !== '0',
  diasSesion: Number(e.DIAS_SESION || 14),
}

/** Fecha de hoy en Bolivia (UTC−4) como 'AAAA-MM-DD'. */
export function hoy() {
  if (config.fechaHoy) return config.fechaHoy
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10)
}
