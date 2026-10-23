import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from './audit.service';
@Controller('audit')
export class AuditController {
 constructor(private readonly service: AuditService){}
 @RequirePermissions('audit.view')
 @Get('logs')
 list(@CurrentUser() user:AuthenticatedUser,@Query('limit') limit?:string){
  const parsed=limit===undefined?50:Number(limit);
  const safeLimit=Number.isFinite(parsed)?Math.min(100,Math.max(1,Math.trunc(parsed))):50;
  return this.service.listForOrganization(user.organizationId,safeLimit);
 }
}
