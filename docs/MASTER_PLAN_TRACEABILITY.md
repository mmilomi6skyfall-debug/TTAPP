# Matriz de trazabilidad del plan maestro — TTAPP

**Estado:** decisiones y definición de Paso 0 cerradas; validación actual de implementación registrada en la sección final. El piloto no está autorizado para abrirse. Este archivo no existía en la rama main revisada.  
**Base de la revisión documental:** main en e7e47e38dd78152a1b5c7fdb43c29b7608640b04 (23 de octubre de 2026).  
**Importante:** las referencias son evidencia documental/estática, no resultado de una nueva ejecución de pruebas. No se leyeron archivos .env ni se ejecutaron seeds, migraciones o despliegues.

## Estados utilizados

- **CONFIRMADO-DOCUMENTAL:** el requisito o flujo aparece explícitamente en documentos/código.
- **PENDIENTE-DECISIÓN:** requiere aprobación humana de negocio/operación.
- **BRECHA-TÉCNICA:** no se encontró evidencia suficiente de implementación, seguridad o prueba.
- **NO-VERIFICADO:** la afirmación necesita una ejecución reproducible que no se realizó durante este Paso 0.
- **BLOQUEO-GATE:** impide avanzar o abrir el piloto hasta que se cierre con evidencia.

## Registro de respuesta propuesta (23 de octubre de 2026)

Nota histórica: las selecciones iniciales eran propuestas. La instrucción posterior del usuario autorizó su implementación en la rama separada; el cierre del Paso 0 y los bloqueos de apertura se detallan en `docs/06-cierre-paso0.md`.

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
| RBAC D0-02 | Roles ADMIN, OPERATOR, FINANCE, AUDITOR, BOARD; permisos diferenciados; audit logs y resumen agregado | Código actualizado; CI aprobó build y unit tests (12 pruebas) |
| Alta D0-03 | API para pasajero/conductor/vehículo, referencias documentales y verificación humana; activación falla cerrada sin configuración de tipos | Pruebas de alta y configuración pendientes; no hay carga de archivos binarios |
| Cancelación D0-04 | Actor desde JWT, participación/organización/motivo verificados, CANCELLED_BY_OPERATOR | Prueba unitaria de política añadida y ejecutada en CI (parte de 12 pruebas) |
| Pánico D0-05 | Persistencia y rutas de activar/listar/acuse/escalamiento/cierre; auditoría; sin tiempo automático no aprobado | Pruebas de servicio añadidas y ejecutadas en CI (parte de 12 pruebas) |
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
| S0-05 | Pánico de pasajero y conductor con atención trazable | docs/04 criterio PANIC-01; no se halló endpoint/modelo/flujo dedicado en OpenAPI/schema/módulos listados | IMPLEMENTACIÓN EN RAMA; VALIDACIÓN PENDIENTE | Aprobar D0-05; implementar incidente, acuse, escalamiento, cierre, auditoría, interfaces y pruebas E2E | Seguridad/operaciones |
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


## Control adicional y estado real de pruebas


- **Reingreso del conductor a disponibilidad:** tras completar o cancelar un viaje asignado, el backend vuelve a poner al conductor en `AVAILABLE` únicamente si tiene una asignación activa a vehículo activo de la misma organización y ambos cumplen las políticas documentales configuradas. Si falta configuración/documentación o está vencida, queda `OFFLINE` y debe volver a pasar por la validación. Así se evita que completar/cancelar un viaje omita el gate de D0-03.
- **Pruebas añadidas pero no ejecutadas:** política de lectura/cancelación de viaje, saneamiento de auditoría, política documental, servicio de pánico, alta interna y agregados de mesa directiva. No se afirma resultado verde sin ejecución.


## Actualización de verificación técnica — CI del 24 de octubre de 2026 UTC

