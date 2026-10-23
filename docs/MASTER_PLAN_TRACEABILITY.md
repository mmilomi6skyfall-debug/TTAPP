# Matriz de trazabilidad del plan maestro — TTAPP

**Estado:** inicializada durante Paso 0; se registraron las selecciones propuestas del usuario el 23 de octubre de 2026. La aprobación explícita del gate sigue pendiente. Este archivo no existía en la rama main revisada.  
**Base de la revisión documental:** main en e7e47e38dd78152a1b5c7fdb43c29b7608640b04 (23 de octubre de 2026).  
**Importante:** las referencias son evidencia documental/estática, no resultado de una nueva ejecución de pruebas. No se leyeron archivos .env ni se ejecutaron seeds, migraciones o despliegues.

## Estados utilizados

- **CONFIRMADO-DOCUMENTAL:** el requisito o flujo aparece explícitamente en documentos/código.
- **PENDIENTE-DECISIÓN:** requiere aprobación humana de negocio/operación.
- **BRECHA-TÉCNICA:** no se encontró evidencia suficiente de implementación, seguridad o prueba.
- **NO-VERIFICADO:** la afirmación necesita una ejecución reproducible que no se realizó durante este Paso 0.
- **BLOQUEO-GATE:** impide avanzar o abrir el piloto hasta que se cierre con evidencia.

## Registro de respuesta propuesta (23 de octubre de 2026)

El usuario envió selecciones para revisión y pidió mantener el Paso 1 bloqueado hasta aprobación explícita. Las selecciones no se consideran aprobación final.

| ID | Alternativa seleccionada para revisión | Estado |
|---|---|---|
| D0-01 | A — mantener confirmación manual existente | Propuesta recibida; pendiente aprobación. No autoriza pasarela, cobros reales nuevos ni cambios de lógica PAY. |
| D0-02 | B — separación de privilegios/roles | Propuesta recibida; pendiente aprobación y matriz definitiva de permisos. |
| D0-03 | A — alta controlada por personal autorizado | Propuesta recibida; pendiente aprobación y definición de validación. |
| D0-04 | B — cancelación por rol/estado desde backend | Propuesta recibida; pendiente aprobación y cierre de reglas específicas. |
| D0-05 | B — acuse, escalamiento y cierre de pánico | Propuesta recibida; pendiente aprobación y definición operativa del protocolo. |
| D0-06 | A — zona delimitada y turnos supervisados | Propuesta recibida; pendiente aprobación y concreción de zona, horario, plataformas y grupo. |
| D0-07 | B — responsables y suplentes, autoridad go/no-go única | Propuesta recibida; pendiente aprobación y asignación de titulares/suplentes. |

## Evidencia de implementación en la rama `implementation/approved-directions-2026-10-23`

| Área | Cambios preparados | Evidencia ejecutable |
|---|---|---|
| Pago manual D0-01 | Flujo de pagos existente preservado; no se cambió PAY ni se agregó pasarela | Regresión/diff final pendiente |
| RBAC D0-02 | Roles ADMIN, OPERATOR, FINANCE, AUDITOR, BOARD; permisos diferenciados; audit logs y resumen agregado | Código actualizado; pruebas no ejecutadas |
| Alta D0-03 | API para pasajero/conductor/vehículo, referencias documentales y verificación humana; activación falla cerrada sin configuración de tipos | Pruebas de alta y configuración pendientes; no hay carga de archivos binarios |
| Cancelación D0-04 | Actor desde JWT, participación/organización/motivo verificados, CANCELLED_BY_OPERATOR | Prueba unitaria de política añadida; no ejecutada |
| Pánico D0-05 | Persistencia y rutas de activar/listar/acuse/escalamiento/cierre; auditoría; sin tiempo automático no aprobado | Pruebas de servicio añadidas; no ejecutadas |
| Zona/horario D0-06 | No se codificaron valores ficticios | Bloqueo operativo |
| Responsables D0-07 | Modelo de roles/gate documentado | Titulares/suplentes pendientes |
| Esquema | Column organization_id para auditoría, nuevo estado de cancelación y panic_alerts; migración aditiva | Migración no ejecutada |
| Validaciones | Se añadieron tests unitarios de política de acceso, saneamiento y documento | Ningún test ejecutado; build/E2E/OpenAPI pendientes |

## Trazabilidad de alcance y decisiones

