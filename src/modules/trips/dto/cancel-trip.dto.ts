import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelTripDto {
  // El actor de cancelación se deriva del JWT, no del cliente.
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
