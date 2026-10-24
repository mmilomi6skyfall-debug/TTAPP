// Siembra minima para poder probar auth de principio a fin: una
// organizacion, el catalogo de permisos, los roles base con sus permisos,
// y un usuario ADMIN con el que hacer el primer login.
//
// Uso: npm run seed  (usa .env.development por defecto; NODE_ENV=test npm run seed para otro ambiente)
import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

const PERMISSIONS = [
  'trips.view', 'trips.manage', 'trips.review', 'trips.cancel',
  'dispatch.manual_assign', 'dispatch.offers.view', 'dispatch.candidates.view',
  'fares.edit', 'fares.publish', 'drivers.manage', 'vehicles.manage', 'users.manage',
  'finance.view', 'finance.reconcile', 'audit.view', 'panic.alerts.view',
  'panic.alerts.manage', 'board.summary.view',
];

// Separación de privilegios. PASSENGER y DRIVER actúan sobre recursos propios;
// ADMIN no hereda automáticamente acceso global a viajes, finanzas o auditoría.
const ROLES: Record<string, string[]> = {
  ADMIN: ['users.manage', 'drivers.manage', 'vehicles.manage', 'fares.edit', 'fares.publish'],
  OPERATOR: ['trips.view', 'trips.manage', 'trips.review', 'trips.cancel', 'dispatch.manual_assign', 'dispatch.candidates.view', 'fares.edit', 'panic.alerts.view', 'panic.alerts.manage'],
  FINANCE: ['finance.view', 'finance.reconcile'],
  AUDITOR: ['trips.view', 'audit.view', 'panic.alerts.view'],
  BOARD: ['board.summary.view'],
  DRIVER: ['dispatch.offers.view'],
  PASSENGER: [],
};

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@piloto.mx';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
    throw new Error('Define SEED_ADMIN_PASSWORD con al menos 16 caracteres antes de ejecutar npm run seed.');
  }
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const orgResult = await client.query(
      `INSERT INTO organizations (name)
       VALUES ('Piloto')
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
    );
    const organizationId =
      orgResult.rows[0]?.id ??
      (await client.query(`SELECT id FROM organizations WHERE name = 'Piloto' LIMIT 1`)).rows[0]
        .id;
    console.log(`organization: ${organizationId}`);

    const permissionIds: Record<string, string> = {};
    for (const code of PERMISSIONS) {
      const res = await client.query(
        `INSERT INTO permissions (code) VALUES ($1)
         ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id`,
        [code],
      );
      permissionIds[code] = res.rows[0].id;
    }
    console.log(`permisos: ${Object.keys(permissionIds).length}`);

    const roleIds: Record<string, string> = {};
    for (const [code, perms] of Object.entries(ROLES)) {
      const res = await client.query(
        `INSERT INTO roles (code, name) VALUES ($1, $1)
         ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id`,
        [code],
      );
      const roleId = res.rows[0].id;
      roleIds[code] = roleId;

      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      for (const perm of perms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permissionIds[perm]],
        );
      }
    }
    console.log(`roles: ${Object.keys(roleIds).join(', ')}`);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await client.query(
      `INSERT INTO users (organization_id, role_id, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [organizationId, roleIds.ADMIN, ADMIN_EMAIL, passwordHash],
    );
    console.log('usuario admin listo; la contraseña no se registra en logs.');

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main()
  .then(() => {
    console.log('Seed completado.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed fallo:', err);
    process.exit(1);
  });
