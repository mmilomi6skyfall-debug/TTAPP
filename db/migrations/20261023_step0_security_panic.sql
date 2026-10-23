-- Migración aditiva para despliegues existentes. Probar en entorno aislado con backup restaurable.
-- No ejecutar automáticamente; la migración no se ha aplicado por esta rama.
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'CANCELLED_BY_OPERATOR';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE audit_logs a SET organization_id = u.organization_id
FROM users u WHERE a.actor_user_id = u.id AND a.organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs (organization_id,id DESC);
CREATE TABLE IF NOT EXISTS panic_alerts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id UUID NOT NULL REFERENCES organizations(id),
 trip_id UUID NOT NULL REFERENCES trips(id),
 triggered_by UUID NOT NULL REFERENCES users(id),
 actor_type TEXT NOT NULL CHECK (actor_type IN ('PASSENGER','DRIVER')),
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','ESCALATED','CLOSED')),
 location GEOGRAPHY(POINT,4326), location_recorded_at TIMESTAMPTZ, location_accuracy_m NUMERIC(8,2),
 acknowledged_by UUID REFERENCES users(id), acknowledged_at TIMESTAMPTZ,
 escalated_by UUID REFERENCES users(id), escalated_at TIMESTAMPTZ, escalation_note TEXT,
 closed_by UUID REFERENCES users(id), closed_at TIMESTAMPTZ, closure_note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_org_status_time ON panic_alerts (organization_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_trip ON panic_alerts (trip_id);
