import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from './entities/configuration.entity';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Configuration]), AuditModule],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  exports: [TypeOrmModule],
})
export class ConfigurationModule {}
