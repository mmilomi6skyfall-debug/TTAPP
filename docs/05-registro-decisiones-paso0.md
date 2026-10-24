# Registro de decisiones — Paso 0 del MVP TTAPP

**Estado:** las selecciones D0-01 a D0-07 fueron elegidas por el usuario y su implementación fue autorizada en la rama aislada. El cierre técnico del Paso 0 se registra en `docs/06-cierre-paso0.md`; el go/no-go del piloto sigue sujeto a evidencia.  
**Fecha de revisión:** 23 de octubre de 2026.  
**Base remota revisada:** rama main, commit e7e47e38dd78152a1b5c7fdb43c29b7608640b04.  
**Alcance de este paso:** análisis y documentación únicamente. No se modificó código funcional, no se ejecutaron seeds ni migraciones, no se hizo despliegue y no se procesaron pagos.

## Registro histórico de selección inicial (23 de octubre de 2026)

El usuario remitió selecciones para revisión y pidió expresamente mantener bloqueado el Paso 1 hasta una aprobación explícita. Por tanto, las alternativas elegidas abajo se registran como **propuestas recibidas**, no como decisiones finales aprobadas.

| ID | Selección recibida | Estado y precisiones que todavía requieren cierre |
|---|---|---|
| D0-01 | **A — mantener la confirmación manual de pago existente en el piloto.** | Pendiente de aprobación explícita del gate. No autoriza integrar una pasarela, agregar cobros reales ni cambiar la lógica de pagos. |
| D0-02 | **B — separar privilegios y roles explícitos.** | Pendiente de aprobación del gate y de concretar permisos finales por actor para viajes, auditoría, finanzas, ubicación y accesos excepcionales. |
| D0-03 | **A — alta controlada por personal autorizado, sin auto-registro público.** | Pendiente de aprobación del gate y de definir el criterio exacto de “validado”, documentos requeridos, vigencia, responsable, suspensión y cambios de vehículo. |
| D0-04 | **B — reglas de cancelación por rol y estado, derivadas en backend.** | Pendiente de aprobación del gate y de fijar límites exactos por estado, catálogo de motivos, excepciones y facultades de despacho. |
| D0-05 | **B — protocolo del botón de pánico con acuse, escalamiento y cierre.** | Pendiente de aprobación del gate y de definir responsables/suplentes, tiempos, canales, condiciones de cierre y respuesta externa. |
| D0-06 | **A — piloto pequeño, zona delimitada y turnos supervisados.** | Pendiente de aprobación del gate y de fijar polígono, días/horas, plataformas y versiones disponibles, lista nominal y tamaño del grupo. |
| D0-07 | **B — responsables y suplentes por función, con una única autoridad go/no-go.** | Pendiente de aprobación del gate y de asignar titulares/suplentes, canal de soporte, responsable de incidentes y autoridad final. |

**Estado histórico:** estas filas documentan las dudas iniciales, no el estado actual. La selección final para implementación y el gate vigente están recogidos en la sección siguiente. No se ejecutaron pagos, seeds, migraciones de base de datos ni despliegues.

## Resolución del usuario — alternativas autorizadas para implementación (23 de octubre de 2026)

La instrucción posterior **“realiza los cambios propuestos”** autoriza implementar D0-01 a D0-07 en una rama independiente. No autoriza abrir el piloto ni inventar parámetros que no se proporcionaron.

| ID | Selección | Resolución implementada/pendiente |
|---|---|---|
| D0-01 | A — conservar confirmación manual | Se preserva PAY y no se añade pasarela ni cobro real. |
| D0-02 | B — separar roles | Seed, consulta de auditoría por tenant y resumen agregado BOARD añadidos. |
| D0-03 | A — alta interna controlada | API de altas, registro/verificación documental y bloqueo de activación sin listas de tipos configuradas. |
| D0-04 | B — cancelación por rol/estado | Actor desde JWT, validación de organización/participación/permiso/motivo y CANCELLED_BY_OPERATOR. |
| D0-05 | B — acuse/escalamiento/cierre de pánico | Entidad, persistencia, endpoints y auditoría; tiempos y responsables todavía pendientes. |
| D0-06 | A — zona pequeña y turnos supervisados | Seleccionado; polígono, horario, plataformas y tamaño de grupo pendientes de definición. |
| D0-07 | B — responsables/suplentes y una autoridad go/no-go | Seleccionado; faltan titulares, suplentes y canales nominales. |

