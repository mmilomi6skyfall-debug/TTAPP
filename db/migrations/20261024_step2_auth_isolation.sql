-- Paso 2 / D0-04=A: generic cancellation status for any authenticated actor.
-- Additive only. This migration was not executed against any database.
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'CANCELLED_BY_USER';
