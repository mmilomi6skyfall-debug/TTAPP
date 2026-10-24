import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { OnboardingService } from './onboarding.service';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { CreateDriverDto } from './dto/create-driver.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly onboarding: OnboardingService) {}

  @RequirePermissions('users.manage')
  @Post('passengers')
  createPassenger(@Body() dto: CreatePassengerDto, @CurrentUser() user: AuthenticatedUser) { return this.onboarding.createPassenger(dto, user); }

  @RequirePermissions('users.manage')
  @Post('drivers')
  createDriver(@Body() dto: CreateDriverDto, @CurrentUser() user: AuthenticatedUser) { return this.onboarding.createDriver(dto, user); }

  // Cualquier usuario autenticado puede ver su propia identidad — sin
  // @RequirePermissions, el unico requisito es un JWT valido.
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // Ejemplo de ruta que SI exige un permiso especifico — prueba real de
  // PermissionsGuard, no solo de autenticacion.
  @RequirePermissions('users.manage')
  @Get()
  listAll() {
    return { message: 'Si ves esto, tu rol tiene el permiso users.manage' };
  }
}
