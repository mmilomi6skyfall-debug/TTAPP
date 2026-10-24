import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { User } from '../../users/entities/user.entity';
export type PanicActorType='PASSENGER'|'DRIVER';
export type PanicAlertStatus='OPEN'|'ACKNOWLEDGED'|'ESCALATED'|'CLOSED';
type Point = { type:'Point'; coordinates:[number,number] };
@Entity('panic_alerts')
export class PanicAlert {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'organization_id',type:'uuid'}) organizationId:string;
 @ManyToOne(()=>Trip) @JoinColumn({name:'trip_id'}) trip:Trip;
 @ManyToOne(()=>User) @JoinColumn({name:'triggered_by'}) triggeredBy:User;
 @Column({name:'actor_type',type:'varchar'}) actorType:PanicActorType;
 @Column({type:'varchar',default:'OPEN'}) status:PanicAlertStatus;
 @Column({type:'geography',spatialFeatureType:'Point',srid:4326,nullable:true}) location:Point|null;
 @Column({name:'location_recorded_at',type:'timestamptz',nullable:true}) locationRecordedAt:Date|null;
 @Column({name:'location_accuracy_m',type:'numeric',precision:8,scale:2,nullable:true}) locationAccuracyM:number|null;
 @Column({name:'acknowledged_by',type:'uuid',nullable:true}) acknowledgedBy:string|null;
 @Column({name:'acknowledged_at',type:'timestamptz',nullable:true}) acknowledgedAt:Date|null;
 @Column({name:'escalated_by',type:'uuid',nullable:true}) escalatedBy:string|null;
 @Column({name:'escalated_at',type:'timestamptz',nullable:true}) escalatedAt:Date|null;
 @Column({name:'escalation_note',type:'text',nullable:true}) escalationNote:string|null;
 @Column({name:'closed_by',type:'uuid',nullable:true}) closedBy:string|null;
 @Column({name:'closed_at',type:'timestamptz',nullable:true}) closedAt:Date|null;
 @Column({name:'closure_note',type:'text',nullable:true}) closureNote:string|null;
 @CreateDateColumn({name:'created_at',type:'timestamptz'}) createdAt:Date;
 @UpdateDateColumn({name:'updated_at',type:'timestamptz'}) updatedAt:Date;
}
