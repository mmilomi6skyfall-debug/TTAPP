import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PanicAlert } from './entities/panic-alert.entity';
import { PanicTriggerDto } from './dto/panic-trigger.dto';
import { PanicResolutionDto } from './dto/panic-resolution.dto';
import { PanicListQueryDto } from './dto/panic-list-query.dto';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { Trip } from '../trips/entities/trip.entity';
import { DriverLocation } from '../gps/entities/driver-location.entity';
import { TripStatus } from '../../common/enums';
import { toGeoPoint } from '../../common/types/geo.util';
import { AuditService } from '../audit/audit.service';
const TERMINAL=new Set<TripStatus>([TripStatus.CLOSED,TripStatus.CANCELLED_BY_PASSENGER,TripStatus.CANCELLED_BY_DRIVER,TripStatus.CANCELLED_BY_OPERATOR,TripStatus.CANCELLED_BY_SYSTEM,TripStatus.TRIP_COMPLETED,TripStatus.PAYMENT_PENDING,TripStatus.PAYMENT_CONFIRMED,TripStatus.NO_SHOW,TripStatus.DISPUTED]);
@Injectable()
export class PanicService {
 constructor(@InjectRepository(PanicAlert) private readonly alerts:Repository<PanicAlert>,@InjectRepository(Trip) private readonly trips:Repository<Trip>,@InjectRepository(DriverLocation) private readonly locations:Repository<DriverLocation>,private readonly audit:AuditService){}
 async trigger(tripId:string,user:AuthenticatedUser,dto:PanicTriggerDto = {}){
  if((dto.lat===undefined)!==(dto.lng===undefined))throw new ConflictException('lat y lng deben enviarse juntos');
  const trip=await this.trips.findOne({where:{id:tripId},relations:['organization','passenger','driver']});
  if(!trip)throw new NotFoundException('Viaje no encontrado');
  if(trip.organization?.id!==user.organizationId)throw new ForbiddenException('El viaje no pertenece a tu organización');
  if(TERMINAL.has(trip.status))throw new ConflictException('El viaje ya terminó y no admite una nueva alerta');
  let actorType:'PASSENGER'|'DRIVER';
  if(user.role==='PASSENGER'&&trip.passenger?.userId===user.id)actorType='PASSENGER';
  else if(user.role==='DRIVER'&&trip.driver?.userId===user.id)actorType='DRIVER';
  else throw new ForbiddenException('Solo el pasajero o conductor asignado puede activar el pánico');
  let location: {type:'Point';coordinates:[number,number]}|null=null;
  let locationRecordedAt:Date|null=null;let accuracy:number|null=dto.accuracyM??null;
  if(dto.lat!==undefined&&dto.lng!==undefined){location=toGeoPoint({lat:dto.lat,lng:dto.lng}) as any;locationRecordedAt=dto.recordedAt?new Date(dto.recordedAt):null;}
  else if(actorType==='DRIVER'){const gps=await this.locations.findOne({where:{driverId:user.id}});if(gps){location=gps.position as any;locationRecordedAt=gps.recordedAt;accuracy=gps.accuracyM;}}
  const alert=await this.alerts.save(this.alerts.create({organizationId:user.organizationId,trip:{id:trip.id} as Trip,triggeredBy:{id:user.id} as any,actorType,status:'OPEN',location,locationRecordedAt,locationAccuracyM:accuracy}));
  await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action:'panic.triggered',entity:'panic_alerts',entityId:alert.id,newValue:{tripId,actorType,status:'OPEN',locationAvailable:Boolean(location)}});
  return this.response(alert);
 }
 async list(query:PanicListQueryDto,user:AuthenticatedUser){
  const where:Record<string,unknown>={organizationId:user.organizationId};if(query.status)where.status=query.status;
  const rows=await this.alerts.find({where,order:{createdAt:'DESC'},take:100,relations:['trip']});return rows.map(a=>this.response(a));
 }
 async acknowledge(id:string,user:AuthenticatedUser){
  const a=await this.get(id,user);if(a.status!=='OPEN')throw new ConflictException('Solo una alerta OPEN puede acusarse');
  a.status='ACKNOWLEDGED';a.acknowledgedBy=user.id;a.acknowledgedAt=new Date();return this.transition(a,user,'panic.acknowledged');
 }
 async escalate(id:string,dto:PanicResolutionDto,user:AuthenticatedUser){
  const a=await this.get(id,user);if(!['OPEN','ACKNOWLEDGED'].includes(a.status))throw new ConflictException('La alerta no admite escalamiento desde su estado actual');
  a.status='ESCALATED';a.escalatedBy=user.id;a.escalatedAt=new Date();a.escalationNote=dto.reason.trim();return this.transition(a,user,'panic.escalated');
 }
 async close(id:string,dto:PanicResolutionDto,user:AuthenticatedUser){
  const a=await this.get(id,user);if(!['ACKNOWLEDGED','ESCALATED'].includes(a.status))throw new ConflictException('La alerta debe acusarse antes de cerrarse');
  a.status='CLOSED';a.closedBy=user.id;a.closedAt=new Date();a.closureNote=dto.reason.trim();return this.transition(a,user,'panic.closed');
 }
 private async get(id:string,user:AuthenticatedUser){
  const a=await this.alerts.findOne({where:{id},relations:['trip']});if(!a)throw new NotFoundException('Alerta no encontrada');
  if(a.organizationId!==user.organizationId)throw new ForbiddenException('La alerta no pertenece a tu organización');
  if(!user.permissions.includes('panic.alerts.manage'))throw new ForbiddenException('Requiere panic.alerts.manage');return a;
 }
 private async transition(a:PanicAlert,user:AuthenticatedUser,action:string){
  const saved=await this.alerts.save(a);await this.audit.record({actorUserId:user.id,organizationId:user.organizationId,action,entity:'panic_alerts',entityId:a.id,newValue:{status:saved.status}});return this.response(saved);
 }
 private response(a:PanicAlert){return{id:a.id,tripId:a.trip?.id,actorType:a.actorType,status:a.status,location:a.location?{lat:a.location.coordinates[1],lng:a.location.coordinates[0]}:null,locationRecordedAt:a.locationRecordedAt,locationAccuracyM:a.locationAccuracyM,createdAt:a.createdAt,acknowledgedAt:a.acknowledgedAt,escalatedAt:a.escalatedAt,escalationNote:a.escalationNote,closedAt:a.closedAt,closureNote:a.closureNote};}
}
