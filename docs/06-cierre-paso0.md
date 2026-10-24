# Cierre del Paso 0 — TTAPP

**Fecha:** 23 de octubre de 2026  
**Rama de implementación:** `implementation/approved-directions-2026-10-23`  
**Objetivo de cierre:** dejar el MVP, los roles, los flujos mínimos y la condición de apertura definidos, con evidencia de lo implementado y una lista finita de bloqueos.  
**Estado:** definición del Paso 0 cerrada; aprobación de apertura productiva NO otorgada.

## 1. Decisiones que quedan fijadas

| ID | Decisión de diseño | Criterio de aceptación |
|---|---|---|
| D0-01 | Conservar confirmación manual en efectivo o terminal propia del conductor y el cierre actual. Sin pasarela ni nuevos cobros reales. | Los cambios no modifican el módulo de pagos; los casos actuales de confirmación/cierre deben pasar regresión en CI/E2E. |
| D0-02 | Separación de privilegios: ADMIN (cuentas/configuración), OPERATOR (despacho y viajes), FINANCE (conciliación), AUDITOR (lectura de bitácora/datos permitidos), BOARD (agregados), DRIVER y PASSENGER (sus recursos). | Una llamada de una organización no lee ni altera datos de otra; permisos mínimos y denegación por defecto en pruebas. |
| D0-03 | Alta interna únicamente. Pasajero creado sin auto-registro público; conductor inicia OFFLINE; vehículo inicia INACTIVE. La verificación es humana y los tipos documentales requeridos proceden de configuración por organización. | Sin política documental configurada o sin documentos vigentes verificados, el conductor no queda AVAILABLE y el vehículo no pasa a ACTIVE. No se considera verificado el mero registro de una referencia documental. |
| D0-04 | El actor de cancelación procede de JWT. Pasajero cancela solo su viaje; conductor, solo el asignado; operador requiere `trips.cancel`. Se valida organización, estado, motivo y liberación segura del conductor. | Pruebas positivas y negativas por rol, organización, estado y motivo; no existe campo `cancelledBy` confiado al cliente. |
| D0-05 | El pánico genera registro persistente para pasajero o conductor asignado. Estados: OPEN → ACKNOWLEDGED → ESCALATED/CLOSED, con responsable, hora y notas auditadas. | La alerta y sus transiciones quedan persistidas; una alerta de otra organización no se consulta ni se modifica. No se afirma conexión a emergencias ni se automatiza un timeout no aprobado. |
| D0-06 | Piloto supervisado en la cabecera urbana de Huauchinango, Puebla, en zona acotada. No se incluyen localidades exteriores al polígono operativo aprobado. | El polígono GIS, horarios y dispositivos reales deben cargarse y probarse antes del piloto; no se inventan coordenadas o turnos en el código. |
| D0-07 | Responsabilidades funcionales: Operaciones mantiene turnos/despacho; supervisor de turno recibe/escalada pánico; Soporte gestiona incidencias de app/dispositivos; Auditoría revisa la bitácora; responsable técnico mantiene release/backups; Mesa Directiva nombra la autoridad única go/no-go. | Debe existir nombre y suplente por función, canal de contacto y disponibilidad por turno antes de activar el piloto. El rol BOARD no sustituye a la persona que firma la autorización. |

## 2. MVP incluido y excluido

**Incluido:** alta controlada, perfil pasajero/conductor, alta de vehículo y validación documental; solicitud/cotización/asignación/estados del viaje; ubicación GPS con antigüedad; despacho; botón de pánico con acuse, escalamiento y cierre auditado; cancelación por rol/estado; confirmación manual y cierre actuales; bitácora scoped por organización; resumen agregado de mesa directiva.

**Excluido de la apertura:** pasarela digital, cobros integrados nuevos, auto-registro público, operación fuera de la zona/hora autorizadas, incorporación de conductor/vehículo sin validación, respuesta automática a emergencia sin integración real, y analítica/expansión no necesarias para el piloto.

