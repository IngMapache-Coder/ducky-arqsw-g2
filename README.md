# Ducky — Billetera digital de bajo monto

**Caso 2 · Arquitectura de Software · UFPS · 2026-II · Grupo 2**

**Ducky** es una billetera digital para pagos entre personas y comercios de barrio. Este repositorio guarda el código, la prueba y los ADR del segundo previo, esto último mencionado y el resto de la documentación del proyecto vive en la Wiki.

---
## ¿Qué se entrega en este previo?

Un recorte del sistema, no la billetera completa: el camino necesario para demostrar con una prueba automatizada un escenario de calidad. El código cubre ms-pagos → ms-ledger, escrito en JavaScript; el diseño completo de microservicios está documentado en la Wiki.

---
## Escenario elegido

**Escenario 1 — Reintento de transferencia** (atributo: integridad). Un usuario reenvía una transferencia tras un timeout, aunque la original sí se procesó; el sistema debe reconocerla por su clave de idempotencia y no volver a debitar.

**Por qué es el prioritario:** la integridad es el primer atributo del ADR-000 y el caso advierte que perder o duplicar una transacción es un problema legal. Se descartaron el escenario 2 (pago QR en hora pico, menos determinista y cuyo efecto se mide como costo de la táctica) y el 3 (falla de un componente secundario, con la medida de recuperación sin definir). Comparación completa: Wiki · Segundo previo · 1. Comparación de escenarios.
**Qué mide la prueba:** con 100.000 COP en la cuenta origen, 200 intentos concurrentes de la misma transferencia de 30.000 COP (misma clave de idempotencia, ventana de 1 s) deben dejar exactamente 1 transacción confirmada, saldos finales de 70.000 y 30.000, las 200 respuestas con el mismo transaccion_id, 2 asientos contables y ningún saldo negativo ni inflado en ningún momento (muestreo cada 10 ms). Fuente: Caso 2, sección 4, y ADR-000. Detalle: Wiki · Segundo previo · 2. Medida verificable.

---
## ¿Cómo ejecutar la prueba?

Requisitos: Node.js v20 o superior. Sin dependencias externas (`npm install` no es necesario).

|Caso|	Comando|	Resultado esperado|
|---|---|---|
|Prueba CON la táctica (Oficial P5)|`pnpm test` (o `pnpm run test:con`)|La prueba pasa en VERDE: exactamente 1 débito, saldo origen = 70.000 COP|
|Prueba SIN la táctica (Vulnerable)|`pnpm run test:sin`|La prueba falla en ROJO: saldo negativo (-5.900.000 COP) por carrera|
|Prueba con falla de red (Timeout P4)|`pnpm run test:falla`|La prueba pasa: red simula timeout pero el ledger evita débitos duplicados|
|Medición comparativa (P3/P5)|`pnpm run medir`|Muestra comparativa antes/después, latencia y memoria|
|Medición únicamente CON idempotencia|`pnpm run medir:con`|Mide latencia y memoria con la táctica activa (1 débito, 2 asientos)|
|Medición únicamente SIN idempotencia|`pnpm run medir:sin`|Mide latencia y débitos duplicados de la versión vulnerable (200 débitos)|

---
## Video de sustentación

