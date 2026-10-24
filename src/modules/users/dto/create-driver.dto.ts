import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateDriverDto {
 @IsString() @MinLength(2) @MaxLength(160) fullName:string;
 @IsString() @MinLength(4) @MaxLength(80) licenseNumber:string;
 @IsOptional() @IsEmail() @MaxLength(254) email?:string;
 @IsOptional() @IsString() @MaxLength(32) phone?:string;
 @IsString() @MinLength(12) @MaxLength(128) password:string;
}
