'use strict';

const { createServer } = require('./server');

const PORT = process.env.PORT || 3000;

createServer().listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
