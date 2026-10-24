# Plan de cierre del MVP y apertura del piloto cerrado

**Repositorio:** TTAPP  
**Base revisada:** `main` en `3f13d9c229d896cc4f549ecf3283c4a0a4729865`  
**Estado:** plan de ejecución; ningún criterio se considera aprobado sin evidencia reproducible.  
**Restricción:** no cambiar lógica de pagos ni repetir la auditoría del PR #1. Por D0-01=A, se conserva exclusivamente la confirmación manual de cobro ya existente (efectivo/terminal del conductor) y el cierre actual del viaje; no se integra pasarela ni se añaden cobros reales.

## Estado del Paso 0 — decisiones seleccionadas; verificación de salida pendiente (23 de octubre de 2026)

La revisión documental y estática del repositorio remoto se ha registrado en **docs/05-registro-decisiones-paso0.md** y **docs/MASTER_PLAN_TRACEABILITY.md**.

- **Confirmado documentalmente:** el plan de este archivo excluye pagos del alcance funcional del MVP salvo compatibilidad/no regresión; la especificación del Paso 7 conserva una confirmación manual que actualmente participa en el cierre del viaje. La reconciliación queda pendiente.
- **Cerrado para diseño:** alcance de pago, separación de roles, alta interna, cancelación por rol/estado, ciclo de pánico, piloto urbano acotado y estructura de responsabilidades. Los parámetros operativos que requieren datos reales siguen como condiciones explícitas de apertura.
- **Brechas técnicas registradas:** no se hallaron en la rama revisada un flujo específico de pánico, los roles de auditoría/mesa directiva, rutas completas de alta operativa ni una matriz de trazabilidad existente. También se deben verificar y corregir, con pruebas, las restricciones por organización y por actor en lectura/cancelación de viajes.
- **Respuesta recibida para revisión (23 de octubre de 2026):** D0-01=A (mantener confirmación manual existente); D0-02=B (separación de roles); D0-03=A (alta controlada); D0-04=B (cancelación por rol/estado); D0-05=B (acuse/escalamiento/cierre de pánico); D0-06=A (zona pequeña y turnos supervisados); D0-07=B (responsables y autoridad única go/no-go).
- **Estado de la respuesta:** tras la selección inicial, el usuario ordenó implementar los cambios y solicitó completar las tareas pendientes para cerrar el Paso 0. Las alternativas se consideran autorizadas para esta rama de implementación. Esto no autoriza desplegar ni abrir el piloto.
- **Restricción de pagos:** D0-01=A no autoriza nuevos cobros reales ni una pasarela, y no permite modificar la lógica de pagos.
- **Gate:** el Paso 0 queda cerrado como definición de alcance y criterios; la implementación y validación técnica sigue en una rama aislada. No desplegar ni abrir el piloto hasta satisfacer los criterios técnicos y operativos del nuevo documento de cierre. Los documentos de los pasos 1, 7 y 8 se mantienen con addenda explícitos.

Base de la revisión de Paso 0: rama remota main, commit e7e47e38dd78152a1b5c7fdb43c29b7608640b04. Este dato describe el estado remoto inspeccionado; no equivale a una comprobación del árbol de trabajo local abierto en VS Code.


## 1. MVP y condición de apertura

### Objetivo del piloto
Validar en una zona operativa acotada de Huauchinango que una solicitud de viaje puede ser creada por un pasajero, asignada por despacho a un conductor autorizado, seguida por estados/GPS y cerrada con historial auditable.

### Roles e interfaces del piloto

| Rol | Interfaz mínima | Capacidades permitidas |
|---|---|---|
| Pasajero | Web móvil/PWA o app existente | Alta/inicio de sesión, perfil básico, origen/destino, solicitar viaje, ver estado/conductor, cancelar bajo reglas, activar pánico, consultar viajes propios |
| Conductor | Web móvil/PWA o app existente | Inicio de sesión, disponibilidad, aceptar/rechazar asignación, cambiar estados permitidos, enviar GPS durante servicio, activar pánico, consultar viajes asignados |
| Despachador | Panel web | Cola de solicitudes, mapa/ubicación, asignación manual, reasignación controlada, estado de unidades, atención de alertas y registro de acciones |
| Administrador operativo | Panel existente, acceso restringido | Alta/desactivación de cuentas, conductores, vehículos y datos de la organización; roles y permisos mínimos |
| Auditor | Acceso de solo lectura o exportación controlada | Consultar eventos de auditoría, viajes y alertas del piloto |

