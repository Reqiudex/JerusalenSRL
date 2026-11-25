'use strict';
require('./api/env');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const { db, initSchema } = require('./api/db');
const { montarAuth, cargarUsuario, exigirAuth } = require('./api/auth');
const erpRoutes = require('./api/routes/erp');
const seed = require('./api/seed');

initSchema();

// Auto-seed en el primer arranque si la base está vacía
if (db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c === 0) {
  console.log('Base de datos vacía: cargando seed realista boliviano (Santa Cruz, Bs)...');
  seed(true);
}

const app = express();

// Cabeceras de seguridad básicas
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());
app.use(cargarUsuario);

// Salud del sistema
app.get('/api/health', (_req, res) => {
  const usuarios = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c;
  const materiales = db.prepare('SELECT COUNT(*) AS c FROM materiales').get().c;
  res.json({ ok: true, status: 'healthy', usuarios, materiales });
});

// Rutas de autenticación (/api/auth/login, /api/auth/pin, /api/auth/me, /api/auth/logout)
montarAuth(app);

// Rutas del ERP y Panel del Dueño (/api/erp/*)
app.use('/api/erp', exigirAuth, erpRoutes);

// Servir frontend compilado (dist/) si existe
const DIST = path.join(__dirname, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta de API no encontrada.' });
});

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3030);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Jerusalén S.R.L. (erpj / adminj) activo en http://localhost:${PORT}`);
  });
}

module.exports = app;
