import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { DriverVehicleAssignment } from './entities/driver-vehicle-assignment.entity';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { AssignVehicleDto } from './dto/assign-vehicle.dto';
import { CreateDocumentDto, VerifyDocumentDto } from '../../common/dto/document.dto';
import { DocumentPolicy } from '../../common/policies/document-policy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { DriverStatus, VehicleStatus } from '../../common/enums';
@Controller('drivers')
export class DriversController {
 constructor(
  @InjectRepository(DriverProfile) private readonly drivers:Repository<DriverProfile>,
  @InjectRepository(DriverDocument) private readonly documents:Repository<DriverDocument>,
  @InjectRepository(DriverVehicleAssignment) private readonly assignments:Repository<DriverVehicleAssignment>,
  @InjectDataSource() private readonly db:DataSource,
  private readonly audit:AuditService,
 ){}

 @Patch(':driverId/status')
 async updateStatus(@Param('driverId') driverId:string,@Body() dto:UpdateDriverStatusDto,@CurrentUser() user:AuthenticatedUser){
  const driver=await this.drivers.findOne({where:{userId:driverId},relations:{user:{organization:true}}});
  if(!driver)throw new NotFoundException('Conductor no encontrado');
  const sameOrg=driver.user?.organization?.id===user.organizationId;
  const isSelf=user.role==='DRIVER'&&driverId===user.id;
  if(!sameOrg||(!isSelf&&!user.permissions.includes('drivers.manage')))throw new ForbiddenException('No puedes cambiar el estado de este conductor');
  if(dto.status===DriverStatus.AVAILABLE){
   const assignments=await this.db.query(`SELECT v.id FROM driver_vehicle_assignments a JOIN vehicles v ON v.id=a.vehicle_id
    WHERE a.driver_id=$1 AND a.active=true AND v.organization_id=$2 AND v.status=$3 LIMIT 1`,[driverId,user.organizationId,VehicleStatus.ACTIVE]);
   if(!assignments.length)throw new ForbiddenException('El conductor necesita un vehículo activo de su organización');
   const policy=new DocumentPolicy(this.db);
   await policy.assertRequiredDocuments(user.organizationId,'driver_documents','driver_id',driverId,'onboarding.driver_required_document_types');
   await policy.assertRequiredDocuments(user.organizationId,'vehicle_documents','vehicle_id',assignments[0].id,'onboarding.vehicle_required_document_types');
  }
  const becomingAvailable=dto.status===DriverStatus.AVAILABLE&&driver.status!==DriverStatus.AVAILABLE;
  driver.status=dto.status;if(becomingAvailable)driver.availableSince=new Date();
  await this.drivers.save(driver);
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.driver.status_changed',entity:'driver_profiles',entityId:driverId,newValue:{status:driver.status}});
  return {driverId,status:driver.status};
 }

 @RequirePermissions('drivers.manage')
 @Post(':driverId/documents')
 async addDocument(@Param('driverId') driverId:string,@Body() dto:CreateDocumentDto,@CurrentUser() user:AuthenticatedUser){
  const driver=await this.drivers.findOne({where:{userId:driverId},relations:{user:{organization:true}}});
  if(!driver)throw new NotFoundException('Conductor no encontrado');
  if(driver.user?.organization?.id!==user.organizationId)throw new ForbiddenException('El conductor no pertenece a tu organización');
  const doc=await this.documents.save(this.documents.create({driver,docType:dto.docType.trim(),fileUrl:dto.fileUrl,expiresAt:dto.expiresAt??null,verified:false}));
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.driver_document.created',entity:'driver_documents',entityId:doc.id,newValue:{driverId,docType:doc.docType,verified:false}});
  return {id:doc.id,driverId,docType:doc.docType,expiresAt:doc.expiresAt,verified:doc.verified};
 }

 @RequirePermissions('drivers.manage')
 @Patch(':driverId/documents/:documentId/verify')
 async verifyDocument(@Param('driverId') driverId:string,@Param('documentId') documentId:string,@Body() dto:VerifyDocumentDto,@CurrentUser() user:AuthenticatedUser){
  const doc=await this.documents.findOne({where:{id:documentId,driver:{userId:driverId}},relations:{driver:{user:{organization:true}}}});
  if(!doc)throw new NotFoundException('Documento no encontrado');
  if(doc.driver.user?.organization?.id!==user.organizationId)throw new ForbiddenException('El documento no pertenece a tu organización');
  const expirationDate = doc.expiresAt ? new Date(doc.expiresAt as any) : null;
  const today = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z');
  if (dto.verified && expirationDate && expirationDate.getTime() < today.getTime()) throw new ConflictException('No se puede verificar un documento vencido');
  doc.verified=dto.verified;await this.documents.save(doc);
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.driver_document.verified',entity:'driver_documents',entityId:doc.id,newValue:{driverId,docType:doc.docType,verified:doc.verified}});
  return {id:doc.id,docType:doc.docType,verified:doc.verified,expiresAt:doc.expiresAt};
 }

 @RequirePermissions('drivers.manage')
 @Post(':driverId/vehicle-assignments')
 async assignVehicle(@Param('driverId') driverId:string,@Body() dto:AssignVehicleDto,@CurrentUser() user:AuthenticatedUser){
  if(!user.permissions.includes('vehicles.manage'))throw new ForbiddenException('Requiere vehicles.manage');
  const driver=await this.drivers.findOne({where:{userId:driverId},relations:{user:{organization:true}}});
  if(!driver)throw new NotFoundException('Conductor no encontrado');
  if(driver.user?.organization?.id!==user.organizationId)throw new ForbiddenException('El conductor no pertenece a tu organización');
  const vehicles=await this.db.query('SELECT id FROM vehicles WHERE id=$1 AND organization_id=$2 AND status=$3 LIMIT 1',[dto.vehicleId,user.organizationId,VehicleStatus.ACTIVE]);
  if(!vehicles.length)throw new ForbiddenException('El vehículo debe estar activo y pertenecer a tu organización');
  await new DocumentPolicy(this.db).assertRequiredDocuments(user.organizationId,'vehicle_documents','vehicle_id',dto.vehicleId,'onboarding.vehicle_required_document_types');
  const saved=await this.db.transaction(async manager=>{
   await manager.query('SELECT user_id FROM driver_profiles WHERE user_id=$1 FOR UPDATE',[driverId]);
   const assignments=manager.getRepository(DriverVehicleAssignment);
   const active=await assignments.findOne({where:{driver:{userId:driverId},active:true}});
   if(active){active.active=false;active.unassignedAt=new Date();await assignments.save(active);}
   return assignments.save(assignments.create({driver:{userId:driverId} as any,vehicle:{id:dto.vehicleId} as any,active:true}));
  });
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.driver_vehicle.assigned',entity:'driver_vehicle_assignments',entityId:saved.id,newValue:{driverId,vehicleId:dto.vehicleId,active:true}});
  return {id:saved.id,driverId,vehicleId:dto.vehicleId,active:true};
 }
}
