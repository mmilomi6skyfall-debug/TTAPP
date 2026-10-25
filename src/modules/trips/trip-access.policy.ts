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

/**
 * D0-04=A: any authenticated user may cancel a trip in their own organization
 * before it starts. State validation stays in TripsService.assertTransition.
 * The actor is the JWT subject; client-provided cancelledBy is ignored.
 */
export function cancellationStatusForUser(
  trip: TripAccessFacts,
  user: AuthenticatedUser,
  reason: string,
): TripStatus {
  if (!reason || reason.trim().length < 3 || reason.trim().length > 500) {
    throw new ForbiddenException('La cancelación requiere un motivo de 3 a 500 caracteres');
  }
  if (!user.id || !user.organizationId || trip.organizationId !== user.organizationId) {
    throw new ForbiddenException('El viaje no pertenece a tu organización');
  }
  return TripStatus.CANCELLED_BY_USER;
}