**Paso 1:** la especificación puede continuar en una rama separada después de crear un cierre verificable. El despliegue y la apertura del piloto permanecen bloqueados hasta que la CI, las decisiones operativas y las pruebas de integración/E2E tengan evidencia.

## 1. Cómo leer este registro

- **Confirmado** significa que la regla aparece en un documento o en el código inspeccionado; no significa que esté aprobada operativamente ni que haya sido verificada por una ejecución nueva.
- **Pendiente** significa que requiere decisión humana o evidencia adicional.
- **Recomendación** es la alternativa que parece reducir riesgo o respetar mejor el plan actual; no debe implementarse como requisito hasta aprobarla.
- Los documentos 01, 02 y 03 contienen decisiones históricas y especificaciones de pasos anteriores. Este registro no las reemplaza ni cambia su alcance de forma silenciosa.

## 2. Decisiones de negocio pendientes

### D0-01 — ¿La confirmación manual del cobro permanece dentro del piloto?

**Confirmado en documentos y código:** el plan del MVP (documento 04) indica que la funcionalidad de pagos queda fuera del alcance, salvo compatibilidad y no regresión. En cambio, los fundamentos técnicos y la especificación del Paso 7 describen métodos efectivo/terminal; el endpoint de confirmación crea registros de pago y comisión/liquidación, y el ciclo actual pasa de PAYMENT_PENDING a PAYMENT_CONFIRMED y CLOSED. No hay pasarela digital dentro de ese flujo.

**Pregunta concreta:** ¿el piloto cerrado debe exigir que el conductor registre la confirmación manual del cobro para cerrar el viaje, o la responsabilidad del sistema termina al completar el servicio?

**Alternativa A — Mantener la confirmación manual existente.**
- Funcional: conductor registra efectivo o terminal y el viaje se cierra después de confirmar.
- Operativa: el equipo debe explicar y supervisar el registro, atender discrepancias y definir qué hacer ante un cobro no confirmado.
- Técnica: se conserva el flujo actual de confirmación y sus registros de comisión/liquidación; se debe reconciliar explícitamente el plan 04 con los documentos 01/02/03. No implica integrar una pasarela ni agregar cobros reales.
- Documentos/módulos afectados: documentos 01, 02 (tickets 7.16–7.17), 03, 04, contrato api/openapi.yaml, trips y payments/finance.

**Alternativa B — El alcance operativo termina al completar el servicio; pagos fuera del piloto.**
- Funcional: el éxito del viaje se mide por el servicio completado, no por un evento de pago dentro de TTAPP.
- Operativa: debe quedar claro que el sistema no certifica que el pasajero haya pagado; la organización definirá cómo manejará esa información fuera de la app, si la necesita.
- Técnica: el flujo actual deja el viaje en PAYMENT_PENDING al completarlo, por lo que no basta con ocultar un botón de interfaz. En una fase posterior habrá que separar el estado de servicio completado del proceso de cobro, sin modificar la lógica de pagos existente ni habilitar cobros reales. La ruta de confirmación actual no debe quedar expuesta accidentalmente como función activa del piloto.
- Documentos/módulos afectados: documentos 02, 03 y 04; contratos de estado de viaje en OpenAPI y esquema; módulo trips para el límite operativo y la política de exposición de la ruta existente. El módulo payments/finance se conserva sin cambios funcionales.

