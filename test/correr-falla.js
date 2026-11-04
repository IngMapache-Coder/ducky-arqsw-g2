// test/correr-falla.js
// Ejecuta la prueba simulando la falla de red / respuesta perdida en tránsito (P4)
// Verifica que con la táctica aplicada la prueba siga pasando aunque haya reintentos por timeout.

'use strict';

process.env.FALLA_LEDGER = 'true';
require('./escenario.test.js');
