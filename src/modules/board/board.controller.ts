import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
@Controller('board')
export class BoardController {
 constructor(@InjectDataSource() private readonly db:DataSource){}
 @RequirePermissions('board.summary.view')
 @Get('summary')
 async summary(@CurrentUser() user:AuthenticatedUser){
  const trips=await this.db.query('SELECT status,count(*)::int AS count FROM trips WHERE organization_id=$1 GROUP BY status',[user.organizationId]);
  const alerts=await this.db.query('SELECT status,count(*)::int AS count FROM panic_alerts WHERE organization_id=$1 GROUP BY status',[user.organizationId]);
  const payments=await this.db.query(`SELECT COALESCE(SUM(p.amount),0)::numeric AS amount FROM payments p JOIN trips t ON t.id=p.trip_id WHERE t.organization_id=$1 AND p.status='DRIVER_CONFIRMED'`,[user.organizationId]);
  const commissions=await this.db.query('SELECT COALESCE(SUM(c.commission_amount),0)::numeric AS amount FROM commissions c JOIN trips t ON t.id=c.trip_id WHERE t.organization_id=$1',[user.organizationId]);
  const counts=(rows:Array<{status:string,count:number}>)=>Object.fromEntries(rows.map(r=>[r.status,Number(r.count)]));
  return {tripsByStatus:counts(trips),panicAlertsByStatus:counts(alerts),manuallyConfirmedAmount:Number(payments[0]?.amount??0),accruedCommission:Number(commissions[0]?.amount??0)};
 }
}