**Resolución aplicada:** A, conservar la confirmación manual existente y su cierre actual, sin cambiar la lógica PAY ni integrar una pasarela. La ruta existente queda sujeta a revisión de permisos/regresión antes de apertura.

### D0-02 — ¿Quién puede ver viajes, información de operación y auditoría?

**Confirmado en el código revisado:** el seed crea ADMIN, OPERATOR, FINANCE, DRIVER y PASSENGER; no crea AUDITOR ni un rol para mesa directiva. La lista y lectura individual de viajes permite a OPERATOR, ADMIN y FINANCE consultar viajes sin una restricción visible por organización en esa consulta. El acceso a viajes no distingue el propósito de operación del financiero. Existe permiso audit.view en el catálogo del seed, pero no se encontró una ruta de consulta de auditoría ni una interfaz para ella.

**Pregunta concreta:** ¿qué información y acciones corresponden a cada rol, en particular a OPERATOR, ADMIN, AUDITOR, FINANCE y MESA DIRECTIVA?

**Alternativa A — Conservar los cinco roles actuales y permitir acceso de staff amplio.**
- Funcional: menor cantidad de roles por mantener.
- Operativa: operador y finanzas pueden acceder a más datos de los necesarios para sus tareas; no existe separación real de auditoría independiente ni vista propia de mesa directiva.
- Técnica: no resuelve la ausencia de consulta de auditoría ni el aislamiento por organización. No debe interpretarse como autorización para mantener exposiciones de datos inseguras.
- Documentos/módulos afectados: documento 04, seed de roles/permisos, controladores/servicio de viajes y cualquier futura interfaz administrativa.

**Alternativa B — Separación de privilegios y roles explícitos.**
- Funcional: cada rol ve únicamente la superficie que necesita.
- Operativa: requiere acordar quién opera, quién investiga incidentes y qué reportes recibe la dirección.
- Técnica: hay que definir permisos atómicos, aplicar aislamiento por organización y añadir una consulta de auditoría de solo lectura con pruebas negativas.
- Documentos/módulos afectados: documentos 01 y 04, seed, esquema/catálogo RBAC, módulo trips, módulo audit, contrato API y superficies de despacho/administración/finanzas.

**Matriz propuesta para debatir (no aprobada):**

| Rol | Viajes y operación | Auditoría | Finanzas |
|---|---|---|---|
| Pasajero | Solo sus propios viajes y datos mínimos del conductor/unidad asignados | No | No |
| Conductor | Solo viajes asignados o propios, y acciones propias permitidas | No, salvo vista limitada de sus propias acciones si se aprueba | No |
| Operador/despachador | Viajes de la organización y zona del piloto que necesita atender; asignación/reasignación según permiso | Solo el registro de acciones necesario para atender un incidente; no exploración general por defecto | No |
| Administrador operativo | Alta/baja y configuración autorizada; el acceso a viajes no debe ser universal por defecto | Acceso excepcional o permiso separado, sujeto a aprobación | No por defecto |
| Auditor | Lectura de viajes, eventos, alertas y registros de auditoría necesarios para revisión; sin mutaciones | Solo lectura, con registro del propio acceso y minimización de datos personales | Solo los campos necesarios para conciliar una investigación autorizada |
| Finanzas | Sin despacho ni seguimiento GPS en vivo; acceso a la referencia del viaje cuando sea indispensable para conciliación | Solo evidencia pertinente para conciliación/autorización | Pagos declarados, comisiones y liquidaciones según permiso |
| Mesa directiva | Métricas agregadas y alertas de operación; acceso a un viaje individual solo con motivo y autorización | Resumen de controles o informe autorizado; no acceso irrestricto por ser dirección | Resumen financiero agregado; datos detallados según autorización explícita |

**Alternativa B implementada en esta rama:** separar AUDITOR de administración, limitar FINANCE y exponer a BOARD un resumen agregado, no acceso irrestricto a ubicación o expedientes.