No se incluye en el MVP: contabilidad/finanzas ampliadas, oportunidades/expansión, analítica avanzada, automatizaciones de marketing ni push como requisito de apertura. La confirmación manual existente es una excepción explícita; su lógica permanece congelada y no se añaden cobros reales ni pasarela.

### Alcance vertical obligatorio
1. Alta/autenticación y autorización por rol/organización.
2. Alta operativa de pasajero, conductor y vehículo.
3. Crear solicitud de viaje con origen/destino y validación.
4. Asignar conductor disponible desde despacho; impedir doble asignación.
5. Transiciones de estado válidas y persistidas.
6. GPS vigente durante el viaje y visibilidad para usuarios autorizados.
7. Cancelación conforme a reglas documentadas.
8. Botón de pánico de pasajero y conductor: registrar, identificar actor/viaje/ubicación/fecha y mostrar alerta prioritaria en despacho.
9. Historial y auditoría de acciones críticas.
10. Salud de API, PostgreSQL/PostGIS y Redis.

### Condición de apertura
Abrir solo a un grupo nominal de pasajeros y conductores autorizados, en una zona y horario definidos, cuando todos los bloqueos P0/P1 estén cerrados y el checklist de este documento tenga evidencia enlazada. Una compilación correcta por sí sola no autoriza el piloto.

## 2. Criterios de aceptación automatizables

Implementar pruebas unitarias e integración en Jest/Supertest, usando base de pruebas aislada. Cada caso debe limpiar o aislar sus datos.

| ID | Criterio verificable | Evidencia/prueba requerida |
|---|---|---|
| AUTH-01 | Sin token, rutas privadas responden 401 | Prueba HTTP |
| AUTH-02 | Rol sin permiso responde 403; rol autorizado puede continuar | Pruebas HTTP por rol |
| ORG-01 | Usuario de organización A no puede leer ni modificar recursos de B | Pruebas negativas cross-organization para viajes, conductores y despacho |
| USER-01 | Alta valida campos obligatorios y duplicados | DTO + prueba de integración |
| TRIP-01 | Pasajero crea viaje con origen/destino válidos | POST + lectura persistida |
| TRIP-02 | No se crea viaje con coordenadas fuera de rango o datos incompletos | Pruebas negativas |
| TRIP-03 | Solo se permiten transiciones definidas; transición inválida devuelve 409/400 documentado | Pruebas de máquina de estados |
| DISPATCH-01 | Conductor no disponible/no autorizado no puede asignarse | Pruebas negativas |
| DISPATCH-02 | Dos solicitudes concurrentes no asignan al mismo conductor en viajes incompatibles | Prueba de concurrencia/consistencia en DB |
| GPS-01 | Posición reciente se persiste/actualiza y se entrega solo a actores autorizados | Prueba de integración PostGIS/Redis |
| GPS-02 | No se descarta la posición vigente por una ventana fija arbitraria de 5/15 minutos; la vigencia usa configuración y reglas del viaje | Prueba con reloj/datos controlados |
| PANIC-01 | Pánico de pasajero y conductor crea alerta trazable y visible para despacho | Dos pruebas HTTP + consulta |
| AUDIT-01 | Escrituras críticas generan actor, acción, recurso y fecha de auditoría | Prueba de integración |
| HEALTH-01 | Healthcheck falla si Postgres/PostGIS o Redis no están disponibles | Pruebas de salud/degradación |
| API-01 | Contrato OpenAPI coincide con rutas, códigos y DTO activos | Validación automatizada del contrato |
| SEC-01 | Producción no arranca con secretos/variables obligatorias ausentes; no se registran tokens/contraseñas | Pruebas de configuración/logs |
| REG-01 | Las pruebas de este alcance no alteran el comportamiento de pagos | Revisión de diff y regresión existente si la hay |

**Gate de backend:** `npm ci` (o el método reproducible aprobado por el lockfile), `npm run build`, `npm test -- --runInBand`, pruebas E2E reales y validación del contrato deben terminar con código 0. Corregir antes incompatibilidades de dependencias/lockfile y el objetivo `test:e2e` si apunta a una configuración inexistente. No marcar pruebas como aprobadas sin ejecutarlas.

## 3. Superficies mínimas que deben existir

