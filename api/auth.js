'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const COOKIE = 'jsid';

function crearSesion(usuario_id) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sesiones (token, usuario_id) VALUES (?, ?)').run(token, usuario_id);
  return token;
}

function usuarioDeToken(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sesiones WHERE token = ?').get(token);
  if (!s) return null;
  const u = db.prepare(`
    SELECT u.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
    FROM usuarios u
    LEFT JOIN sucursales s ON s.id = u.sucursal_id
    WHERE u.id = ? AND u.activo = 1
  `).get(s.usuario_id);
  return u || null;
}

function salida(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    telefono: u.telefono || '',
    rol: u.rol,
    rolNombre: u.rol_nombre,
    sucursal_id: u.sucursal_id,
    sucursalNombre: u.sucursal_nombre || 'Todas las Sucursales',
    sucursalCodigo: u.sucursal_codigo || 'SCZ',
    activo: !!u.activo,
    permisos: JSON.parse(u.permisos || '["*"]'),
  };
}

function cargarUsuario(req, _res, next) {
  const token = (req.cookies && req.cookies[COOKIE]) || req.headers['x-session-token'];
  req.usuario = usuarioDeToken(token);
  next();
}

function exigirAuth(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ ok: false, error: 'Inicia sesión para continuar.', code: 'auth-required' });
  }
  next();
}

function exigirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'Autenticación requerida.' });
    }
    if (req.usuario.rol === 'administrador' || rolesPermitidos.includes(req.usuario.rol)) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      error: `Tu rol (${req.usuario.rol_nombre}) no tiene permiso para esta operación.`,
      code: 'forbidden',
    });
  };
}

function montarAuth(app) {
  // Login estándar por correo + contraseña (erpj)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const u = db.prepare(`
      SELECT u.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      WHERE lower(u.email) = lower(?)
    `).get((email || '').trim());

    if (!u || !u.password_hash || !bcrypt.compareSync(password || '', u.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.', code: 'bad-credentials' });
    }
    if (!u.activo) {
      return res.status(403).json({ ok: false, error: 'Usuario inactivo.', code: 'inactive' });
    }
    const token = crearSesion(u.id);
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.json({ ok: true, user: salida(u), token });
  });

  // Login por PIN de 4-6 dígitos para Don Emiliano (adminj)
  app.post('/api/auth/pin', (req, res) => {
    const { pin } = req.body || {};
    const cleanPin = String(pin || '').trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
      return res.status(400).json({ ok: false, error: 'Ingresa un PIN válido de 4 a 6 dígitos.' });
    }
    const u = db.prepare(`
      SELECT u.*, s.nombre AS sucursal_nombre, s.codigo AS sucursal_codigo
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      WHERE u.pin = ? AND u.activo = 1
    `).get(cleanPin);

    if (!u) {
      return res.status(401).json({ ok: false, error: 'PIN incorrecto. Verifica con Nain Torrico.', code: 'bad-pin' });
    }
    const token = crearSesion(u.id);
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.json({ ok: true, user: salida(u), token });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'No autenticado.', code: 'auth-required' });
    }
    res.json({ ok: true, user: salida(req.usuario) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies && req.cookies[COOKIE];
    if (token) db.prepare('DELETE FROM sesiones WHERE token = ?').run(token);
    res.clearCookie(COOKIE);
    res.json({ ok: true });
  });

  // Lista rápida de perfiles demo para facilitar pruebas en la demo
  app.get('/api/auth/demo-users', (_req, res) => {
    const users = db.prepare(`
      SELECT u.email, u.nombre, u.rol, u.rol_nombre, s.nombre AS sucursal_nombre
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      WHERE u.activo = 1
      ORDER BY CASE u.rol
        WHEN 'administrador' THEN 1
        WHEN 'dueno' THEN 2
        WHEN 'vendedor' THEN 3
        WHEN 'cortador' THEN 4
        WHEN 'contador' THEN 5
        WHEN 'rrhh' THEN 6
        ELSE 7 END
    `).all();
    res.json({ ok: true, users });
  });
}

module.exports = { montarAuth, cargarUsuario, exigirAuth, exigirRol, salida, COOKIE };