**Decisión humana requerida:** aprobar, ajustar o rechazar la matriz; indicar si la nomenclatura será AUDITOR y BOARD/MESA_DIRECTIVA; nombrar quién autoriza accesos excepcionales.

### D0-03 — ¿Cómo se dan de alta y cuándo se consideran validados pasajero, conductor y vehículo?

**Confirmado en el código/esquema revisado:** existen las tablas users, passenger_profiles, driver_profiles, driver_documents, vehicles, vehicle_documents y asignaciones conductor-vehículo. Los documentos tienen un indicador verified y fecha de expiración, pero no se halló un flujo completo de alta/validación por API para los tres tipos. El controlador de usuarios expone identidad propia y una ruta de ejemplo de listado; el módulo de vehículos no muestra controlador de alta en la estructura revisada.

**Pregunta concreta:** ¿el registro será por invitación/alta interna, auto-registro pendiente de aprobación o una interfaz administrativa? ¿Qué verificaciones autorizan a una persona y a una unidad a operar?

**Alternativa A — Alta controlada por personal de la organización, sin auto-registro público.**
- Funcional: solo pueden entrar personas previamente autorizadas.
- Operativa: más trabajo manual; exige un procedimiento seguro, responsable de aprobación y evidencia de quién dio el alta.
- Técnica: puede iniciarse con un procedimiento operativo controlado, sin seeds en ambientes compartidos; la carencia de endpoints y de interfaz debe quedar documentada y no ocultarse.
- Documentos/módulos afectados: documento 03 sección 3, documento 04, usuarios/pasajeros/conductores/vehículos, RBAC y auditoría.

**Alternativa B — Auto-registro con estado pendiente hasta aprobación.**
- Funcional: el solicitante puede aportar datos/documentos pero no operar antes de ser autorizado.
- Operativa: requiere revisión de solicitudes, prevención de registros fraudulentos y un flujo de rechazo/corrección.
- Técnica: necesita estados de aprobación, endpoints, validaciones y pruebas; no puede derivarse únicamente de users.status.
- Documentos/módulos afectados: documentos 01, 03 y 04, esquema de perfiles/documentos, módulos de usuarios/pasajeros/conductores/vehículos y contrato API.

**Alternativa C — Alta mediante interfaz administrativa restringida.**
- Funcional: personal autorizado crea perfiles y revisa documentos dentro del sistema.
- Operativa: ofrece trazabilidad más clara, pero requiere capacitación y soporte de la interfaz.
- Técnica: exige CRUD mínimo, permisos específicos, auditoría, validación de documentos vencidos y pruebas de estados.
- Documentos/módulos afectados: documentos 03 y 04, módulos de usuarios/pasajeros/conductores/vehículos, esquema, contrato API y pruebas E2E.

**Definición que debe aprobarse para “validado”:** propuesta mínima para debatir: pasajero con perfil/contacto requerido completos; conductor con identidad/licencia y documentos requeridos revisados y vigentes; vehículo con documentos requeridos revisados y vigentes, estado operativo permitido y asociación activa a un conductor; cuenta activa en la organización del piloto; aprobación registrada por un responsable. Los tipos documentales exactos, la comprobación de identidad/contacto y el responsable de cada verificación siguen pendientes.

**Alternativa A implementada en esta rama:** alta interna y auditable sin auto-registro público. Un documento registrado no se considera verificado; faltan los tipos documentales requeridos que operaciones debe configurar.

**Decisión humana requerida:** A, B o C; lista exacta de documentos y criterios de vigencia; responsable que aprueba; tratamiento de rechazo, expiración, suspensión y cambio de vehículo.

### D0-04 — ¿Qué roles pueden cancelar, en qué estados y con qué consecuencias?