- **Alta de cuentas/datos:** creación y desactivación de usuarios; perfil pasajero; registro y validación documental/operativa del conductor; vehículo asociado; organización/sucursal; permisos mínimos. Las acciones administrativas quedan auditadas.
- **Pasajero:** acceso, origen/destino, solicitar/cancelar viaje, estado y datos mínimos del conductor/unidad, seguimiento, pánico e historial propio.
- **Conductor:** acceso, estado disponible/no disponible, asignación, aceptación/rechazo, llegada, inicio/fin de viaje según estados válidos, GPS en segundo plano sujeto a permisos del dispositivo, pánico e historial propio.
- **Despacho:** cola en tiempo real o actualización controlada, asignación manual, ubicación/último GPS con hora, estado del conductor, cancelaciones, alertas de pánico con acuse y registro de resolución.
- **Seguridad transversal:** RBAC en backend (no solo ocultar botones), aislamiento por organización, validación de entradas, límites de solicitudes, auditoría y mensajes de error sin secretos.

No dar por existentes estas superficies solo porque haya módulos de dominio en el backend; verificar que estén implementadas y conectadas al contrato API.

## 4. Integración de extremo a extremo en staging

Entorno aislado y reproducible con PostgreSQL 16 + PostGIS, Redis, API, datos sintéticos de prueba y dispositivos físicos Android/iOS disponibles para el piloto.

### Escenario E2E de aceptación
1. Crear organización y usuarios de prueba con roles separados.
2. Dar de alta un vehículo y conductor elegibles.
3. Iniciar sesión como pasajero y solicitar un viaje.
4. Ver la solicitud en despacho; asignar al conductor.
5. Ver la asignación en el dispositivo del conductor; aceptar y avanzar por estados válidos.
6. Enviar posiciones GPS desde dispositivo físico; verificar actualización y permisos de lectura.
7. Activar pánico desde pasajero y conductor en pruebas separadas; verificar alerta, ubicación y auditoría en despacho.
8. Completar/cancelar según escenarios y comprobar historial consistente.
9. Repetir con usuario de otra organización y comprobar denegación de acceso.
10. Reiniciar API/Redis de forma controlada y comprobar recuperación sin estados duplicados ni viajes corruptos.

Registrar para cada ejecución: commit SHA, versión de API/app, ambiente, fecha, dispositivo/OS, pasos, resultado esperado/real, logs sin secretos y enlace a evidencia. Ejecutar también pruebas de desconexión/reconexión de red, GPS denegado, GPS desactualizado, batería restringida y sesión expirada.

## 5. Preparación del paso 8: checklist operativo

- [ ] Datos reales de piloto revisados, autorizados y minimizados; consentimiento/aviso de privacidad disponible.
- [ ] Dominio y HTTPS válidos; redirección HTTP→HTTPS; certificados y renovación comprobados.
- [ ] Secretos en gestor de secretos; fuera del repositorio, imágenes, logs y archivos de ejemplo.
- [ ] Variables de producción validadas al arrancar; CORS restringido a orígenes autorizados.
- [ ] Copia de seguridad automática de PostgreSQL, retención definida y cifrado habilitado.
- [ ] Restauración ensayada en entorno separado; evidencia de integridad y tiempo de recuperación.
- [ ] Migraciones/esquema versionados; procedimiento de rollback probado y compatible con datos.
- [ ] Monitoreo, logs estructurados, alertas de API/DB/Redis y política de retención operativos.
- [ ] Capacitación registrada para despacho, conductores y responsable de soporte; protocolo de pánico/incidentes probado.
- [ ] Responsable de auditoría designado por nombre/función; permisos de solo lectura y rutina de revisión acordados.
- [ ] Lista nominal de piloto, zona/horario, soporte y criterios de suspensión aprobados.
- [ ] Pruebas de aceptación, E2E y regresión adjuntas al checklist.

Cada casilla requiere enlace a evidencia, fecha y responsable. No utilizar datos personales reales en pruebas automatizadas.

## 6. Apertura controlada y siguiente prioridad

### Bloqueos de apertura
No abrir si existe cualquiera de estos casos: acceso cross-organization, asignación duplicada, transición de viaje inválida, GPS no confiable sin indicador de antigüedad, alerta de pánico perdida, ausencia de respaldo/restauración verificados, HTTPS/secretos incompletos o ausencia de responsable de auditoría/soporte.

