'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../src/server');

let server;
let base;
let dir;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-'));
  process.env.TASKS_FILE = path.join(dir, 'tasks.json');
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.TASKS_FILE;
});

function send(method, url, body) {
  return fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST sin título devuelve 400', async () => {
  const res = await send('POST', '/api/tasks', { description: 'sin título' });
  assert.equal(res.status, 400);
});

test('POST con título vacío o solo espacios devuelve 400', async () => {
  const res = await send('POST', '/api/tasks', { title: '   ' });
  assert.equal(res.status, 400);
});

test('POST con título de más de 100 caracteres devuelve 400', async () => {
  const res = await send('POST', '/api/tasks', { title: 'a'.repeat(101) });
  assert.equal(res.status, 400);
});

test('POST con título válido guarda el título sin espacios sobrantes', async () => {
  const res = await send('POST', '/api/tasks', { title: '  Tarea limpia  ' });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).title, 'Tarea limpia');
});

test('PUT con título vacío devuelve 400', async () => {
  const created = await (await send('POST', '/api/tasks', { title: 'Editable' })).json();
  const res = await send('PUT', `/api/tasks/${created.id}`, { title: '' });
  assert.equal(res.status, 400);
});

test('PUT con done que no es booleano devuelve 400', async () => {
  const created = await (await send('POST', '/api/tasks', { title: 'Estado' })).json();
  const res = await send('PUT', `/api/tasks/${created.id}`, { done: 'si' });
  assert.equal(res.status, 400);
});

test('PUT parcial (solo done) sigue funcionando', async () => {
  const created = await (await send('POST', '/api/tasks', { title: 'Parcial' })).json();
  const res = await send('PUT', `/api/tasks/${created.id}`, { done: true });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).done, true);
});
