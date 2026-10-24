# TTAPP — Backend del piloto cerrado

Backend NestJS 10. Este documento describe herramientas reproducibles; no implica autorización de despliegue ni que el E2E de negocio esté completo.

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
Configura variables locales y prepara manualmente una base desechable antes de `npm run start:dev`. TypeORM debe mantener `synchronize: false`; no se ejecutaron seeds ni migraciones en este paso.

## CI y alcance
CI debe ejecutar instalación desde lockfile, build, lint, unit tests, smoke E2E aislado, OpenAPI y auditoría de dependencias. Un gate de seguridad fallido debe permanecer visible. Esta fase estabiliza herramientas y configuración; no implementa negocio, no modifica pagos y no autoriza el piloto.
