// test/escenario.test.js
// Escenario 1: Reintento de transferencia sin duplicar débito (Idempotencia)
//
// Medida definida en: Wiki › Segundo previo › 2. Medida verificable
// 200 intentos concurrentes con la misma clave de idempotencia deben
// producir exactamente 1 débito de 30.000 COP.
//
// DEBE FALLAR con: FALLA_LEDGER=true  (antes de la táctica de P5)
// DEBE PASAR con:  FALLA_LEDGER=false (después de la táctica de P5)
//
// Autor: P4

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const { transferir } = require('../src/adaptadorLedger');

// ── Parámetros del escenario ──────────────────────────────────────────────────
// Fuente: Wiki › Segundo previo › 2. Medida verificable
const CUENTA_ORIGEN  = 'usuario-001';
const CUENTA_DESTINO = 'comercio-001';
const SALDO_INICIAL  = 100_000; // COP — definido por el grupo como supuesto de prueba
const MONTO          = 30_000;  // COP — mayoría de pagos < 50.000 (Caso 2, sección 1)
const INTENTOS       = 200;     // intentos concurrentes (Guía previo, sección 4)
const CLAVE          = 'tx-idempotente-001'; // misma clave en todos los intentos

// Resultados esperados (exactamente una transferencia)
const SALDO_ORIGEN_ESPERADO  = SALDO_INICIAL - MONTO; // 70.000
const SALDO_DESTINO_ESPERADO = MONTO;                  // 30.000
const ASIENTOS_ESPERADOS     = 2;                      // 1 débito + 1 crédito
// ─────────────────────────────────────────────────────────────────────────────

describe('Escenario 1 — Reintento de transferencia (Idempotencia)', () => {

  before(() => {
    // Estado inicial limpio antes de la prueba
    ledger.resetear();
    ledger.inicializarCuenta(CUENTA_ORIGEN,  SALDO_INICIAL);
    ledger.inicializarCuenta(CUENTA_DESTINO, 0);
  });

  it(
    `${INTENTOS} intentos concurrentes con la misma clave deben producir ` +
    `exactamente 1 débito de ${MONTO.toLocaleString()} COP`,
    async () => {
      // Lanzar los 200 intentos al mismo tiempo.
      // Cada uno usa la misma claveIdempotencia (simula cliente que reintenta).
      // .catch(e => e) evita que un error de un intento detenga los demás.
      const intentos = Array.from({ length: INTENTOS }, () =>
        transferir(CLAVE, CUENTA_ORIGEN, CUENTA_DESTINO, MONTO).catch(e => e)
      );

      await Promise.all(intentos);

      // ── Verificar los 5 criterios de la medida ──────────────────────────
      const saldoOrigen  = ledger.obtenerSaldo(CUENTA_ORIGEN);
      const saldoDestino = ledger.obtenerSaldo(CUENTA_DESTINO);
      const asientos     = ledger.contarMovimientosPorClave(CLAVE);

      // Criterio 1 y 2: saldos finales correctos (exactamente 1 débito)
      assert.strictEqual(
        saldoOrigen,
        SALDO_ORIGEN_ESPERADO,
        `❌ Criterio 1/2: saldo origen esperado ${SALDO_ORIGEN_ESPERADO}, ` +
        `real ${saldoOrigen}. Se debitó ${(saldoOrigen - SALDO_INICIAL) * -1} COP ` +
        `(debería ser ${MONTO}).`
      );

      assert.strictEqual(
        saldoDestino,
        SALDO_DESTINO_ESPERADO,
        `❌ Criterio 2: saldo destino esperado ${SALDO_DESTINO_ESPERADO}, real ${saldoDestino}.`
      );

      // Criterio 4: saldo nunca negativo (verificación del estado final)
      assert.ok(
        saldoOrigen >= 0,
        `❌ Criterio 4: saldo origen negativo (${saldoOrigen}). Nunca debe quedar negativo.`
      );

      assert.strictEqual(
        saldoOrigen + saldoDestino,
        SALDO_INICIAL,
        `❌ Criterio 4: origen (${saldoOrigen}) + destino (${saldoDestino}) ` +
        `≠ ${SALDO_INICIAL}. El dinero total no se conserva.`
      );

      // Criterio 5: exactamente 2 asientos contables (doble entrada)
      assert.strictEqual(
        asientos,
        ASIENTOS_ESPERADOS,
        `❌ Criterio 5: se esperaban ${ASIENTOS_ESPERADOS} asientos (1 débito + 1 crédito), ` +
        `se encontraron ${asientos}. Hay ${asientos / 2} transacciones registradas.`
      );
    }
  );
});
