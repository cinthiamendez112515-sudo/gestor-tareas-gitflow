'use strict';

const http = require('node:http');
const storage = require('./storage');

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
    return sendJson(res, 201, storage.create(body));
  }

  // UPDATE
  if (req.method === 'PUT' && id) {
    const body = await readBody(req);
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

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      await handleApi(req, res, pathname);
    } catch (err) {
      const status = err.status || 500;
      sendJson(res, status, {
        error: err.status ? err.message : 'Error interno del servidor',
      });
    }
  });
}

module.exports = { createServer, sendJson, readBody };