**Confirmado en el código revisado:** la especificación 02 limita la cancelación al periodo previo a iniciar el viaje. El servicio admite estados desde REQUESTED/PENDING_REVIEW/QUOTED/SEARCHING_DRIVER hasta DRIVER_ASSIGNED, DRIVER_EN_ROUTE y DRIVER_ARRIVED. El DTO recibe cancelledBy del cliente y el servicio lo usa para determinar CANCELLED_BY_PASSENGER, CANCELLED_BY_DRIVER o CANCELLED_BY_SYSTEM; en ese método no se ve una validación de que el tipo coincida con el usuario autenticado ni una validación de propiedad del viaje antes de mutarlo. Si había conductor asignado, se libera.

**Pregunta concreta:** ¿hasta qué momento puede cancelar pasajero o conductor, qué motivo se exige y cuándo debe intervenir despacho?

**Alternativa A — Política uniforme: cualquier actor autenticado puede cancelar cualquier viaje antes del inicio.**
- Funcional: simple, pero permite atribución incorrecta y cancelación de viajes ajenos si no se corrige la autorización.
- Operativa: responsabilidades y métricas de cancelación poco fiables.
- Técnica: no aceptable sin controles de propiedad, rol y organización; la sencillez no elimina la brecha de seguridad.
- Documentos/módulos afectados: documentos 02 y 04, CancelTripDto, TripsService, contrato OpenAPI y pruebas de autorización.

**Alternativa B — Reglas por actor y estado, derivadas en backend.**
- Funcional: pasajero cancela antes de la fase límite aprobada; conductor solo su viaje asignado antes de iniciar; operador puede resolver cancelaciones operativas previas al inicio; sistema solo cancela bajo causas automatizadas documentadas.
- Operativa: requiere catálogo de motivos, guía de atención y reglas de liberación/reasignación del conductor.
- Técnica: el backend debe derivar el actor desde la sesión/permisos, verificar que el usuario participe en el viaje y que pertenezca a la organización; el cliente no decide el actor de auditoría. Pruebas por cada rol/estado, denegaciones y consistencia de trip_events son obligatorias.
- Documentos/módulos afectados: documentos 02 y 04, DTO y servicio de viajes, RBAC, despacho, OpenAPI, auditoría y pruebas automatizadas.

**Límite posterior al inicio:** decidir si se prohíbe la cancelación normal después de TRIP_IN_PROGRESS y se usa un flujo separado de incidente/disputa, o si existe una excepción de seguridad controlada. El código y la especificación actual describen que un viaje iniciado no se cancela mediante este endpoint.

**Alternativa B implementada en esta rama:** actor derivado del JWT, participación, rol, organización, estados previos al inicio y motivo comprobados. No se añade penalización o excepción no documentada.

**Decisión humana requerida:** aprobar límites exactos por rol/estado, catálogo de motivos, si se penalizan cancelaciones y quién puede resolver excepciones.

### D0-05 — ¿Cuál es el protocolo del botón de pánico?

**Confirmado en documentos y código revisado:** el plan 04 exige una alerta prioritaria de pasajero y conductor, registro auditable y atención desde despacho. No se encontró un endpoint de pánico, una tabla/entidad dedicada ni un flujo de acuse, escalamiento y cierre en el contrato API, esquema o módulos listados.

**Pregunta concreta:** ¿quién recibe la alerta, en cuánto tiempo debe acusarla, quién escala y quién puede cerrar el incidente?

**Alternativa A — Alerta interna a despacho, sin temporizador de escalamiento definido.**
- Funcional: el evento aparece en una cola prioritaria.
- Operativa: depende de supervisión continua; una alerta puede quedarse sin atender cuando el operador se ausente o se sature.
- Técnica: el estado de alerta y la auditoría deben existir aunque no haya un SLA de escalamiento.
- Documentos/módulos afectados: documentos 03 y 04, contrato API, esquema y futuros módulos de incidentes/notificaciones y panel de despacho.

