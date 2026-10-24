import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateDocumentDto {
 @IsString() @MinLength(2) @MaxLength(80) docType:string;
 @IsString() @MinLength(5) @MaxLength(2048) fileUrl:string;
 @IsOptional() @IsDateString() expiresAt?:string;
}
export class VerifyDocumentDto { @IsBoolean() verified:boolean; }
