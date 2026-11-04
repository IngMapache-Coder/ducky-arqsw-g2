// src/ledger.js
// ms-ledger: libro contable en memoria
// SIN idempotencia — versión con el bug intencional (antes de la táctica de P5)
// Autor: P3

'use strict';

const cuentas    = new Map(); // cuentaId → saldo en COP
const movimientos = [];       // historial de asientos contables

/**
 * Inicializa una cuenta con un saldo dado.
 * @param {string} id           Identificador de la cuenta
 * @param {number} saldoInicial Saldo inicial en COP
 */
function inicializarCuenta(id, saldoInicial) {
  cuentas.set(id, saldoInicial);
}

/**
 * Registra una transferencia: débito al origen y crédito al destino.
 *
 * BUG INTENCIONAL: no verifica si la clave ya fue procesada.
 * Si se llama dos veces con la misma claveIdempotencia, debita dos veces.
 * P5 corregirá esto aplicando la táctica de idempotencia.
 *
 * @param {string} claveIdempotencia Identificador único de la operación
 * @param {string} origenId          Cuenta que envía el dinero
 * @param {string} destinoId         Cuenta que recibe el dinero
 * @param {number} monto             Monto en COP
 * @returns {{ transaccionId: string, estado: string }}
 */
async function registrarTransferencia(claveIdempotencia, origenId, destinoId, monto) {
  const saldoOrigen = cuentas.get(origenId) ?? 0;

  if (saldoOrigen < monto) {
    throw new Error(`Saldo insuficiente en cuenta ${origenId}: tiene ${saldoOrigen}, necesita ${monto}`);
  }

  // Simula latencia de escritura en base de datos (~5 ms)
  await new Promise(r => setTimeout(r, 5));

  // Débito en cuenta origen
  cuentas.set(origenId, cuentas.get(origenId) - monto);

  // Crédito en cuenta destino
  cuentas.set(destinoId, (cuentas.get(destinoId) ?? 0) + monto);

  // Registrar los dos asientos contables (doble entrada)
  movimientos.push({ tipo: 'debito',  clave: claveIdempotencia, cuenta: origenId,  monto });
  movimientos.push({ tipo: 'credito', clave: claveIdempotencia, cuenta: destinoId, monto });

  return { transaccionId: claveIdempotencia, estado: 'confirmada' };
}

/**
 * Devuelve el saldo actual de una cuenta.
 * @param {string} cuentaId
 * @returns {number}
 */
function obtenerSaldo(cuentaId) {
  return cuentas.get(cuentaId) ?? 0;
}

/**
 * Cuenta cuántos asientos contables existen para una clave dada.
 * El valor esperado tras una transferencia correcta es 2 (1 débito + 1 crédito).
 * @param {string} clave
 * @returns {number}
 */
function contarMovimientosPorClave(clave) {
  return movimientos.filter(m => m.clave === clave).length;
}

/**
 * Reinicia el estado del ledger. Usado en las pruebas.
 */
function resetear() {
  cuentas.clear();
  movimientos.length = 0;
}

module.exports = {
  inicializarCuenta,
  registrarTransferencia,
  obtenerSaldo,
  contarMovimientosPorClave,
  resetear
};
