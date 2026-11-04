// src/ledger.js
// ms-ledger: libro contable en memoria
// Táctica aplicada: Almacén de idempotencia con clave única y registro «en proceso» (P5)
// Autores: P3 (código base) · P5: Daniel Lozano (táctica correctiva de idempotencia)

'use strict';

const cuentas     = new Map(); // cuentaId → saldo en COP
const movimientos = [];       // historial de asientos contables
const operaciones = new Map(); // claveIdempotencia → { estado, promesa, resultado, error, timestamp }

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
 * TÁCTICA DE IDEMPOTENCIA (P5):
 * 1. Clave única de idempotencia: si la operación ya se completó, devuelve
 *    inmediatamente el resultado almacenado sin volver a debitar.
 * 2. Control de concurrencia («en proceso»): si llegan intentos concurrentes con
 *    la misma clave mientras el primero se procesa, esperan la misma promesa en
 *    vuelo, evitando condiciones de carrera y doble débito.
 * 3. Si se define SIN_IDEMPOTENCIA=true, simula el comportamiento vulnerable original (P3/P4).
 *
 * @param {string} claveIdempotencia Identificador único de la operación
 * @param {string} origenId          Cuenta que envía el dinero
 * @param {string} destinoId         Cuenta que recibe el dinero
 * @param {number} monto             Monto en COP
 * @returns {Promise<{ transaccionId: string, estado: string }>}
 */
async function registrarTransferencia(claveIdempotencia, origenId, destinoId, monto) {
  // Opcional: bypass para demostración o benchmarks comparativos antes/después
  const bypassTactica = process.env.SIN_IDEMPOTENCIA === 'true';

  if (!bypassTactica) {
    const operacionExistente = operaciones.get(claveIdempotencia);

    if (operacionExistente) {
      // Caso 1: La operación ya fue procesada exitosamente con anterioridad
      if (operacionExistente.estado === 'COMPLETADA') {
        return operacionExistente.resultado;
      }

      // Caso 2: La operación previa falló
      if (operacionExistente.estado === 'FALLIDA') {
        throw operacionExistente.error;
      }

      // Caso 3: Operación en curso («en proceso») por otro intento concurrente.
      // Esperamos la resolución de la promesa en vuelo para evitar condición de carrera.
      if (operacionExistente.estado === 'EN_PROCESO') {
        return await operacionExistente.promesa;
      }
    }
  }

  // Registrar estado «en proceso» atómicamente antes de cualquier await
  let resolver, rechazar;
  const promesa = new Promise((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });

  const nuevoRegistro = {
    estado: 'EN_PROCESO',
    promesa,
    resultado: null,
    error: null,
    timestamp: Date.now()
  };

  if (!bypassTactica) {
    operaciones.set(claveIdempotencia, nuevoRegistro);
  }

  try {
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

    const resultado = { transaccionId: claveIdempotencia, estado: 'confirmada' };

    if (!bypassTactica) {
      nuevoRegistro.estado = 'COMPLETADA';
      nuevoRegistro.resultado = resultado;
      resolver(resultado);
    }

    return resultado;
  } catch (err) {
    if (!bypassTactica) {
      nuevoRegistro.estado = 'FALLIDA';
      nuevoRegistro.error = err;
      rechazar(err);
    }
    throw err;
  }
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
 * Devuelve el estado de una operación de idempotencia.
 * @param {string} clave
 * @returns {string|null}
 */
function obtenerEstadoOperacion(clave) {
  return operaciones.get(clave)?.estado ?? null;
}

/**
 * Reinicia el estado del ledger. Usado en las pruebas.
 */
function resetear() {
  cuentas.clear();
  movimientos.length = 0;
  operaciones.clear();
}

module.exports = {
  inicializarCuenta,
  registrarTransferencia,
  obtenerSaldo,
  contarMovimientosPorClave,
  obtenerEstadoOperacion,
  resetear
};
