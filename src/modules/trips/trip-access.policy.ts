import { ForbiddenException } from '@nestjs/common';
import { TripStatus } from '../../common/enums';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

export interface TripAccessFacts {
  organizationId: string;
  passengerId: string | null;
  driverId: string | null;
}

export function canViewTripForUser(trip: TripAccessFacts, user: AuthenticatedUser): boolean {
  if (trip.organizationId !== user.organizationId) return false;
  if (user.role === 'PASSENGER') return trip.passengerId === user.id;
  if (user.role === 'DRIVER') return trip.driverId === user.id;
  return user.permissions.includes('trips.view');
}

export function cancellationStatusForUser(trip: TripAccessFacts, user: AuthenticatedUser, reason: string): TripStatus {
  if (reason.trim().length < 3 || reason.trim().length > 500) {
    throw new ForbiddenException('La cancelación requiere un motivo de 3 a 500 caracteres');
  }
  if (trip.organizationId !== user.organizationId) {
    throw new ForbiddenException('El viaje no pertenece a tu organización');
  }
  if (user.role === 'PASSENGER' && trip.passengerId === user.id) return TripStatus.CANCELLED_BY_PASSENGER;
  if (user.role === 'DRIVER' && trip.driverId === user.id) return TripStatus.CANCELLED_BY_DRIVER;
  if (user.role === 'OPERATOR' && user.permissions.includes('trips.cancel')) return TripStatus.CANCELLED_BY_OPERATOR;
  throw new ForbiddenException('Tu rol no puede cancelar este viaje');
}
