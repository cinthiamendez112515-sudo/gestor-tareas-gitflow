'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const storage = require('../src/storage');

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tareas-'));
  process.env.TASKS_FILE = path.join(dir, 'tasks.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.TASKS_FILE;
});

test('list devuelve un arreglo vacío si no hay archivo', () => {
  assert.deepEqual(storage.list(), []);
});

test('create guarda una tarea con id, done=false y fecha', () => {
  const task = storage.create({ title: 'Estudiar Git' });
  assert.equal(task.title, 'Estudiar Git');
  assert.equal(task.done, false);
  assert.ok(task.id);
  assert.ok(task.createdAt);
  assert.equal(storage.list().length, 1);
});

test('getById encuentra la tarea o devuelve null', () => {
  const task = storage.create({ title: 'Buscar' });
  assert.equal(storage.getById(task.id).title, 'Buscar');
  assert.equal(storage.getById('no-existe'), null);
});

test('update modifica solo los campos permitidos', () => {
  const task = storage.create({ title: 'Original' });
  const updated = storage.update(task.id, { title: 'Nuevo', done: true, id: 'hack' });
  assert.equal(updated.title, 'Nuevo');
  assert.equal(updated.done, true);
  assert.equal(updated.id, task.id);
  assert.equal(storage.update('no-existe', { title: 'x' }), null);
});

test('remove elimina la tarea y avisa si no existía', () => {
  const task = storage.create({ title: 'Borrar' });
  assert.equal(storage.remove(task.id), true);
  assert.equal(storage.list().length, 0);
  assert.equal(storage.remove(task.id), false);
});
