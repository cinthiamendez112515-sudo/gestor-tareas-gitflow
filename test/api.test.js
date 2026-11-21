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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-'));
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

function post(body) {
  return fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function put(id, body) {
  return fetch(`${base}/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('GET /api/tasks devuelve una lista', async () => {
  const res = await fetch(`${base}/api/tasks`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});

test('POST /api/tasks crea una tarea (201)', async () => {
  const res = await post({ title: 'Primera tarea', description: 'detalle' });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.title, 'Primera tarea');
  assert.equal(task.done, false);
});

test('GET /api/tasks/:id devuelve la tarea creada', async () => {
  const created = await (await post({ title: 'Buscar por id' })).json();
  const res = await fetch(`${base}/api/tasks/${created.id}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).title, 'Buscar por id');
});

test('GET /api/tasks/:id devuelve 404 si no existe', async () => {
  const res = await fetch(`${base}/api/tasks/no-existe`);
  assert.equal(res.status, 404);
});

test('una ruta desconocida devuelve 404', async () => {
  const res = await fetch(`${base}/api/otra-cosa`);
  assert.equal(res.status, 404);
});

test('PUT /api/tasks/:id actualiza la tarea', async () => {
  const created = await (await post({ title: 'Para editar' })).json();
  const res = await put(created.id, { title: 'Editada', done: true });
  assert.equal(res.status, 200);
  const task = await res.json();
  assert.equal(task.title, 'Editada');
  assert.equal(task.done, true);
});

test('PUT /api/tasks/:id devuelve 404 si no existe', async () => {
  const res = await put('no-existe', { title: 'x' });
  assert.equal(res.status, 404);
});

test('DELETE /api/tasks/:id elimina la tarea (204) y luego da 404', async () => {
  const created = await (await post({ title: 'Para borrar' })).json();
  const res = await fetch(`${base}/api/tasks/${created.id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  const again = await fetch(`${base}/api/tasks/${created.id}`);
  assert.equal(again.status, 404);
});

test('DELETE /api/tasks/:id devuelve 404 si no existe', async () => {
  const res = await fetch(`${base}/api/tasks/no-existe`, { method: 'DELETE' });
  assert.equal(res.status, 404);
});