### Durante el piloto
Medir únicamente lo necesario para decidir: solicitudes creadas, tiempo hasta asignación, cancelaciones y motivos, viajes completados, errores de GPS/conectividad, alertas de pánico y tiempo de atención, errores API y disponibilidad. Restringir el acceso a datos y definir retención.

### Después del piloto
Priorizar con evidencia y frecuencia de problemas:
1. Push/notificaciones si las limitaciones de actualización afectan la operación.
2. Administración ampliada.
3. Finanzas y liquidaciones (en una fase separada, sin modificar la lógica de pagos existente en este alcance).
4. Analítica y reportes.

## 7. Secuencia de implementación

1. Estabilizar dependencias/lockfile y CI; hacer reproducibles build y pruebas.
2. Completar pruebas de autorización, aislamiento de organización y configuración.
3. Implementar y probar vertical de viaje/despacho/GPS/pánico.
4. Conectar interfaces pasajero, conductor y despacho a contratos API reales.
5. Ejecutar E2E en staging con Postgres/PostGIS, Redis y dispositivos.
6. Completar preparación del paso 8 y recopilar evidencias.
7. Revisión de apertura con operaciones; abrir únicamente si el checklist está aprobado.

**Estado inicial al crear este documento:** pendiente de verificación. Este documento define el estándar; no afirma que las funciones, pruebas, dispositivos, respaldos ni controles estén ya implementados o aprobados.


## Implementación de decisiones D0 — rama aislada (23 de octubre de 2026)

El usuario indicó implementar las alternativas seleccionadas en la rama `implementation/approved-directions-2026-10-23`; los cambios no se han fusionado a `main`.

- **D0-01 A:** se conserva confirmación manual y cierre existentes; PAY no se modifica.
- **D0-02 B:** separación de roles ADMIN, OPERATOR, FINANCE, AUDITOR y BOARD; consulta de auditoría scoped por organización y resumen agregado de dirección.
- **D0-03 A:** alta interna; el conductor permanece OFFLINE y el vehículo INACTIVE hasta completar la validación configurada. Si no existen tipos documentales requeridos en configuration, la activación falla cerrada.
- **D0-04 B:** actor de cancelación derivado del JWT, verificación de rol/participación/organización y motivo obligatorio; nuevo estado CANCELLED_BY_OPERATOR.
- **D0-05 B:** alertas persistentes con acuse, escalamiento y cierre auditados. Sin temporizador ni integración externa hasta decisión operativa.
- **D0-06 A y D0-07 B:** zona, horario, plataformas, grupo nominal, titulares, suplentes y tiempos de escalamiento no se inventan y siguen bloqueando el go/no-go.

La migración SQL se preparó pero no se ejecutó. Build, pruebas, validación OpenAPI y E2E no se han ejecutado en esta sesión.


## Controles adicionales de D0-03 y estado de verificación


- **Reingreso del conductor a disponibilidad:** tras completar o cancelar un viaje asignado, el backend vuelve a poner al conductor en `AVAILABLE` únicamente si tiene una asignación activa a vehículo activo de la misma organización y ambos cumplen las políticas documentales configuradas. Si falta configuración/documentación o está vencida, queda `OFFLINE` y debe volver a pasar por la validación. Así se evita que completar/cancelar un viaje omita el gate de D0-03.
- **Pruebas añadidas pero no ejecutadas:** política de lectura/cancelación de viaje, saneamiento de auditoría, política documental, servicio de pánico, alta interna y agregados de mesa directiva. No se afirma resultado verde sin ejecución.


## Evidencia CI y cierre actual del Paso 0 — 24 de octubre de 2026 UTC

El alcance y las alternativas D0-01 a D0-07 están registrados y sus cambios principales se implementaron en la rama `implementation/approved-directions-2026-10-23`. La ejecución [GitHub Actions #40046971361](https://github.com/mmilomi6skyfall-debug/TTAPP/actions/runs/40046971361) aprobó instalación limpia, build, 6 suites/12 unit tests y lint OpenAPI.

**No está autorizado el piloto todavía.** El workflow global quedó rojo por 11 vulnerabilidades de producción reportadas por npm (4 altas, 7 moderadas, 0 críticas). No se forzó una migración mayor automáticamente; se requiere una actualización de framework/dependencias y regresión. Además, operaciones debe fijar el polígono/horario, grupo/dispositivos, responsables/suplentes y protocolo real de escalamiento. Las pruebas E2E, restauración de backup y migración de ensayo siguen pendientes.
