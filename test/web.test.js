'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET / sirve la página principal', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /Gestor de Tareas/);
});

test('GET /app.js y /styles.css se sirven con su tipo correcto', async () => {
  const js = await fetch(`${base}/app.js`);
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /javascript/);

  const css = await fetch(`${base}/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
});

test('un archivo inexistente devuelve 404', async () => {
  const res = await fetch(`${base}/no-existe.txt`);
  assert.equal(res.status, 404);
});
