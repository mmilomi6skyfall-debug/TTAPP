import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, Matches } from 'class-validator';

export const REQUIRED_DOCUMENT_TYPES = [
  'onboarding.driver_required_document_types',
  'onboarding.vehicle_required_document_types',
] as const;

export type RequiredDocumentPolicyKey = (typeof REQUIRED_DOCUMENT_TYPES)[number];

export class UpdateRequiredDocumentsDto {
  @IsIn(REQUIRED_DOCUMENT_TYPES)
  key: RequiredDocumentPolicyKey;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[A-Z][A-Z0-9_]{1,79}$/, { each: true, message: 'Cada tipo debe usar MAYÚSCULAS, números o guion bajo, sin espacios.' })
  value: string[];
}
