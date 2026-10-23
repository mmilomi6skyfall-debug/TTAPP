import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';
export class PanicTriggerDto {
 @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?:number;
 @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?:number;
 @IsOptional() @IsDateString() recordedAt?:string;
 @IsOptional() @IsNumber() @Min(0) accuracyM?:number;
}