**Alternativa B — Protocolo con acuse, escalamiento y cierre obligatorio.**
- Funcional: cada alerta tiene estado, responsable, marcas de tiempo y resultado; se identifica si la activó pasajero o conductor y se conserva la última ubicación disponible con su antigüedad.
- Operativa: requiere responsable de turno, suplente, canal de contacto y procedimiento probado; puede generar carga adicional pero reduce alertas perdidas.
- Técnica: necesita persistencia de incidentes, permisos para acusar/escalar/cerrar, evento de auditoría append-only y pruebas E2E de ambas procedencias.
- Documentos/módulos afectados: documentos 03 y 04, esquema, OpenAPI, módulos de viajes/despacho/notificaciones/auditoría y las interfaces de pasajero/conductor/operador.

**Alternativa C — Integración automática con servicios externos de emergencia.**
- Funcional: podría activar una integración externa.
- Operativa: implica acuerdos, disponibilidad, verificación de jurisdicción, falsas alarmas y protocolo legal/organizativo.
- Técnica: necesita integración externa, seguridad y pruebas específicas; no puede presumirse disponible por el solo botón.
- Documentos/módulos afectados: los de la alternativa B, además de infraestructura, privacidad, seguridad y contratos externos aplicables.

**Propuesta de protocolo para debatir:** B. Acuse por el operador; si no hay acuse dentro del umbral aprobado, escalamiento al supervisor de turno; intento de contacto con la persona y registro del resultado; cierre por responsable autorizado con motivo obligatorio y rastro de auditoría. El responsable humano decidirá si contacta servicios públicos de emergencia. No realizar llamadas automáticas ni prometer respuesta de emergencia sin una integración y operación aprobadas.

**Alternativa B implementada en esta rama:** estado persistente, acuse, escalamiento y cierre auditado; tiempos/responsables siguen pendientes y no se inventan temporizadores.

**Decisión humana requerida:** responsables primario y suplente; tiempos de acuse/escalamiento; canal de contacto; criterio de cierre; contacto con emergencia externa; retención y visibilidad de ubicación/datos sensibles.

### D0-06 — ¿Dónde, cuándo, con qué plataformas y con qué grupo se abre el piloto?

**Confirmado en documentos:** los fundamentos técnicos describen una construcción de 50 a 100 unidades; el plan 04 plantea un grupo nominal pequeño en una zona acotada de Huauchinango. El Paso 8 deja pendientes los polígonos y horarios reales. El plan admite web móvil/PWA o app existente, y exige pruebas con dispositivos físicos. La rama remota inspeccionada corresponde a un backend: no se identificó en su raíz una app de pasajero, conductor o despacho.

**Pregunta concreta:** ¿cuál es la zona geográfica exacta, el horario operativo, la plataforma real que usarán los participantes y el tamaño nominal del grupo inicial?

**Alternativa A — Piloto pequeño, una zona y turnos supervisados.**
- Funcional: limita el servicio a cobertura y estados operables; las solicitudes fuera de zona se rechazan o se derivan según regla aprobada.
- Operativa: facilita la atención directa y la medición; necesita mapa/polígono, calendario y lista nominal.
- Técnica: carga únicamente la zona y configuración aprobadas; la prueba debe cubrir límites geográficos, horario, GPS y desconexión.
- Documentos/módulos afectados: documentos 01, 03 y 04, service_zones, fare_rules/fare_schedules/configuration, interfaces y E2E.

**Alternativa B — Cobertura municipal amplia y operación extendida.**
- Funcional: más origen/destino y más solicitudes, incluidos bordes y zonas con poca densidad de conductores.
- Operativa: exige más unidades, soporte y cobertura efectiva por turno.
- Técnica: requiere un polígono amplio validado, reglas de tarifa y pruebas geográficas más extensas; aumenta el riesgo de solicitudes sin conductor elegible.
- Documentos/módulos afectados: documentos 01, 03 y 04, configuración geoespacial/tarifaria, despacho, GPS y pruebas E2E.

