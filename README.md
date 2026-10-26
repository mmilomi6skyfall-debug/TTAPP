# TTAPP — Sistema integral de gestión de taxis

**Objetivo definitivo del producto:** construir un ecosistema digital integral para la operación de taxis de Huauchinango, Puebla, conectado a un backend común y compuesto por cuatro superficies: (1) consola web de la Junta Administrativa, (2) cabina web de despacho, (3) aplicación móvil del pasajero y (4) aplicación móvil del conductor. **Las dos aplicaciones móviles deben ser compatibles con Android e iOS.**

El núcleo del repositorio es el backend NestJS, sus contratos, pruebas y herramientas. También incluye prototipos web estáticos iniciales en `web-panels/` para la Junta Administrativa y la Cabina de Despacho; no están conectados al backend ni tienen autenticación o persistencia. La descripción del ecosistema es el objetivo de producto y de arquitectura; no significa que las cuatro interfaces estén terminadas. Cada superficie y cada flujo se considera implementado solo cuando existe código verificable y evidencia de pruebas.

El documento rector es [`docs/PRODUCT_OBJECTIVE.md`](docs/PRODUCT_OBJECTIVE.md). Define el alcance final, las responsabilidades de las cuatro interfaces, los principios de arquitectura, el orden de entrega y las condiciones para autorizar el piloto. Los planes y PR futuros deben alinearse con él o documentar explícitamente una excepción aprobada.

## Componentes del ecosistema

- **Junta Administrativa (web):** administración organizacional, cuentas y permisos, tarifas, comisiones e ingresos, reportes y auditoría. Recibe alertas de pánico del pasajero y del conductor; la información sensible se limita por permisos.
- **Cabina de despacho (web):** mapa y estado de la flota, solicitudes, asignación y seguimiento de viajes, frescura de GPS, incidencias y atención de alertas de pánico. No es el panel financiero de la Junta Administrativa.
- **Pasajero (Android e iOS):** registro y perfil según la política de alta aprobada, solicitud de servicio, estimaciones cuando existan datos válidos, información del taxi/conductor asignado, seguimiento, estados e historial, cancelación permitida y botón de pánico.
- **Conductor (Android e iOS):** disponibilidad, recepción y respuesta a servicios, navegación, actualización de estados, GPS con controles de vigencia, historial operativo y botón de pánico.

Las cuatro superficies deben consumir servicios y reglas de negocio comunes. Un viaje, sus asignaciones, los estados, la ubicación y las alertas deben tener una fuente de verdad del lado servidor; ninguna interfaz puede saltarse permisos o reglas del backend.

## Estado y límites del repositorio

- Backend actual: NestJS, TypeScript y API descrita en `api/openapi.yaml`.
- Prototipos web: [`web-panels/README.md`](web-panels/README.md) explica cómo abrirlos y sus límites. El mapa de Junta Administrativa usa cartografía real de OpenStreetMap, pero sus marcadores, viajes, conductores, ingresos y alertas son datos ficticios.
- Persistencia prevista por la configuración existente: PostgreSQL con PostGIS y Redis para los servicios que lo requieran.
- La compatibilidad Android/iOS es un requisito del producto. La tecnología móvil y el destino de despliegue deben decidirse y documentarse a partir de la inspección técnica; no se presupone Flutter, React Native, Expo ni una nube determinada.
- No se considera verificada la integración extremo a extremo real con base de datos, Redis y dispositivos por el mero hecho de aprobar pruebas unitarias o un smoke test aislado.
- TTAPP es un proyecto independiente. No depende de Hermes ni debe reutilizar sus VM, servicios, credenciales o despliegues por suposición.
- No hay autorización implícita para ejecutar migraciones, seeds, acceder a datos compartidos o desplegar a producción.

## Requisitos

- Node.js 20 LTS o 22 LTS y npm compatible.
- PostgreSQL 16 + PostGIS y Redis para ejecutar la API integrada.
- Unit tests, lint y smoke E2E aislado no requieren servicios externos.

## Instalación y gates

```bash
npm ci
npm run build
npm run lint
npm run test:unit
npm run test:e2e
npm run lint:openapi
npm audit
npm audit --omit=dev
```

- `npm ci` instala desde `package-lock.json`; no usar `npm install --legacy-peer-deps` en CI.
- `npm run lint` no modifica archivos; `npm run lint:fix` sí los reescribe.
- `npm run test:e2e` es un smoke test HTTP aislado Nest/Supertest, no E2E de viaje con PostgreSQL/PostGIS, Redis y dispositivos.
- `npm run lint:openapi` valida `api/openapi.yaml` con Redocly.
- Revisar advisories de npm; no ejecutar `npm audit fix --force`. Cambios mayores requieren revisión de compatibilidad, build y regresión.

## Variables de entorno y secretos

1. Copia `.env.example` a `.env.development` localmente y reemplaza marcadores por valores locales.
2. Inyecta secretos de staging/producción desde el gestor de secretos de la plataforma; no los guardes en Git, issues ni logs.
3. Variables principales: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`; el seed requiere además `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
4. No se ha confirmado rotación de secretos históricos. Si un valor real estuvo en Git, el responsable debe rotarlo y revisar el historial.

Los archivos reales `.env.development`, `.env.test`, `.env.staging` y `.env.production` figuran como rastreados en esta rama. El ignore no deja de rastrear archivos ya versionados. Esta sesión no puede comprobar cambios locales sin confirmar, por lo que no los elimina automáticamente. Después de revisar `git status --short -- .env*` y preservar cualquier cambio, ejecuta `bash scripts/untrack-env-files.sh` en un checkout local. El script aborta si detecta cambios staged/unstaged y usa `git rm --cached` para conservar las copias locales. Revisa el diff antes de confirmar. Mantén `.env.example` como plantilla sin secretos.

## Seeds locales únicamente

- `npm run seed`: requiere `NODE_ENV=development` o `test`, correo explícito y contraseña de al menos 16 caracteres no placeholder.
- `npm run seed:pilot-data`: usa tarifas/zona de ejemplo y requiere `NODE_ENV=development` y `SEED_ALLOW_PLACEHOLDER_DATA=true`.
- Ambos bloquean staging/producción. No ejecutar seeds en bases compartidas o reales; las guardas no sustituyen permisos de DB.

## Arranque

Configura variables locales y prepara manualmente una base desechable antes de `npm run start:dev`. TypeORM debe mantener `synchronize: false`; las migraciones se administran externamente.

## CI y alcance

CI debe ejecutar instalación desde lockfile, build, lint, unit tests, smoke E2E aislado, OpenAPI y auditoría de dependencias. Un gate de seguridad fallido debe permanecer visible. Esta fase estabiliza el backend; no demuestra por sí sola que las consolas web y aplicaciones móviles estén terminadas ni autoriza el piloto.
