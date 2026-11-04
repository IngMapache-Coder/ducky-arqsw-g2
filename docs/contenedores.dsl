workspace "Billetera digital de bajo monto" "Vista C4 de contenedores para la transferencia entre usuarios (RF-03)" {
    model {
        remitente = person "Usuario remitente" "Solicita una transferencia mediante el numero celular del destinatario."
        destinatario = person "Usuario destinatario" "Recibe el dinero y la notificacion de la transferencia."

        billetera = softwareSystem "Billetera digital de bajo monto" "Permite enviar dinero entre usuarios y consultar sus movimientos." {
            gateway = container "API Gateway" "Valida el JWT, aplica limite de peticiones y enruta las solicitudes de los usuarios." "Kong"
            pagos = container "ms-pagos" "Orquesta la transferencia y devuelve la confirmacion; no modifica saldos y no tiene base de datos propia." "Go + gRPC" {
                tags "Prototipo"
            }
            identidad = container "ms-identidad" "Resuelve el destinatario por celular y valida el estado de las cuentas." "Java + Spring Boot"
            antifraude = container "ms-antifraude" "Evalua las reglas de riesgo antes de mover dinero y analiza despues las transacciones confirmadas." "Go + gRPC"
            cache = container "Cache de pagos" "Respuesta por clave de idempotencia y estado transitorio (TTL de minutos); no es la fuente de verdad del dinero." "Redis" {
                tags "Database"
            }
            ledger = container "ms-ledger" "Unico responsable de validar saldo, debitar y acreditar atomica e idempotentemente; publica sus eventos desde el outbox." "Go + gRPC" {
                tags "Prototipo"
            }
            bdLedger = container "BD contable" "Saldos, asientos de doble entrada, claves de idempotencia y tabla outbox." "PostgreSQL" {
                tags "Database"
            }
            kafka = container "Broker de eventos" "Conserva los eventos de dominio hasta su consumo; replicacion 3 y orden por cuenta." "Apache Kafka" {
                tags "Broker"
            }
            notificaciones = container "ms-notificaciones" "Consume el evento y notifica al remitente y al destinatario." "Node.js + NestJS"
            bdNotificaciones = container "BD de notificaciones" "Registra envios y deduplica por evento, destinatario y canal." "MongoDB" {
                tags "Database"
            }
            historial = container "ms-historial" "Proyecta los movimientos del evento para consultar el historial y generar comprobantes." "Node.js + NestJS"
            bdHistorial = container "BD de historial" "Vista de lectura de movimientos por usuario." "MongoDB" {
                tags "Database"
            }
            auditoria = container "ms-auditoria" "Registra de forma inmutable cada evento relevante para el regulador." "Java + Spring Boot"
            bdAuditoria = container "BD de auditoria" "Eventos encadenados por hash; el rol de la base solo puede insertar." "PostgreSQL (append-only)" {
                tags "Database"
            }
        }

        proveedor = softwareSystem "Proveedor de notificaciones" "Servicio externo para entregar mensajes push, SMS o correo."
        proveedorLLM = softwareSystem "Proveedor LLM" "Servicio externo de modelo de lenguaje. Solo explica y resume alertas antifraude para el analista (ADR-002); no bloquea cuentas ni toca saldos." {
            tags "ExternoLLM"
        }

        remitente -> gateway "Solicita envio P2P con clave de idempotencia" "HTTPS/REST, sincrono" {
            tags "Sincrona,Camino"
        }
        gateway -> pagos "Enruta la orden de transferencia y espera el resultado" "gRPC, sincrono" {
            tags "Sincrona,Camino"
        }
        pagos -> cache "Busca respuesta previa y estado cacheado" "Redis, sincrono" {
            tags "Sincrona"
        }
        pagos -> identidad "Resuelve celular y verifica cuentas si falta dato en cache" "gRPC, sincrono, con timeout" {
            tags "Sincrona"
        }
        pagos -> antifraude "Solicita evaluacion rapida de riesgo" "gRPC, sincrono, con timeout" {
            tags "Sincrona"
        }
        pagos -> ledger "Aplica transferencia: validar saldo, debitar y acreditar (una sola llamada)" "gRPC, sincrono, clave de idempotencia" {
            tags "Sincrona,Camino"
        }
        pagos -> kafka "Publica TransaccionEvaluada para el analisis diferido de fraude" "Kafka, asincrono" {
            tags "Asincrona"
        }
        ledger -> bdLedger "Confirma debito, credito y evento outbox en una transaccion ACID" "SQL, sincrono" {
            tags "Sincrona,Camino"
        }
        ledger -> kafka "Publica TransaccionConfirmada (ledger.transacciones.confirmadas) desde outbox, despues del commit" "Kafka, asincrono; entrega al menos una vez" {
            tags "Asincrona"
        }
        kafka -> notificaciones "Entrega TransaccionConfirmada para ambos usuarios" "Kafka, asincrono; entrega al menos una vez" {
            tags "Asincrona"
        }
        kafka -> historial "Entrega TransaccionConfirmada para proyectar el movimiento" "Kafka, asincrono" {
            tags "Asincrona"
        }
        kafka -> auditoria "Entrega TransaccionConfirmada para el registro inmutable" "Kafka, asincrono" {
            tags "Asincrona"
        }
        kafka -> antifraude "Entrega TransaccionConfirmada para el analisis diferido" "Kafka, asincrono" {
            tags "Asincrona"
        }
        notificaciones -> bdNotificaciones "Consulta y registra estado de cada aviso para deduplicar" "MongoDB, sincrono en el consumidor" {
            tags "Sincrona"
        }
        historial -> bdHistorial "Guarda el movimiento proyectado" "MongoDB, sincrono en el consumidor" {
            tags "Sincrona"
        }
        auditoria -> bdAuditoria "Inserta el evento encadenado (solo INSERT)" "SQL, sincrono en el consumidor" {
            tags "Sincrona"
        }
        notificaciones -> proveedor "Solicita entrega de los avisos" "HTTPS/SMTP, sincrono fuera del flujo P2P" {
            tags "Sincrona"
        }
        antifraude -> proveedorLLM "Envia el contexto minimo de una alerta para explicarla al analista (solo analisis diferido)" "HTTPS/JSON, sincrono, timeout 4 s (supuesto de diseno, ADR-002)" {
            tags "Sincrona,LLM"
        }
        proveedor -> remitente "Entrega aviso de dinero enviado" "Push/SMS/correo, asincrono" {
            tags "Asincrona"
        }
        proveedor -> destinatario "Entrega aviso de dinero recibido" "Push/SMS/correo, asincrono" {
            tags "Asincrona"
        }
    }

    views {
        container billetera "TransferenciaP2P" "Contenedores involucrados en un envio entre usuarios." {
            include *
            autoLayout lr
        }
        styles {
            element "Person" {
                shape Person
                background #17324D
                color #FFFFFF
            }
            element "Container" {
                background #2364AA
                color #FFFFFF
            }
            element "Prototipo" {
                background #D97706
                color #FFFFFF
            }
            element "Database" {
                shape Cylinder
                background #697586
                color #FFFFFF
            }
            element "Broker" {
                shape Pipe
                background #7756A8
                color #FFFFFF
            }
            element "ExternoLLM" {
                background #7756A8
                color #FFFFFF
            }
            relationship "Sincrona" {
                style solid
                color #475569
            }
            relationship "Asincrona" {
                style dashed
                color #0F766E
            }
            relationship "Camino" {
                thickness 5
                color #B91C1C
            }
            relationship "LLM" {
                color #7756A8
                thickness 4
            }
        }
    }
}
