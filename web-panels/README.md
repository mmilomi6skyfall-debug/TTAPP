# Paneles web TTAPP

Estas interfaces siguen siendo prototipos estáticos, pero la Junta Administrativa ya incluye un modo de conexión autenticada para consultar algunos recursos del backend existente. No constituyen todavía una consola web productiva ni sustituyen el backend NestJS.

## Archivos

- `index.html`: página de entrada.
- `board/index.html`: Junta Administrativa, cartografía de OpenStreetMap, modo demo y modo conectado.
- `board/board.js`: sesión, lectura de API, permisos de interfaz, renderizado seguro, alertas, auditoría, filtros y exportación.
- `dispatch/index.html`: Cabina de Despacho con datos ficticios y acciones locales de demostración.

## Ejecutar localmente

Desde la raíz del repositorio, inicia un servidor estático:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080/web-panels/`. También puede usarse Live Server de VS Code.

## Modo de demostración

El modo demo se activa al abrir la página o cerrar sesión. Sus cifras, transacciones, conductores, ubicaciones, alertas y registros de actividad son ficticios. La simulación solo mueve marcadores locales; no crea cobros, no llama al backend y no representa GPS real.

## Conexión con API existente

En la sección **Conexión segura con TTAPP**, introduce la URL base del backend, el correo y la contraseña de una cuenta autorizada. Para desarrollo puede ser `http://localhost:3000`; para una API remota debe usarse HTTPS. Si el despliegue expone un prefijo como `/v1`, inclúyelo en la URL base.

El panel usa los endpoints existentes:
- `POST /auth/login`
- `GET /board/summary` — conteo agregado por estado, importe confirmado manualmente y comisión devengada.
- `GET /panic/alerts` — lista de alertas visibles para la organización.
- `POST /panic/alerts/{alertId}/acknowledge`
- `POST /panic/alerts/{alertId}/escalate`
- `POST /panic/alerts/{alertId}/close`
- `GET /audit/logs?limit=100`

Cada recurso se consulta solo si el JWT declara el permiso correspondiente; el backend sigue siendo la autoridad y puede rechazar la petición. Los botones de alerta respetan el flujo permitido por la API: acuse, escalamiento con nota y cierre con nota. El cierre no debe confundirse con un acuse.

El token se conserva solo en memoria y se borra al cerrar sesión o recargar. No se guardan contraseña ni JWT en `localStorage` ni `sessionStorage`; las peticiones omiten cookies y no siguen redirecciones. No pegues tokens en issues, logs ni código fuente.

## Límites que todavía dependen de la API

- El contrato consultado no ofrece una lista de vehículos/taxis ni un endpoint de consulta de últimas posiciones GPS. En modo conectado, el mapa muestra solo ubicaciones asociadas a alertas autorizadas; no dibuja marcadores de taxis ficticios.
- `/board/summary` devuelve agregados, no series temporales. La gráfica por hora y la distribución por medio de pago solo se presentan como demostración; se ocultan al conectar para evitar cifras inventadas.
- `/audit/logs` no incluye el actor en el esquema de respuesta actual. El panel lo indica como no disponible en vez de atribuir la acción a una persona.
- La respuesta de alertas no incluye responsable operativo asignado ni prioridad configurada. El panel identifica ese límite; no los inventa.
- La API solo devuelve hasta 100 eventos de auditoría en esta llamada. El filtro por fecha opera sobre los eventos cargados, no sobre una consulta paginada del servidor.
- La cabina de despacho aún es solo demo: no se ha conectado a API, mapa real, GPS, asignación persistente ni datos reales.
- La autenticación no sustituye a los controles del servidor. Cualquier despliegue debe utilizar HTTPS, limitar CORS al origen del panel y validar permisos/aislamiento por organización en backend.

## Seguridad y exportación

Los valores procedentes de la API se insertan mediante nodos DOM y `textContent`, no interpolándolos en `innerHTML`. La exportación CSV escapa comillas, usa UTF-8 con BOM y neutraliza valores que podrían interpretarse como fórmulas en hojas de cálculo. Solo se exporta la vista filtrada y en modo conectado se exige `audit.view`.

## Dependencias y producción

Leaflet, Chart.js y Lucide usan versiones explícitas; OpenStreetMap mantiene la atribución visible. El panel aún usa el CDN de desarrollo de Tailwind y recursos externos. Antes de producción debe compilarse/servirse CSS local con versiones fijadas, revisar CSP y cabeceras de seguridad, decidir el proveedor cartográfico con una política/SLA apropiados y probar fallos de red. El servicio público de teselas de OpenStreetMap no es un SLA de producción.

## Validación automatizada

Ejecuta desde la raíz:

```bash
node scripts/validate-web-panels.mjs
```

El workflow `.github/workflows/validate-web-panels.yml` ejecuta esa validación en cambios relacionados. Comprueba la estructura HTML básica, sintaxis de JavaScript, enlaces locales, endpoints esperados y ciertas salvaguardas de seguridad. **No sustituye** pruebas en navegador, accesibilidad manual ni pruebas E2E contra backend.

La lógica de pagos no forma parte de los paneles y no debe modificarse para mejorar su interfaz. La aprobación operativa del piloto permanece separada del desarrollo de UI.