| ID | Requisito / decisión | Evidencia revisada | Estado | Criterio / acción pendiente | Responsable |
|---|---|---|---|---|---|
| S0-01 | Decidir si el piloto incluye confirmación manual del cobro | docs/04 excluye pagos del alcance funcional; docs/01 y docs/02 ticket 7.17 mantienen confirmación y cierre | SELECCIÓN A IMPLEMENTADA; REGRESIÓN PENDIENTE | Aprobar D0-01 y reconciliar el estado final del viaje sin alterar silenciosamente la lógica PAY | Negocio + operaciones |
| S0-02 | Segregar viajes y auditoría por rol | seed.ts define ADMIN, OPERATOR, FINANCE, DRIVER, PASSENGER; TripsService habilita lectura amplia para staff | SELECCIÓN B IMPLEMENTADA; PRUEBAS PENDIENTES | Aprobar D0-02; corregir matriz RBAC, aislamiento por organización y consultas de auditoría | Operaciones + seguridad |
| S0-03 | Alta y validación de pasajero, conductor y vehículo | schema.sql incluye perfiles/documentos con verified; API observada sin CRUD completo para esos flujos | SELECCIÓN A IMPLEMENTADA PARCIALMENTE; CONFIGURACIÓN PENDIENTE | Aprobar D0-03; definir criterio formal de validado y demostrar alta a través de un flujo autorizado | Operaciones |
| S0-04 | Cancelaciones seguras por rol y estado | docs/02 ticket 7.18; CancelTripDto acepta cancelledBy; TripsService.cancel usa ese valor | SELECCIÓN B IMPLEMENTADA; PRUEBAS PENDIENTES | Aprobar D0-04; backend deriva actor del token, comprueba viaje/organización/estado y prueba denegaciones | Backend + operaciones |
| S0-05 | Pánico de pasajero y conductor con atención trazable | docs/04 criterio PANIC-01; no se halló endpoint/modelo/flujo dedicado en OpenAPI/schema/módulos listados | PROPUESTA B RECIBIDA; BLOQUEO-GATE | Aprobar D0-05; implementar incidente, acuse, escalamiento, cierre, auditoría, interfaces y pruebas E2E | Seguridad/operaciones |
| S0-06 | Zona, horario, plataformas y grupo nominal | docs/01 refiere 50–100 unidades; docs/04 propone grupo pequeño en zona acotada; docs/03 deja datos reales pendientes | SELECCIÓN A; DETALLES OPERATIVOS PENDIENTES | Aprobar D0-06, cargar zona/horarios reales autorizados y probar dispositivos y límites | Negocio + operaciones |
| S0-07 | Responsables y autoridad de go/no-go | docs/03 sección 5/6 y docs/04 checklist piden responsables, pero no se asignan titulares | SELECCIÓN B; NOMBRAMIENTOS PENDIENTES | Aprobar D0-07; registrar responsables, suplentes, canales y autoridad final | Organización / mesa directiva |
| T0-01 | Aislamiento de viajes por organización | TripsService.findAll no añade filtro de organización para staff; canViewTrip trata OPERATOR/ADMIN/FINANCE como acceso amplio | BLOQUEO-GATE | Pruebas negativas de usuario de organización A contra recursos de B en lista/detalle y mutaciones | Backend + seguridad |
| T0-02 | Autorización de cancelación | cancelación recibe actor desde DTO y el método revisado no valida la participación del usuario antes de mutar | BLOQUEO-GATE | Pruebas por pasajero, conductor, operador, viaje ajeno, otro tenant y cada estado permitido/prohibido | Backend + seguridad |
| T0-03 | Endpoint/modelo de pánico | No se encontró en api/openapi.yaml ni db/schema.sql, ni módulo pánico entre módulos listados | BRECHA-TÉCNICA | No marcar PANIC-01 como aprobado hasta ejecutar las pruebas específicas del flujo | Backend |
| T0-04 | Auditoría consultable de solo lectura | seed.ts contempla audit.view; no se encontró ruta de consulta de auditoría en la API inspeccionada | BRECHA-TÉCNICA | Contrato de consulta, permiso separado, restricción de campos/organización y prueba negativa | Backend + auditor |
| T0-05 | Superficies de alta y validación | users.controller.ts expone identidad propia y ruta de ejemplo; drivers.controller.ts expone cambio de estado; vehicles no muestra controlador en el árbol revisado | BRECHA-TÉCNICA | Acordar D0-03 y aportar evidencia de alta, aprobación, suspensión y auditoría | Backend + operaciones |
| T0-06 | Fuente única de estados del viaje | schema.sql/OpenAPI declaran TRIP_COMPLETED y otros estados; la ruta de finalización del Paso 7 lleva a PAYMENT_PENDING | PENDIENTE-DECISIÓN | Resolver D0-01 y reconciliar tabla de transiciones, API y código; probar cada transición | Backend + negocio |
| T0-07 | Instrucciones de agente y matriz | AGENTS.md y docs/MASTER_PLAN_TRACEABILITY.md no aparecieron en la rama main revisada | BRECHA-DOCUMENTAL | La matriz se crea en esta rama; instrucciones de agente solo se añadirán si se solicitan/definen | Mantenedor |
| T0-08 | Evidencia de aceptación existente | docs/01 declara pruebas HTTP históricas; no se ejecutó build, test, E2E ni validación OpenAPI en esta revisión remota | NO-VERIFICADO | En el paso técnico que se autorice, registrar comandos reales, commit SHA y resultados sin secretos | Backend/QA |

## Gate de apertura heredado del plan MVP

El documento 04 especifica que no debe abrirse el piloto con bloqueos de aislamiento cross-organization, asignación duplicada, transición inválida, GPS no confiable sin antigüedad, alerta de pánico perdida, ausencia de respaldo/restauración o ausencia de responsable de auditoría/soporte. Cada criterio debe tener evidencia enlazada, fecha y responsable.

## Límite de esta revisión

- No se verificó el estado Git del directorio local abierto en VS Code; el conector permite inspeccionar el estado remoto de GitHub, no el árbol de trabajo local ni cambios sin commit.
- No se ejecutaron pruebas ni comandos de Node/npm: el trabajo disponible fue una revisión documental/estática mediante el conector.
- No se afirma que la compilación, las pruebas unitarias, las pruebas E2E o el contrato OpenAPI estén pasando actualmente.
- La rama de Paso 0 solo debe recibir cambios documentales hasta la aprobación expresa. No iniciar el Paso 1 por inferencia.
