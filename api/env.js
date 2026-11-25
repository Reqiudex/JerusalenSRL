'use strict';
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
try {
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;
      const idx = l.indexOf('=');
      if (idx === -1) continue;
      const k = l.slice(0, idx).trim();
      const v = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
} catch (_) {
  /* ignore */
}
