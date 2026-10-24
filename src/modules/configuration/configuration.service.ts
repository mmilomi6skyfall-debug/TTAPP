import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Configuration } from './entities/configuration.entity';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { REQUIRED_DOCUMENT_TYPES, RequiredDocumentPolicyKey, UpdateRequiredDocumentsDto } from './dto/update-required-documents.dto';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration) private readonly configurations: Repository<Configuration>,
    private readonly audit: AuditService,
  ) {}

  private assertConfigurationManager(user: AuthenticatedUser) {
    if (!user.permissions.includes('configuration.manage')) {
      throw new ForbiddenException('Requiere configuration.manage');
    }
  }

  async getRequiredDocuments(user: AuthenticatedUser) {
    this.assertConfigurationManager(user);
    const rows = await this.configurations.find({
      where: { organization: { id: user.organizationId }, key: In([...REQUIRED_DOCUMENT_TYPES]) },
    });
    const values = new Map(rows.map((row) => [row.key, row.value]));
    return {
      organizationId: user.organizationId,
      driverRequiredDocumentTypes: values.get(REQUIRED_DOCUMENT_TYPES[0]) ?? null,
      vehicleRequiredDocumentTypes: values.get(REQUIRED_DOCUMENT_TYPES[1]) ?? null,
      configured: REQUIRED_DOCUMENT_TYPES.every((key) => Array.isArray(values.get(key)) && (values.get(key) as unknown[]).length > 0),
    };
  }

  async updateRequiredDocuments(dto: UpdateRequiredDocumentsDto, user: AuthenticatedUser) {
    this.assertConfigurationManager(user);
    const value = [...new Set(dto.value.map((item) => item.trim()))];
    if (value.length !== dto.value.length || value.some((item) => !item)) {
      throw new ForbiddenException('Los tipos documentales deben ser únicos y no vacíos.');
    }

    const key: RequiredDocumentPolicyKey = dto.key;
    const existing = await this.configurations.findOne({
      where: { organization: { id: user.organizationId }, key },
    });
    const previous = existing?.value ?? null;
    const entity = existing ?? this.configurations.create({
      organization: { id: user.organizationId } as any,
      key,
      updatedBy: { id: user.id } as any,
      value,
    });
    entity.value = value;
    entity.updatedBy = { id: user.id } as any;
    await this.configurations.save(entity);

    await this.audit.record({
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: 'configuration.required_documents.updated',
      entity: 'configuration',
      entityId: key,
      oldValue: previous && Array.isArray(previous) ? { value: previous as string[] } : null,
      newValue: { key, count: value.length },
    });
    return {
      organizationId: user.organizationId,
      key,
      value,
      updated: true,
    };
  }
}
