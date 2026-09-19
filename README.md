# Ducky — Billetera digital de bajo monto

**Caso 2 · Arquitectura de Software · UFPS · 2026-II · Grupo 2**

Repositorio del proyecto semestral. **Ducky** es una billetera digital para pagos entre personas y comercios de barrio.

---

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