Run: [40046971361](https://github.com/mmilomi6skyfall-debug/TTAPP/actions/runs/40046971361), branch `implementation/approved-directions-2026-10-23`.

| Control | Resultado |
|---|---|
| Instalación limpia `npm ci` | PASS |
| Build `npm run build` | PASS |
| Jest | PASS — 6 suites y 12 pruebas |
| Lint OpenAPI | PASS |
| Auditoría de producción `npm audit --omit=dev` | FAIL — 11 vulnerabilidades: 4 altas, 7 moderadas, 0 críticas |
| Integración/E2E PostgreSQL/PostGIS/Redis/dispositivos | NO EJECUTADAS |
| Migración de esquema | Preparada, no aplicada |
| Seed | No ejecutado |
| Merge/despliegue | No realizados; PR sigue en borrador |

El gate de dependencias no se oculta: los fixes restantes indican actualización mayor de componentes NestJS. No se forzó el cambio de mayor; requiere una rama de actualización de framework y regresión técnica. El Paso 0 se cierra para alcance y criterios, no para apertura productiva.


## Paso 1 — estabilización de repositorio y calidad (validación técnica completada; seguridad y secretos pendientes)

- Inspección remota: existen seis archivos unitarios `.spec.ts`; no existía `test/jest-e2e.json`; ESLint no estaba declarado y OpenAPI no tenía script npm.
- Se añaden scripts separados de lint sin autofix, unit tests, smoke E2E aislado y validación OpenAPI.
- Se incorporan guardas unit-testables para seeds: credenciales administrativas explícitas sin valores de ejemplo; datos piloto placeholder solo en desarrollo con opt-in explícito; bloqueo de staging/producción.
- Los archivos reales `.env.*` están rastreados. Se ajusta ignore y se documenta un script que revisa diffs staged/unstaged antes de `git rm --cached`. La retirada efectiva queda pendiente de ejecutar la comprobación en el checkout local, cuyo estado no está disponible por la API remota.
- Evidencia CI: run [40054681906](https://github.com/mmilomi6skyfall-debug/TTAPP/actions/runs/40054681906) terminó con job de calidad SUCCESS: `npm ci`, lint, build, 7 suites/17 pruebas unitarias, smoke E2E aislado y lint OpenAPI pasaron. El job de auditoría de producción terminó FAILURE y subió el reporte; no se ocultó el bloqueo.
- Auditoría en instalación: 24 vulnerabilidades totales (3 bajas, 13 moderadas, 8 altas); producción: 11 (7 moderadas, 4 altas, 0 críticas). Se identifican avisos relacionados con `multer` y `@nestjs/platform-express` y dependencias transitivas. No se aplicó `npm audit fix --force` ni una actualización mayor.
- La configuración E2E inicial se corrigió tras un fallo real: Jest requiere JSON válido y Supertest se importa como CommonJS en este proyecto; el run final pasó.
- La retirada efectiva de `.env.development`, `.env.test`, `.env.staging` y `.env.production` del índice sigue pendiente de ejecutar `scripts/untrack-env-files.sh` en el checkout local tras comprobar `git status`. No se afirma rotación de secretos. No se ejecutaron seeds, migraciones ni despliegues.


## Remediación de auditoría de producción — 24 de octubre de 2026

Rama: `security/production-dependency-remediation-2026-10-23`  
PR: [#3 — Security remediation: NestJS 11 and production dependency patches](https://github.com/mmilomi6skyfall-debug/TTAPP/pull/3)  
CI: [run 40056220329](https://github.com/mmilomi6skyfall-debug/TTAPP/actions/runs/40056220329)  
Commit con lockfile regenerado: `d80e16ae4c93dd39ad841f06dc9282142e09b4fd`.

| Control | Resultado verificado |
|---|---|
| Dependencias Nest | Actualización coordinada de NestJS 10 a la línea parcheada 11.2.x; paquetes relacionados actualizados a versiones compatibles de la misma línea |
| Dependencias transitivas | Overrides para `body-parser`, `file-type`, `lodash`, `multer`, `qs` y `uuid`; lockfile generado por npm en runner limpio, no editado manualmente |
| `npm ci` | PASS desde el lockfile comprometido |
| Lint | PASS |
| Build | PASS |
| Pruebas unitarias | PASS |
| Smoke E2E aislado | PASS; no sustituye E2E real con PostgreSQL/PostGIS/Redis ni dispositivos |
| Validación OpenAPI | PASS |
| `npm audit --omit=dev` | PASS — 0 vulnerabilidades (0 bajas, 0 moderadas, 0 altas, 0 críticas) |
| Migraciones, seeds, despliegues | No ejecutados |

El workflow temporal utilizado para generar el lockfile fue eliminado después de obtener el archivo generado. El workflow normal de calidad y seguridad quedó habilitado también para la rama de remediación. La actualización mayor de NestJS se hizo en una rama aislada y pasó las verificaciones automatizadas disponibles; sigue pendiente revisión humana del diff antes de fusionar. No se declara que la integración con servicios reales ni la apertura del piloto estén aprobadas.


## Paso 2 — autorización e aislamiento por organización (rama aislada, 24 de octubre de 2026)

**Decisiones vigentes:** D0-02=B (separación de privilegios) y, por selección posterior del usuario, D0-04=A (cualquier usuario autenticado puede cancelar un viaje de su misma organización antes del inicio). Esta decisión sustituye la implementación previa D0-04=B; no permite cruzar organizaciones ni cancelar viajes ya iniciados.

**Cambios preparados en esta rama:**
- Lectura de viajes conserva organización en lista/detalle; las mutaciones de viajes validan tenant y las acciones del conductor exigen que el JWT indique rol DRIVER y coincida con el conductor asignado.
- Cancelación: actor desde JWT, motivo obligatorio existente, límite por estado antes del inicio y nuevo estado genérico CANCELLED_BY_USER; la organización ajena se deniega.
- Despacho: ranking y arranque comprueban el tenant del viaje; candidatos y score de cancelaciones se filtran por organización; asignación manual y respuesta a ofertas validan tenant de viaje/conductor/vehículo y permisos; validaciones ocurren antes de persistir la respuesta a oferta.
- GPS: solo un JWT de rol DRIVER puede enviar su propia posición, y se verifica que exista un perfil activo de esa organización.
- Documentación y contrato OpenAPI reflejan el nuevo estado y política. Se añadió migración SQL aditiva para el nuevo enum; no se ejecutó.
- Pruebas unitarias añadidas para la política de cancelación, aislamiento de despacho y GPS.

**Estado de verificación al crear estos cambios:** no se afirma aprobación de build/tests hasta que el workflow de la rama termine. La verificación deberá incluir instalación limpia, lint, build, pruebas unitarias, smoke E2E y lint OpenAPI. No se ejecutaron seeds, migraciones, despliegues ni operaciones contra datos compartidos.
