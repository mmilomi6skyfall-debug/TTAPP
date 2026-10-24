import { IsIn, IsOptional } from 'class-validator';
import { PanicAlertStatus } from '../entities/panic-alert.entity';
export class PanicListQueryDto { @IsOptional() @IsIn(['OPEN','ACKNOWLEDGED','ESCALATED','CLOSED']) status?:PanicAlertStatus; }
