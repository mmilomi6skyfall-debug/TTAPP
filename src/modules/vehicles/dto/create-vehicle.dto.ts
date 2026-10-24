import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateVehicleDto {
 @IsString() @MinLength(3) @MaxLength(20) plate:string;
 @IsOptional() @IsString() @MaxLength(80) brand?:string;
 @IsOptional() @IsString() @MaxLength(80) model?:string;
 @IsOptional() @IsInt() @Min(1950) @Max(2100) year?:number;
 @IsOptional() @IsString() @MaxLength(40) vehicleType?:string;
}
