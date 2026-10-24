import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { PanicService } from './panic.service';
import { PanicTriggerDto } from './dto/panic-trigger.dto';
import { PanicResolutionDto } from './dto/panic-resolution.dto';
import { PanicListQueryDto } from './dto/panic-list-query.dto';
@Controller()
export class PanicController {
 constructor(private readonly panic:PanicService){}
 @Post('trips/:tripId/panic') trigger(@Param('tripId') id:string,@Body() dto:PanicTriggerDto,@CurrentUser() user:AuthenticatedUser){return this.panic.trigger(id,user,dto);}
 @RequirePermissions('panic.alerts.view') @Get('panic/alerts') list(@Query() q:PanicListQueryDto,@CurrentUser() user:AuthenticatedUser){return this.panic.list(q,user);}
 @RequirePermissions('panic.alerts.manage') @Post('panic/alerts/:alertId/acknowledge') acknowledge(@Param('alertId') id:string,@CurrentUser() user:AuthenticatedUser){return this.panic.acknowledge(id,user);}
 @RequirePermissions('panic.alerts.manage') @Post('panic/alerts/:alertId/escalate') escalate(@Param('alertId') id:string,@Body() dto:PanicResolutionDto,@CurrentUser() user:AuthenticatedUser){return this.panic.escalate(id,dto,user);}
 @RequirePermissions('panic.alerts.manage') @Post('panic/alerts/:alertId/close') close(@Param('alertId') id:string,@Body() dto:PanicResolutionDto,@CurrentUser() user:AuthenticatedUser){return this.panic.close(id,dto,user);}
}