P6:[(https://youtu.be/NHfZRwCWCtc)](https://youtu.be/NHfZRwCWCtc)

|Integrante|	Qué hizo|	Dónde está|Parte del video|
|---|---|---|---|
|Anyela Jhohana Herrera Lobo |Elección del escenario, medida verificable y README|Wiki «Segundo previo»; README.md|1. El escenario|
|Daniela Alejandra Barreto Ibarra |ADR-002: decisión sobre el modelo de lenguaje, diagrama de la falla y casos de prueba|Wiki «ADR-002»|2. El ADR-002|
|Laura Isabella Correa Nieto|Estructura del repo, mecanismo de falla y prueba del escenario|test/, package.json|	3. La prueba fallando|
|Jesús Daniel Lozano Erazo|Táctica aplicada y ADR-003 (decisión y alternativas)|src/ledger.js, docs/adr/ADR-003.md|4. La táctica|
|Josue Daniel Perez Guerrero|Código base, mediciones antes y después, y ADR-003 (costo)|src/, test/medicion.js|5. El costo|
|Diego Sebastian Cuadros Murillo|Vista de contenedores, pendientes y ensamble del video| docs/contenedores.md, docs/adr/ADR-001.md|6. Qué queda pendiente|

---
## Contexto del caso

## 1. De qué va el proyecto

Una fintech local lanza una billetera de bajo monto en una ciudad intermedia. Permite enviar dinero entre personas y pagar con código QR en tiendas de barrio. El dinero de los usuarios está respaldado por un **banco patrocinador**, con el que se concilia todos los días.

**Meta comercial del primer año:**

| Indicador | Objetivo |
|---|---|
| Usuarios registrados | 150.000 |
| Pagos diarios | ~40.000 |
| Monto típico por pago | menor a $50.000 |

**La escena que define el producto:** en la caja de una tienda, el cliente escanea el QR y el tendero necesita ver el pago confirmado en **menos de dos segundos** para entregar el vuelto. Si eso falla dos veces, el tendero vuelve al efectivo y no regresa.

Al mismo tiempo la empresa está vigilada por el regulador: cada peso debe ser trazable, y perder o duplicar una transacción es un problema legal, no un bug.

---

## 2. Actores

| Actor | Rol |
|---|---|
| **Usuario persona** | Recarga, envía, paga con QR, consulta su historial. |
| **Comercio** | Genera QR, verifica pagos recibidos, retira a su cuenta bancaria. |
| **Analista de operaciones** | Monitorea, concilia y gestiona reclamos. |
| **Banco patrocinador** | Custodia los fondos; recibe y envía transferencias. |
| **Pasarela de recargas** | Tarjetas y corresponsales para meter dinero a la billetera. |

---

## 3. Requisitos funcionales iniciales

| ID | Requisito |
|---|---|
| RF-01 | Registro de usuario con validación de identidad básica (KYC simplificado). |
| RF-02 | Recarga de saldo desde tarjeta o corresponsal bancario. |
| RF-03 | Envío de dinero entre usuarios por número de celular. |
| RF-04 | Pago en comercio mediante QR estático o dinámico. |
| RF-05 | Historial de movimientos con comprobante descargable por transacción. |
| RF-06 | Notificación inmediata a ambas partes de cada transacción. |
| RF-07 | Bloqueo de cuenta por sospecha de fraude, manual o por reglas. |
| RF-08 | Conciliación diaria automática contra el banco patrocinador. |

---

## 4. Demandas de calidad

Las tres tensiones que definen el sistema. Son el punto de partida de los escenarios de calidad de la Entrega 1.

### Ni perder ni duplicar dinero
Toda transferencia debe ejecutarse **exactamente una vez**, aunque la red falle a mitad de camino y el cliente reintente. El saldo de un usuario jamás puede quedar negativo ni inflado, ni siquiera por segundos.

### Latencia en la caja
El pago QR debe confirmarse en **menos de 2 segundos en el percentil 95**, sobre redes celulares mediocres. La seguridad que se agregue (validaciones, reglas antifraude) descuenta de ese presupuesto.

### Auditoría total, 24/7
Cada operación queda registrada de forma **inalterable** y reconstruible ante el regulador. El sistema opera de corrido: una ventana de mantenimiento un sábado en la noche es plata que la gente no pudo mover.

---

## 5. Restricciones y supuestos

- **Regulación financiera:** registro inmutable de operaciones y reportes al supervisor.
- **Banco patrocinador por lotes:** la conciliación es nocturna, no en línea.
- **Montos limitados** por normativa de depósitos de bajo monto.
- **Equipo pequeño de operaciones:** lo que pase a las 3 a. m. debe resolverse solo o esperar a la mañana.

---

## 6. Documentación y entregas

Todo lo documental está en la Wiki:

| Sección de la Wiki | Contenido |
|---|---|
| ADR | Registro de decisiones de arquitectura (ADR-000 en adelante). |
| Diagramas | Contexto, contenedores, secuencia, despliegue. |
| Escenarios de calidad | Escenarios completos con sus seis partes y su medida. |
| Entregas | Documentos consolidados por entrega. |
