import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { TripStatus } from '../../common/enums';
import { cancellationStatusForUser, canViewTripForUser } from './trip-access.policy';

const facts = { organizationId: 'org-a', passengerId: 'passenger-1', driverId: 'driver-1' };
const user = (id: string, role: string, organizationId = 'org-a', permissions: string[] = []) =>
  ({ id, role, organizationId, permissions }) as any;

describe('trip access and cancellation policy', () => {
  it('limits trip reads to participants or roles with trips.view within the same organization', () => {
    expect(canViewTripForUser(facts, user('passenger-1', 'PASSENGER'))).toBe(true);
    expect(canViewTripForUser(facts, user('passenger-2', 'PASSENGER'))).toBe(false);
    expect(canViewTripForUser(facts, user('driver-1', 'DRIVER'))).toBe(true);
    expect(canViewTripForUser(facts, user('auditor-1', 'AUDITOR', 'org-a', ['trips.view']))).toBe(true);
    expect(canViewTripForUser(facts, user('auditor-1', 'AUDITOR', 'org-b', ['trips.view']))).toBe(false);
    expect(canViewTripForUser(facts, user('admin-1', 'ADMIN'))).toBe(false);
  });
  it('derives cancellation actor from authenticated role and trip participation', () => {
    expect(cancellationStatusForUser(facts, user('passenger-1', 'PASSENGER'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_PASSENGER);
    expect(cancellationStatusForUser(facts, user('driver-1', 'DRIVER'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_DRIVER);
    expect(cancellationStatusForUser(facts, user('operator-1', 'OPERATOR', 'org-a', ['trips.cancel']), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_OPERATOR);
    expect(() => cancellationStatusForUser(facts, user('passenger-2', 'PASSENGER'), 'Motivo válido')).toThrow(ForbiddenException);
    expect(() => cancellationStatusForUser(facts, user('admin-1', 'ADMIN'), 'Motivo válido')).toThrow(ForbiddenException);
    expect(() => cancellationStatusForUser(facts, user('passenger-1', 'PASSENGER', 'org-b'), 'Motivo válido')).toThrow(ForbiddenException);
    expect(() => cancellationStatusForUser(facts, user('passenger-1', 'PASSENGER'), 'x')).toThrow(ForbiddenException);
  });
});
