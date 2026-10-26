# Paneles web TTAPP (prototipos)

Estos paneles son interfaces estáticas para revisión funcional y visual. No forman todavía una aplicación web productiva ni sustituyen al backend NestJS.

## Archivos

- `index.html`: punto de entrada a los paneles.
- `board/index.html`: Junta Administrativa; incluye cartografía real de OpenStreetMap y marcadores de flota ficticios.
- `dispatch/index.html`: Cabina de Despacho; solicitudes, unidades y alertas de prueba.

## Ejecutar localmente

Desde la raíz del repositorio, inicia un servidor estático:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080/web-panels/` en el navegador. También puede usarse Live Server de VS Code si está instalado.

## Límites actuales

- Los viajes, conductores, unidades, ingresos, alertas y registros de actividad son datos ficticios. Los cambios que hacen los botones solo afectan la memoria de la página.
- El mapa administrativo obtiene sus teselas de OpenStreetMap por Internet, pero la ubicación de los marcadores no es GPS real.
- La cabina de despacho conserva un mapa ilustrativo, no una cartografía conectada.
- No hay inicio de sesión, autorización por roles, API, base de datos, auditoría persistente ni integración con PostgreSQL/PostGIS o Redis.
- Los gráficos y cifras no deben utilizarse para decisiones financieras u operativas.
- Los paneles dependen de recursos CDN externos (Tailwind, Chart.js, Lucide, Leaflet y fuentes web); sin Internet, algunas funciones o estilos no cargarán.

## Condición antes de producción

Integrar los componentes con la API autorizada, imponer permisos del lado servidor, consumir datos reales validados, persistir las acciones críticas en auditoría y agregar pruebas automatizadas de interfaz y de integración. La aprobación operativa del piloto es independiente de que estos prototipos se visualicen correctamente.

La lógica de pagos no forma parte de estos prototipos y no debe modificarse como parte de su integración visual.
## Validación automatizada

El workflow `.github/workflows/validate-web-panels.yml` ejecuta `node scripts/validate-web-panels.mjs` cuando se modifican los paneles o el validador. Comprueba la estructura HTML básica, la sintaxis de JavaScript inline, enlaces locales y los avisos/capa cartográfica previstos. No sustituye una prueba visual en navegador ni una prueba de integración.
