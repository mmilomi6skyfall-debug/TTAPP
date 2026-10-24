import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { VehiclesController } from './vehicles.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, VehicleDocument]), AuditModule],
  controllers: [VehiclesController],
  exports: [TypeOrmModule],
})
export class VehiclesModule {}
