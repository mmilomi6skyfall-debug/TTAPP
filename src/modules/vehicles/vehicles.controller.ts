import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { VehicleStatus } from '../../common/enums';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { CreateDocumentDto, VerifyDocumentDto } from '../../common/dto/document.dto';
import { DocumentPolicy } from '../../common/policies/document-policy';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
@Controller('vehicles')
export class VehiclesController {
 constructor(@InjectRepository(Vehicle) private readonly vehicles:Repository<Vehicle>,@InjectRepository(VehicleDocument) private readonly documents:Repository<VehicleDocument>,@InjectDataSource() private readonly db:DataSource,private readonly audit:AuditService){}
 @RequirePermissions('vehicles.manage') @Post()
 async create(@Body() dto:CreateVehicleDto,@CurrentUser() user:AuthenticatedUser){
  try{
   const vehicle=await this.vehicles.save(this.vehicles.create({organization:{id:user.organizationId} as any,plate:dto.plate.trim().toUpperCase(),brand:dto.brand?.trim()??null,model:dto.model?.trim()??null,year:dto.year??null,vehicleType:dto.vehicleType?.trim()||'STANDARD',status:VehicleStatus.INACTIVE}));
   await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.vehicle.created',entity:'vehicles',entityId:vehicle.id,newValue:{status:vehicle.status}});
   return {id:vehicle.id,status:vehicle.status};
  }catch(error:any){if(error?.code==='23505')throw new ConflictException('La placa ya está registrada');throw error;}
 }
 @RequirePermissions('vehicles.manage') @Post(':vehicleId/documents')
 async addDocument(@Param('vehicleId') id:string,@Body() dto:CreateDocumentDto,@CurrentUser() user:AuthenticatedUser){
  const vehicle=await this.vehicles.findOne({where:{id},relations:{organization:true}});
  if(!vehicle)throw new NotFoundException('Vehículo no encontrado');
  if(vehicle.organization?.id!==user.organizationId)throw new ForbiddenException('El vehículo no pertenece a tu organización');
  const doc=await this.documents.save(this.documents.create({vehicle,docType:dto.docType.trim(),fileUrl:dto.fileUrl,expiresAt:dto.expiresAt??null,verified:false}));
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.vehicle_document.created',entity:'vehicle_documents',entityId:doc.id,newValue:{vehicleId:id,docType:doc.docType,verified:false}});
  return {id:doc.id,vehicleId:id,docType:doc.docType,expiresAt:doc.expiresAt,verified:doc.verified};
 }
 @RequirePermissions('vehicles.manage') @Patch(':vehicleId/documents/:documentId/verify')
 async verifyDocument(@Param('vehicleId') id:string,@Param('documentId') docId:string,@Body() dto:VerifyDocumentDto,@CurrentUser() user:AuthenticatedUser){
  const doc=await this.documents.findOne({where:{id:docId,vehicle:{id}},relations:{vehicle:{organization:true}}});
  if(!doc)throw new NotFoundException('Documento no encontrado');
  if(doc.vehicle.organization?.id!==user.organizationId)throw new ForbiddenException('El documento no pertenece a tu organización');
  const expirationDate = doc.expiresAt ? new Date(doc.expiresAt as any) : null;
  const today = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z');
  if (dto.verified && expirationDate && expirationDate.getTime() < today.getTime()) throw new ConflictException('No se puede verificar un documento vencido');
  doc.verified=dto.verified;await this.documents.save(doc);
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.vehicle_document.verified',entity:'vehicle_documents',entityId:doc.id,newValue:{vehicleId:id,docType:doc.docType,verified:doc.verified}});
  return {id:doc.id,docType:doc.docType,verified:doc.verified,expiresAt:doc.expiresAt};
 }
 @RequirePermissions('vehicles.manage') @Patch(':vehicleId/status')
 async updateStatus(@Param('vehicleId') id:string,@Body() dto:UpdateVehicleStatusDto,@CurrentUser() user:AuthenticatedUser){
  const vehicle=await this.vehicles.findOne({where:{id},relations:{organization:true}});
  if(!vehicle)throw new NotFoundException('Vehículo no encontrado');
  if(vehicle.organization?.id!==user.organizationId)throw new ForbiddenException('El vehículo no pertenece a tu organización');
  if(dto.status===VehicleStatus.ACTIVE)await new DocumentPolicy(this.db).assertRequiredDocuments(user.organizationId,'vehicle_documents','vehicle_id',id,'onboarding.vehicle_required_document_types');
  vehicle.status=dto.status;await this.vehicles.save(vehicle);
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'onboarding.vehicle.status_changed',entity:'vehicles',entityId:id,newValue:{status:vehicle.status}});
  return {id:vehicle.id,status:vehicle.status};
 }
}
