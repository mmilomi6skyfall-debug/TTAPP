import { IsEnum } from 'class-validator';
import { VehicleStatus } from '../../../common/enums';
export class UpdateVehicleStatusDto { @IsEnum(VehicleStatus) status:VehicleStatus; }
