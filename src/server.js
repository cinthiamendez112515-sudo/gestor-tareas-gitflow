'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./storage');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      if (tooBig) return;
      raw += chunk;
      if (raw.length > 1e6) {
        tooBig = true;
        reject(Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 }));
      }
    });
    req.on('end', () => {
      if (tooBig) return;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Devuelve un mensaje de error, o null si los datos son válidos.
// partial = true se usa en PUT: solo se validan los campos que vienen.
function validateTask(body, partial) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return 'El cuerpo debe ser un objeto JSON';
  }
  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return 'El título es obligatorio';
    }
    if (body.title.trim().length > 100) {
      return 'El título no puede superar los 100 caracteres';
    }
  }
  if ('description' in body && typeof body.description !== 'string') {
    return 'La descripción debe ser texto';
  }
  if ('done' in body && typeof body.done !== 'boolean') {
    return 'El campo done debe ser verdadero o falso';
  }
  return null;
}

async function handleApi(req, res, pathname) {
  const match = pathname.match(/^\/api\/tasks(?:\/([\w-]+))?$/);
  if (!match) return sendJson(res, 404, { error: 'Ruta no encontrada' });
  const id = match[1];

  // READ: lista completa
  if (req.method === 'GET' && !id) {
    return sendJson(res, 200, storage.list());
  }

  // READ: una tarea
  if (req.method === 'GET' && id) {
    const task = storage.getById(id);
    return task
      ? sendJson(res, 200, task)
      : sendJson(res, 404, { error: 'Tarea no encontrada' });
  }

  // CREATE
  if (req.method === 'POST' && !id) {
    const body = await readBody(req);
    const error = validateTask(body, false);
    if (error) return sendJson(res, 400, { error });
    return sendJson(
      res,
      201,
      storage.create({ title: body.title.trim(), description: body.description })
    );
  }

  // UPDATE
  if (req.method === 'PUT' && id) {
    const body = await readBody(req);
    const error = validateTask(body, true);
    if (error) return sendJson(res, 400, { error });
    if ('title' in body) body.title = body.title.trim();
    const task = storage.update(id, body);
    return task
      ? sendJson(res, 200, task)
      : sendJson(res, 404, { error: 'Tarea no encontrada' });
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    if (!storage.remove(id)) {
      return sendJson(res, 404, { error: 'Tarea no encontrada' });
    }
    res.writeHead(204);
    return res.end();
  }

  return sendJson(res, 405, { error: 'Método no permitido' });
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Método no permitido' });
  }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.join(PUBLIC_DIR, relative);

  // Evita salir de la carpeta public (path traversal)
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    return sendJson(res, 403, { error: 'Acceso denegado' });
  }

  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Archivo no encontrado' });
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream',
    });
    res.end(data);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname.startsWith('/api/')) {
        await handleApi(req, res, pathname);
      } else {
        serveStatic(req, res, pathname);
      }
    } catch (err) {
      const status = err.status || 500;
      sendJson(res, status, {
        error: err.status ? err.message : 'Error interno del servidor',
      });
    }
  });
}

module.exports = { createServer, sendJson, readBody };
