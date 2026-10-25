# Objetivo definitivo del producto TTAPP

**Estado del documento:** fuente rectora del objetivo de producto y arquitectura deseada.  
**Producto:** TTAPP — ecosistema integral para la gestión de un servicio de taxis.  
**Ámbito operativo inicial:** Huauchinango, Puebla. La zona exacta, horarios, unidades, responsables y fecha de apertura del piloto se deben confirmar con evidencia operativa.

## 1. Objetivo final

Construir, integrar y operar una sola plataforma de gestión de taxis compuesta por cuatro superficies conectadas:

1. **Consola web de la Junta Administrativa.**
2. **Cabina web de despacho.**
3. **Aplicación móvil del pasajero compatible con Android e iOS.**
4. **Aplicación móvil del conductor compatible con Android e iOS.**

Todas deben utilizar un backend común, una fuente de verdad de datos y reglas de negocio, permisos, auditoría y estados coherentes. La solicitud hecha por un pasajero debe poder entrar al despacho, asignarse a un conductor, seguirse durante el viaje y finalizar con un registro consistente. Las alertas e incidencias deben aparecer para las personas autorizadas y mantener trazabilidad.

Este es el objetivo final del producto aunque la implementación del repositorio hoy esté concentrada en el backend. No se afirmará que una consola o aplicación está terminada sin código, construcción ejecutable y pruebas verificables.

## 2. Las cuatro superficies y sus límites

### 2.1 Junta Administrativa — consola web

Debe permitir, conforme a permisos:

- Ver indicadores agregados de operación y actividad de la flota.
- Administrar configuración organizacional, cuentas, roles y autorizaciones.
- Consultar ingresos, comisiones, tarifas y conciliaciones autorizadas; separar las cifras reales de los datos de prueba.
- Consultar reportes y auditoría con controles de acceso, minimización de datos y registro de acciones.
- Recibir, supervisar y revisar alertas de pánico originadas por pasajeros o conductores, con su estado operativo y trazabilidad.

No debe autorizarse el acceso a información individual por el mero hecho de ser personal administrativo. Los accesos sensibles deben estar protegidos por permisos específicos.

### 2.2 Cabina de despacho — consola web

Debe permitir:

- Visualizar taxis y conductores en mapa, con estado y hora/frescura de la última posición conocida.
- Consultar solicitudes pendientes, seleccionar o asignar unidad y conductor, y ver las asignaciones activas.
- Seguir los estados del servicio y detectar asignaciones duplicadas, estados inválidos o pérdida de información.
- Administrar incidencias de despacho y atender alertas de pánico con acuse, responsable, escalamiento y cierre registrados.
- Mostrar los datos operativos necesarios sin convertir la cabina en la consola financiera de la Junta.

La ubicación debe indicar antigüedad y disponibilidad; una última posición conocida no puede presentarse como ubicación en vivo si está obsoleta.

### 2.3 Pasajero — aplicación Android e iOS

Debe ofrecer una experiencia móvil consistente en ambas plataformas, incluyendo:

- Identidad, perfil y los procesos de alta autorizados por las reglas de negocio.
- Solicitud del taxi con origen/destino y validaciones de cobertura disponibles.
- Tarifa y espera estimadas únicamente cuando haya datos y reglas suficientes; mostrar que son estimaciones.
- Información del vehículo/conductor asignado, estado del viaje y seguimiento de ubicación cuando la señal sea válida.
- Historial y detalles de viajes propios.
- Cancelación conforme a las reglas vigentes del backend.
- Botón de pánico que genere una alerta persistente y verificable, con confirmación de recepción cuando esté disponible.
- Notificaciones y permisos móviles gestionados de forma explícita, respetando las políticas de Android e iOS.

### 2.4 Conductor — aplicación Android e iOS

Debe ofrecer:

- Inicio de sesión seguro y visualización del estado de aprobación y disponibilidad.
- Cambio a disponible solo cuando el conductor, vehículo y documentación cumplan las reglas configuradas.
- Recepción de servicios, aceptación/rechazo conforme a las reglas operativas y consulta de servicio asignado.
- Navegación o acceso a la ruta, instrucciones y datos indispensables para completar el servicio.
- Transiciones controladas del viaje: llegada, inicio, finalización y demás estados aprobados.
- Envío de GPS con controles de identidad, permisos, vigencia y pertenencia a la organización.
- Historial operativo y resumen de datos permitidos al conductor.
- Botón de pánico con registro del incidente, acuse y trazabilidad.

La app debe gestionar permisos de localización de manera clara. El backend no debe aceptar que un conductor actualice la posición o el viaje de otra persona.

## 3. Backend y servicios compartidos

El backend es la autoridad para autenticar usuarios, validar permisos y organización, aplicar políticas y controlar la máquina de estados del viaje. Ninguna app ni consola debe poder saltarse esas reglas.

La implementación backend existente utiliza NestJS/TypeScript, contrato OpenAPI y está preparada para trabajar con PostgreSQL/PostGIS y Redis. La arquitectura final debe cubrir, a medida que se implementen y validen:

- Identidad, sesiones y autorización por rol y organización.
- Pasajeros, conductores, vehículos, alta controlada y verificación documental.
- Solicitudes, cotizaciones, asignaciones, viajes y cancelaciones.
- Actualizaciones oportunas de estado y posición GPS.
- Alertas de pánico, responsables de atención, acuse, escalamiento, cierre y auditoría.
- Tarifas, pagos permitidos, conciliación e informes autorizados.
- Registro auditable de operaciones sensibles y notificaciones a los destinatarios correctos.

El mecanismo de tiempo real y el proveedor de hosting deben decidirse, implementarse y probarse a partir de requisitos y configuración verificados; este documento no fija un proveedor no aprobado.