**Alternativas de plataforma:**
- PWA/web móvil para pasajero y conductor más panel web: menor barrera inicial, pero el GPS en segundo plano y las limitaciones de navegador/OS deben comprobarse; no dar por cumplido el seguimiento si solo funciona con la pantalla abierta.
- Apps nativas o cliente móvil existente para el conductor: puede facilitar GPS persistente, pero necesita artefactos reales, versiones y dispositivos verificables.
- Operación temporal más supervisada con despacho manual: reduce dependencias de automatización, pero no sustituye las pruebas de GPS y asignación exigidas si esas funciones son parte del piloto.

**Alternativa A seleccionada:** piloto pequeño, zona delimitada y turnos supervisados. Polígono, horario, dispositivos, plataforma, y grupo nominal continúan pendientes de definición operativa.

**Propuesta de tamaño inicial no aprobada:** 5–10 conductores y 10–20 pasajeros conocidos, con un operador por turno y lista nominal; es una propuesta conservadora para discutir, no sustituye el rango histórico de 50–100 unidades ni lo cambia silenciosamente.

**Decisión humana requerida:** dibujar/aprobar zona, días y horas, lista nominal, número de conductores/pasajeros, dispositivos/OS soportados, plataforma concreta de cada rol y tratamiento de peticiones fuera de zona/horario.

### D0-07 — ¿Quién asume operaciones, soporte, auditoría, seguridad y go/no-go?

**Confirmado en documentos:** el Paso 8 exige soporte, responsable de auditoría, operador capacitado y checklist de go/no-go, pero la documentación revisada no asigna responsables nominales ni suplencias.

**Pregunta concreta:** ¿qué persona (y quién la cubre) será responsable de cada función y quién tendrá la autoridad final para detener o autorizar el piloto?

**Alternativa A — Responsabilidad compartida sin una única autoridad final.**
- Funcional/operativa: decisiones pueden demorarse o quedar sin dueño cuando haya un incidente o evidencia inconclusa.
- Técnica: el checklist puede quedar marcado sin un responsable único que acepte el riesgo.
- Documentos afectados: documentos 03 y 04, runbook y checklist de apertura.

**Alternativa B — Propietarios y suplentes nominales, con un único responsable final de go/no-go.**
- Operaciones: responsable de turno y despacho; define horario, flota y procedimiento.
- Soporte técnico: atiende API, conectividad, dispositivos y recuperación; tiene canal de guardia.
- Auditoría: persona independiente del operador de despacho, con acceso de solo lectura y rutina de revisión.
- Seguridad/pánico: responsable primario y suplente de escalamiento de incidentes.
- Go/no-go: una única persona designada por la organización, que acepta la evidencia y puede suspender el piloto.
- Técnica: el checklist incluye nombre/función, evidencia, fecha y aprobación de cada dueño; un bloqueo P0/P1 pendiente implica no abrir.
- Documentos afectados: documentos 03 y 04, registro de incidentes, permisos RBAC, runbook y checklist de evidencia.

**Alternativa B seleccionada:** responsables y suplentes por función y una autoridad final de go/no-go; faltan nombres/titulares, canales y turnos concretos. BOARD no recibe acceso irrestricto.

**Decisión humana requerida:** asignar nombre o titular del puesto, suplente, horario de cobertura, canal de soporte, responsable de incidentes y autoridad final para cada función.

## 3. Brechas técnicas que no son decisiones de negocio

Estos puntos requieren corrección o evidencia antes de dar por satisfecho el gate técnico; registrarlos no autoriza cambiar el alcance comercial.

