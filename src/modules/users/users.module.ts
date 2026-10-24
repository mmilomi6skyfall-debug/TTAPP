import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Branch } from './entities/branch.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from './entities/user.entity';
import { PassengerProfile } from '../passengers/entities/passenger-profile.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { OnboardingService } from './onboarding.service';
import { AuditModule } from '../audit/audit.module';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Branch, Role, Permission, User, PassengerProfile, DriverProfile]), AuditModule],
  controllers: [UsersController],
  providers: [OnboardingService],
  exports: [TypeOrmModule],
})
export class UsersModule {}
