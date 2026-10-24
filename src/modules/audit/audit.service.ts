import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
export interface RecordAuditParams {
  actorUserId: string | null;
  organizationId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
}
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}
  async record(params: RecordAuditParams): Promise<void> {
    let organizationId = params.organizationId ?? null;
    if (!organizationId && params.actorUserId) {
      const rows = await this.dataSource.query('SELECT organization_id FROM users WHERE id = $1 LIMIT 1', [params.actorUserId]);
      organizationId = rows[0]?.organization_id ?? null;
    }
    const log = this.logs.create({
      organizationId,
      actorUser: params.actorUserId ? ({ id: params.actorUserId } as any) : null,
      action: params.action, entity: params.entity, entityId: params.entityId,
      oldValue: params.oldValue ?? null, newValue: params.newValue ?? null,
      reason: params.reason ?? null, ipAddress: params.ipAddress ?? null,
    });
    await this.logs.save(log);
  }
  async listForOrganization(organizationId: string, requestedLimit = 50): Promise<AuditLog[]> {
    const take = Math.min(100, Math.max(1, Math.trunc(requestedLimit) || 50));
    return this.logs.find({ where: { organizationId }, order: { id: 'DESC' }, take });
  }
}
