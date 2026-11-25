// Cambia la contraseña (o el PIN) de un usuario desde la terminal:
//   npm run clave -w @jerusalen/api -- nain@jerusalen.demo NuevaClave123
//   npm run clave -w @jerusalen/api -- --pin emiliano@jerusalen.demo 4321
import { abrirBD } from './db.js'
import { hashClave } from './auth.js'

const args = process.argv.slice(2)
const esPin = args[0] === '--pin'
const [email, valor] = esPin ? args.slice(1) : args
if (!email || !valor) {
  console.log('Uso: node src/clave.js [--pin] correo valor')
  process.exit(1)
}
if (esPin ? !/^\d{4,6}$/.test(valor) : valor.length < 8) {
  console.log(esPin ? 'El PIN debe tener de 4 a 6 números.' : 'La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}
const db = abrirBD()
const info = db.prepare(`UPDATE usuarios SET ${esPin ? 'pin_hash' : 'password_hash'} = ? WHERE email = ?`).run(hashClave(valor), email)
db.prepare('DELETE FROM sesiones WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?)').run(email)
console.log(info.changes ? 'Listo.' : 'No existe ese usuario.')
