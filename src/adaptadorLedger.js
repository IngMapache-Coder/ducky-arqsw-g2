// src/adaptadorLedger.js
// Adaptador de ms-ledger que inyecta la falla de red:
// el ledger SÍ registra el movimiento, pero la respuesta
// al cliente se "pierde" (simula timeout de red).
// El cliente reintenta → sin idempotencia → doble débito.
//
// Se activa con: FALLA_LEDGER=true
// Autor: P4

'use strict';

const ledger = require('./ledger');

const FALLA_ACTIVA = process.env.FALLA_LEDGER === 'true';

/**
 * Llama al ledger para registrar la transferencia.
 *
 * Con FALLA_LEDGER=true:
 *   - El ledger confirma el movimiento (ya debitó y acreditó)
 *   - La respuesta nunca llega al cliente (timeout simulado)
 *   - El cliente reintenta con la misma clave → doble débito ❌
 *
 * Con FALLA_LEDGER=false (normal):
 *   - El ledger confirma y la respuesta llega correctamente ✅
 *
 * @param {string} claveIdempotencia Identificador único del intento
 * @param {string} origenId          Cuenta origen
 * @param {string} destinoId         Cuenta destino
 * @param {number} monto             Monto en COP
 */
async function transferir(claveIdempotencia, origenId, destinoId, monto) {
  // El ledger procesa la transferencia normalmente
  const resultado = await ledger.registrarTransferencia(
    claveIdempotencia,
    origenId,
    destinoId,
    monto
  );

  if (FALLA_ACTIVA) {
    // La respuesta "se pierde en tránsito": lanzamos error simulando
    // que la red cayó justo después de que el ledger confirmó.
    // El cliente verá un timeout y volverá a intentarlo.
    throw new Error('TIMEOUT: respuesta perdida en tránsito (falla inyectada por P4)');
  }

  return resultado;
}

module.exports = { transferir };