| ID | Hallazgo en la base revisada | Consecuencia / evidencia que se necesita | Documentos y módulos afectados |
|---|---|---|---|
| T0-01 | Las consultas de staff en trips no aplican un filtro visible por organizationId; la lectura individual trata los roles OPERATOR/ADMIN/FINANCE como acceso global. | Riesgo de aislamiento entre organizaciones. Añadir pruebas negativas cross-organization en lista, detalle y mutaciones; no abrir con este bloqueo. | Plan 04, matriz de trazabilidad, TripsService, RBAC, pruebas de integración |
| T0-02 | La cancelación confía en cancelledBy enviado por el cliente y no valida claramente propiedad/participación y organización en el método revisado. | Riesgo de cancelar viajes ajenos o atribuir falsamente al actor. Derivar actor del token y probar permiso/estado/organización. | Documento 02 ticket 7.18, TripsService, DTO, OpenAPI y pruebas |
| T0-03 | No se encontró modelo/endpoint/flujo específico de pánico. | El criterio PANIC del plan 04 no tiene evidencia implementada. Definir protocolo y luego añadir persistencia, permisos, interfaz y pruebas. | Plan 04, esquema, API y módulos de despacho/notificaciones/auditoría |
| T0-04 | No aparecen roles separados AUDITOR/MESA_DIRECTIVA ni consulta API de audit_logs. | No puede afirmarse que exista auditoría consultable de solo lectura y segregación por rol. | Seed, RBAC, módulo audit, OpenAPI, plan 04 |
| T0-05 | No se encontraron interfaces completas de alta/validación para pasajero, conductor y vehículo. | No se puede afirmar que una cuenta o vehículo pueda autorizarse de principio a fin desde una interfaz. | Usuarios, pasajeros, conductores, vehículos, API y documento 03 |
| T0-06 | La especificación enumera TRIP_COMPLETED y otros estados; el flujo descrito en Paso 7 lleva la finalización a PAYMENT_PENDING. | Confirmar y documentar el significado del estado final en función de D0-01; las transiciones deben tener una única fuente de verdad. | Documentos 01/02/03/04, schema.sql, OpenAPI y trips |
| T0-07 | No existe AGENTS.md ni docs/MASTER_PLAN_TRACEABILITY.md en la rama main revisada. | Falta una instrucción local de agente y la matriz pedida; este Paso 0 incorpora la matriz en la rama de trabajo, sin afirmar que ya existiera. | Raíz/documentación del repositorio |
| T0-08 | El Paso 8 dice que el alta real es manual y que no hay panel admin, mientras el plan 04 exige superficies mínimas de alta/validación antes de abrir. | Elegir el procedimiento en D0-03 y exigir evidencia E2E de alta antes de la apertura. | Documentos 03/04, alta de perfiles y checklist |

## 4. Gate de aprobación solicitado

Responder explícitamente a D0-01 a D0-07, aceptando la recomendación, eligiendo una alternativa o describiendo una alternativa propia. Las decisiones no contestadas se mantienen pendientes; no se inferirá aprobación por silencio.

Antes de autorizar el Paso 1 deben registrarse:
1. la decisión humana y su responsable;
2. los documentos/API/módulos que cambia;
3. los criterios de aceptación derivados, sin cambiar lógica de pagos ni agregar cobros reales;
4. las pruebas de autorización, aislamiento por organización, cancelación y pánico que demostrarán cada cambio;
5. la evidencia de ejecución y la revisión del checklist go/no-go.

**Estado del Paso 0:** alternativas autorizadas para implementación y cambios documentales/código en rama aislada; configuración, pruebas, migración y detalles operativos pendientes. Paso 1 y go/no-go siguen bloqueados.


## Control de activación después de un viaje


- **Reingreso del conductor a disponibilidad:** tras completar o cancelar un viaje asignado, el backend vuelve a poner al conductor en `AVAILABLE` únicamente si tiene una asignación activa a vehículo activo de la misma organización y ambos cumplen las políticas documentales configuradas. Si falta configuración/documentación o está vencida, queda `OFFLINE` y debe volver a pasar por la validación. Así se evita que completar/cancelar un viaje omita el gate de D0-03.
- **Pruebas añadidas pero no ejecutadas:** política de lectura/cancelación de viaje, saneamiento de auditoría, política documental, servicio de pánico, alta interna y agregados de mesa directiva. No se afirma resultado verde sin ejecución.