## 4. Roles y segregación funcional

Como base de diseño, con permisos mínimos y aislamiento por organización:

- **ADMIN:** configuración y administración técnica/organizacional permitida.
- **OPERATOR:** despacho, asignación y seguimiento operativo.
- **BOARD:** indicadores, finanzas e información de gestión autorizada.
- **FINANCE:** conciliación y transacciones permitidas.
- **AUDITOR:** consultas de auditoría autorizadas y de solo lectura.
- **DRIVER:** sus propios datos, ubicación, asignaciones y viajes.
- **PASSENGER:** su perfil, solicitudes, viajes y alertas.

Los nombres de rol no reemplazan una matriz de permisos. Cada endpoint y acción debe validar el permiso necesario, el ámbito organizacional y la relación del actor con el recurso. Un fallo o ausencia de permisos debe denegar por defecto.

La cabina de despacho no tendrá panel de ingresos como función principal; la información financiera corresponde a la Junta y al personal de finanzas autorizado.

## 5. Pagos y alcance del MVP

El producto puede contemplar pagos en efectivo y tarjeta, pero la implementación por fases debe respetar el flujo autorizado actualmente: conservar la confirmación manual existente y no añadir una pasarela ni nuevos cobros integrados sin aprobación explícita, diseño de conciliación, evaluación de seguridad y pruebas de regresión.

No se debe alterar la lógica de pagos como efecto colateral de cambios en viajes, despacho, interfaz o seguridad.

## 6. Requisitos transversales no negociables

- Compatibilidad funcional de las apps móviles en **Android e iOS**; no basta con que una vista web abra en el navegador del teléfono.
- Consolas web utilizables en escritorio y tablet, con controles según rol.
- Seguridad por defecto, sesiones y secretos protegidos, aislamiento entre organizaciones y validación en servidor.
- Privacidad: no filtrar datos personales, credenciales o ubicación detallada a roles no autorizados ni en auditoría/logs.
- Registro auditable de acciones importantes y decisiones sobre alertas de pánico.
- Consistencia de estados, prevención de doble asignación y tratamiento de reintentos/conectividad.
- Resiliencia razonable ante GPS ausente o antiguo; indicar explícitamente la calidad y antigüedad del dato.
- Pruebas unitarias, integración con los servicios reales, pruebas de API y pruebas de extremo a extremo de los flujos completos.
- Configuración por entorno, HTTPS, gestión segura de secretos, respaldo y restauración probados, rollback y observabilidad antes de producción.
- Versiones, instrucciones y contratos coordinados entre backend, consolas y apps.

## 7. Condición de piloto y de producción

El objetivo de producto no equivale a autorización para abrir el servicio. El piloto solo puede aprobarse después de demostrar en un ambiente autorizado y con datos operativos reales:

1. Alta, verificación y aprobación de pasajeros, conductores y vehículos.
2. Solicitud → despacho/asignación → aceptación → seguimiento → finalización/cancelación.
3. Seguridad de acceso y pruebas negativas de aislamiento entre organizaciones.
4. Actualización GPS y estados con dispositivos o simuladores fiables de Android e iOS.
5. Activación y atención de alertas de pánico en las superficies correspondientes.
6. Regresión del flujo de pago permitido, sin nuevas pasarelas no aprobadas.
7. Pruebas integradas con PostgreSQL/PostGIS, Redis y clientes reales.
8. Auditoría de dependencias, HTTPS, secretos, respaldo/restauración, rollback, soporte, capacitación y responsables designados.
9. Criterios de aceptación con evidencia, fecha y responsable; autorización go/no-go por la persona designada.

La zona exacta del piloto, horario, unidades, conductores y responsables deben venir de operaciones. No inventar valores para desbloquear una prueba o un despliegue.

## 8. Estado actual y decisiones técnicas pendientes

A la fecha de esta definición:

- Este repositorio contiene un backend NestJS y contratos/tests asociados; eso no demuestra que las cuatro superficies estén implementadas.
- Las aplicaciones móviles Android/iOS y las dos consolas web son parte del objetivo final, pero su presencia y estado deben verificarse mediante código y pruebas.
- Debe determinarse mediante inspección qué módulos ya existen, cuáles están incompletos y dónde ubicar cada cliente: en este repositorio o en repositorios versionados vinculados. La decisión no debe duplicar lógica de negocio ni separar artificialmente el sistema.
- La tecnología móvil y el hosting quedan abiertos hasta documentar la opción elegida y sus razones. No asumir Google Cloud, Hermes, Flutter, React Native, Expo u otro destino sin evidencia y decisión.
- La migración `CANCELLED_BY_USER`, seeds y despliegues deben considerarse pendientes hasta obtener evidencias verificables de ejecución contra el entorno de TTAPP correcto.
- Los seeds con datos ficticios solo pueden usarse en desarrollo/pruebas aislados. Nunca trasladar tarifas, zona, credenciales o datos de ejemplo a producción.

## 9. Regla para todo el trabajo futuro

Todo cambio debe enlazarse a un requisito de este objetivo, una historia de usuario o un criterio de aceptación. Toda función nueva debe incluir autorización, validación de estados, tratamiento de errores, pruebas y documentación del contrato cuando corresponda. No marcar un elemento como terminado por estar diseñado, documentado o tener una interfaz visual sin la lógica conectada.

**Definición de éxito final:** un pasajero puede solicitar y seguir un taxi desde una app Android o iOS; el despacho puede gestionar ese servicio desde la consola web; el conductor puede operarlo desde su app Android o iOS; y la Junta Administrativa puede supervisar operación, finanzas y seguridad desde su propia consola web, todo apoyado por un backend seguro, auditable, probado y desplegado de manera controlada.
