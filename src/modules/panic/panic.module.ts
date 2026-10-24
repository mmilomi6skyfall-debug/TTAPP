import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PanicAlert } from './entities/panic-alert.entity';
import { Trip } from '../trips/entities/trip.entity';
import { DriverLocation } from '../gps/entities/driver-location.entity';
import { PanicController } from './panic.controller';
import { PanicService } from './panic.service';
import { AuditModule } from '../audit/audit.module';
@Module({imports:[TypeOrmModule.forFeature([PanicAlert,Trip,DriverLocation]),AuditModule],controllers:[PanicController],providers:[PanicService],exports:[PanicService]})
export class PanicModule {}