## 3. Criterios verificables de salida del Paso 0

- [x] Alternativas D0-01 a D0-07 registradas y autorizadas para implementación.
- [x] Alcance funcional y exclusiones documentados; PAY no se amplía.
- [x] Matriz inicial de permisos y responsabilidades funcionales definida.
- [x] Flujos de alta, cancelación, pánico y auditoría detallados.
- [x] Migración aditiva preparada, sin ejecutarla en un ambiente compartido.
- [x] CI propuesta en GitHub Actions para build, unit tests y lint de OpenAPI.
- [ ] Obtener resultado verde real de CI; un workflow creado no constituye evidencia hasta que finalice.
- [ ] Revisar diff final, riesgos de regresión y el contrato con una validación humana de backend/QA.
- [ ] Acordar el polígono y horario concretos, lista/tamaño del grupo, plataformas/dispositivos y contactos nominales antes del go/no-go.
- [ ] Configurar los tipos documentales de conductor y vehículo y verificar el almacenamiento controlado de documentos.
- [ ] Ejecutar pruebas de integración/E2E con PostgreSQL/PostGIS, Redis y dispositivos físicos o simuladores fiables.
- [ ] Validar backup/restore, secretos, HTTPS, rollback, capacitación, responsable de auditoría y canales de soporte antes de abrir.

## 4. Matriz mínima de pruebas de aceptación

| ID | Escenario | Resultado esperado |
|---|---|---|
| SEC-01 | Pasajero A consulta/cancela viaje de B o de otra organización | 403/404, sin mutación y sin exposición de datos. |
| SEC-02 | Conductor intenta modificar un viaje que no tiene asignado | Denegado; ningún estado cambia. |
| RBAC-01 | BOARD intenta consultar viaje individual o log sin permiso | Denegado; solo recibe el endpoint agregado autorizado. |
| ONB-01 | Alta de conductor sin tipos documentales configurados | Creación OFFLINE permitida; activación denegada. |
| ONB-02 | Documento vencido/no verificado o vehículo no activo | Conductor no puede pasar a AVAILABLE. |
| TRIP-01 | Cliente envía `cancelledBy=OPERATOR` en el cuerpo | Campo no aceptado/ignorado; actor determinado por JWT. |
| PAY-01 | Confirmación manual y cierre existentes | Igual comportamiento que antes; ninguna pasarela nueva. |
| PANIC-01 | Pasajero o conductor asignado activa pánico en viaje propio | Alerta persistida, actor correcto, hora/ubicación solo si son conocidas y disponibles. |
| PANIC-02 | Usuario de otra organización lista o cierra alerta | Denegado. |
| AUD-01 | Una solicitud mutante contiene credenciales, identificadores personales o ubicación | El payload almacenado en auditoría no expone esos valores. |
| REC-01 | Restaurar respaldo en entorno aislado y ensayar rollback | Evidencia registrada y validada antes del go/no-go. |

## 5. Bloqueos que requieren datos reales, no decisiones inventadas

1. Polígono GIS y horario del servicio: debe confirmarlos Operaciones.
2. Tamaño y nombres de conductores/vehículos del grupo inicial, con teléfonos/dispositivos probados.
3. Titular y suplente de Operaciones, Supervisor de turno, Soporte, Auditoría y Responsable técnico; nombre de quien firma go/no-go.
4. Tipos documentales aceptados, autoridad verificadora, periodo de vigencia y política de almacenamiento privado.
5. Umbrales de acuse/escalamiento de pánico y canal real de atención.
6. Resultado CI, regresión de pagos, integración/E2E, backup/restore y ensayo de despliegue/rollback.

**Conclusión:** el Paso 0 se considera cerrado en cuanto a alcance, decisiones de diseño y criterios de aceptación. Esto no implica que el código esté probado ni que el piloto esté listo para abrir. El siguiente gate solo se supera con evidencia técnica y con los datos operativos anteriores.
