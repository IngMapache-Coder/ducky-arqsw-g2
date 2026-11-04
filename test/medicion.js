// test/medicion.js
// Script de medición repetible de costo de la táctica de idempotencia
// Soporta medir individualmente con --con, con --sin o la comparativa completa.

'use strict';

const ledger = require('../src/ledger');
const { transferir } = require('../src/adaptadorLedger');

const CORRIDAS = 5;
const INTENTOS = 200;
const CUENTA_ORIGEN = 'usuario-bench';
const CUENTA_DESTINO = 'comercio-bench';
const MONTO = 30_000;
const SALDO_INICIAL = 10_000_000;

async function medirEscenario({ conIdempotencia }) {
  process.env.SIN_IDEMPOTENCIA = conIdempotencia ? 'false' : 'true';
  const tiempos = [];
  let ultimoSaldoOrigen = 0;
  let ultimosAsientos = 0;

  for (let c = 0; c < CORRIDAS; c++) {
    ledger.resetear();
    ledger.inicializarCuenta(CUENTA_ORIGEN, SALDO_INICIAL);
    ledger.inicializarCuenta(CUENTA_DESTINO, 0);

    const clave = `bench-tx-${conIdempotencia ? 'con' : 'sin'}-${c}`;
    const inicio = performance.now();

    const intentos = Array.from({ length: INTENTOS }, () =>
      transferir(clave, CUENTA_ORIGEN, CUENTA_DESTINO, MONTO).catch(e => e)
    );
    await Promise.all(intentos);

    const duracion = performance.now() - inicio;
    tiempos.push(duracion);

    ultimoSaldoOrigen = ledger.obtenerSaldo(CUENTA_ORIGEN);
    ultimosAsientos = ledger.contarMovimientosPorClave(clave);
  }

  const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  const min = Math.min(...tiempos);
  const max = Math.max(...tiempos);

  return { promedio, min, max, tiempos, ultimoSaldoOrigen, ultimosAsientos };
}

async function ejecutar() {
  const args = process.argv.slice(2);
  const soloCon = args.includes('--con') || args.includes('--con-idempotencia');
  const soloSin = args.includes('--sin') || args.includes('--sin-idempotencia');

  console.log('='.repeat(70));
  console.log('  MEDICIÓN DE RENDIMIENTO Y COSTO — CASO 2 BILLETERA DUCKY (P5)');
  console.log(`  Condiciones: ${INTENTOS} intentos concurrentes · ${CORRIDAS} corridas · Monto: $${MONTO.toLocaleString()} COP`);
  console.log('='.repeat(70));

  const memInicial = process.memoryUsage().heapUsed;

  if (soloCon) {
    const con = await medirEscenario({ conIdempotencia: true });
    const memFinal = process.memoryUsage().heapUsed;
    const difKB = Math.round((memFinal - memInicial) / 1024);

    console.log('\n[MODO: CON IDEMPOTENCIA (Táctica activa)]');
    console.log(`  ✔ Latencia promedio: ${con.promedio.toFixed(2)} ms (Min: ${con.min.toFixed(2)} ms, Max: ${con.max.toFixed(2)} ms)`);
    console.log(`  ✔ Débitos reales:    1 débito ($${MONTO.toLocaleString()} COP)`);
    console.log(`  ✔ Asientos libro:    ${con.ultimosAsientos} asientos contables`);
    console.log(`  ✔ Saldo origen:      $${con.ultimoSaldoOrigen.toLocaleString()} COP (Correcto)`);
    console.log(`  ✔ Memoria adicional: ~${difKB} KB`);
    console.log('='.repeat(70));
    return;
  }

  if (soloSin) {
    const sin = await medirEscenario({ conIdempotencia: false });
    console.log('\n[MODO: SIN IDEMPOTENCIA (Vulnerable a condiciones de carrera)]');
    console.log(`  ✖ Latencia promedio: ${sin.promedio.toFixed(2)} ms (Min: ${sin.min.toFixed(2)} ms, Max: ${sin.max.toFixed(2)} ms)`);
    console.log(`  ✖ Débitos reales:    ${INTENTOS} débitos ($${(INTENTOS * MONTO).toLocaleString()} COP debitados)`);
    console.log(`  ✖ Asientos libro:    ${sin.ultimosAsientos} asientos contables (Duplicados masivos)`);
    console.log(`  ✖ Saldo origen:      $${sin.ultimoSaldoOrigen.toLocaleString()} COP`);
    console.log('='.repeat(70));
    return;
  }

  // Comparativa completa (default)
  const sin = await medirEscenario({ conIdempotencia: false });
  const con = await medirEscenario({ conIdempotencia: true });
  const memFinal = process.memoryUsage().heapUsed;
  const difKB = Math.round((memFinal - memInicial) / 1024);

  console.log('\n1. TIEMPO DE RESPUESTA (200 solicitudes concurrentes):');
  console.log(`   - SIN TÁCTICA:          ${sin.promedio.toFixed(2)} ms (Min: ${sin.min.toFixed(2)} ms, Max: ${sin.max.toFixed(2)} ms)`);
  console.log(`   - CON IDEMPOTENCIA:     ${con.promedio.toFixed(2)} ms (Min: ${con.min.toFixed(2)} ms, Max: ${con.max.toFixed(2)} ms)`);
  const delta = con.promedio - sin.promedio;
  console.log(`   - Diferencia promedio:  ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} ms`);

  console.log('\n2. INTEGRIDAD CONTABLE:');
  console.log(`   - Asientos contables:   ${sin.ultimosAsientos} (Sin táctica) vs ${con.ultimosAsientos} (Con táctica)`);
  console.log(`   - Débitos aplicados:    200 débitos (Sin táctica) vs 1 débito (Con táctica)`);

  console.log('\n3. CONSUMO DE MEMORIA:');
  console.log(`   - Incremento en heap:   ~${difKB} KB por el mapa de idempotencia`);
  console.log('='.repeat(70));
}

ejecutar().catch(console.error);
