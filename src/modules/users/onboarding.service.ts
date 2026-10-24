import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PassengerProfile } from '../passengers/entities/passenger-profile.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { DriverStatus } from '../../common/enums';
@Injectable()
export class OnboardingService {
 constructor(@InjectDataSource() private readonly db:DataSource,private readonly audit:AuditService){}
 private async assertContactFree(email?:string,phone?:string){
  if(!email&&!phone)throw new BadRequestException('Se requiere email o teléfono');
  const rows=await this.db.query('SELECT id FROM users WHERE ($1::text IS NOT NULL AND email=$1) OR ($2::text IS NOT NULL AND phone=$2) LIMIT 1',[email??null,phone??null]);
  if(rows.length)throw new ConflictException('El email o teléfono ya está registrado');
 }
 async createPassenger(dto:CreatePassengerDto,actor:AuthenticatedUser){
  if(!actor.permissions.includes('users.manage'))throw new ForbiddenException('Requiere users.manage');
  await this.assertContactFree(dto.email,dto.phone);
  const passwordHash=await bcrypt.hash(dto.password,10);
  const result=await this.db.transaction(async m=>{
   const roles=m.getRepository(Role),users=m.getRepository(User),profiles=m.getRepository(PassengerProfile);
   const role=await roles.findOne({where:{code:'PASSENGER'}});if(!role)throw new ConflictException('El rol PASSENGER no está configurado');
   const saved=await users.save(users.create({organization:{id:actor.organizationId} as any,role,email:dto.email??null,phone:dto.phone??null,passwordHash,status:'ACTIVE' as any}));
   await profiles.save(profiles.create({userId:saved.id,fullName:dto.fullName.trim()}));
   return {id:saved.id,status:saved.status};
  });
  await this.audit.record({actorUserId:actor.id,organizationId:actor.organizationId,action:'onboarding.passenger.created',entity:'users',entityId:result.id,newValue:{role:'PASSENGER',status:result.status}});
  return {id:result.id,role:'PASSENGER',status:result.status};
 }
 async createDriver(dto:CreateDriverDto,actor:AuthenticatedUser){
  if(!actor.permissions.includes('users.manage')||!actor.permissions.includes('drivers.manage'))throw new ForbiddenException('Requiere users.manage y drivers.manage');
  await this.assertContactFree(dto.email,dto.phone);
  const passwordHash=await bcrypt.hash(dto.password,10);
  const result=await this.db.transaction(async m=>{
   const roles=m.getRepository(Role),users=m.getRepository(User),profiles=m.getRepository(DriverProfile);
   const role=await roles.findOne({where:{code:'DRIVER'}});if(!role)throw new ConflictException('El rol DRIVER no está configurado');
   const saved=await users.save(users.create({organization:{id:actor.organizationId} as any,role,email:dto.email??null,phone:dto.phone??null,passwordHash,status:'ACTIVE' as any}));
   await profiles.save(profiles.create({userId:saved.id,fullName:dto.fullName.trim(),licenseNumber:dto.licenseNumber.trim(),status:DriverStatus.OFFLINE}));
   return {id:saved.id,status:saved.status};
  });
  await this.audit.record({actorUserId:actor.id,organizationId:actor.organizationId,action:'onboarding.driver.created',entity:'users',entityId:result.id,newValue:{role:'DRIVER',driverStatus:'OFFLINE',accountStatus:result.status}});
  return {id:result.id,role:'DRIVER',status:'OFFLINE',accountStatus:result.status};
 }
}
