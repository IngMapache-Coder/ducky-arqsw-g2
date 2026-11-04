// test/correr-sin.js
// Ejecuta la prueba del escenario desactivando la táctica de idempotencia
// Utilizado para verificar o demostrar el fallo en ROJO (condición de carrera)

'use strict';

process.env.SIN_IDEMPOTENCIA = 'true';
require('./escenario.test.js');
