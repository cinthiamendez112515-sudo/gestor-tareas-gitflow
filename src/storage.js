'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// La ruta del archivo se lee en cada llamada para poder cambiarla en las pruebas.
function filePath() {
  return process.env.TASKS_FILE || path.join(__dirname, '..', 'data', 'tasks.json');
}

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(filePath(), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeAll(tasks) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(tasks, null, 2));
}

function list() {
  return readAll();
}

function getById(id) {
  return readAll().find((task) => task.id === id) || null;
}

function create({ title, description = '' }) {
  const tasks = readAll();
  const task = {
    id: randomUUID(),
    title,
    description,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  writeAll(tasks);
  return task;
}

function update(id, changes) {
  const tasks = readAll();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  for (const field of ['title', 'description', 'done']) {
    if (field in changes) tasks[index][field] = changes[field];
  }
  writeAll(tasks);
  return tasks[index];
}

function remove(id) {
  const tasks = readAll();
  const remaining = tasks.filter((task) => task.id !== id);
  if (remaining.length === tasks.length) return false;
  writeAll(remaining);
  return true;
}

module.exports = { list, getById, create, update, remove };
