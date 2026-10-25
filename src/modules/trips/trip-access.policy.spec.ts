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

  describe('D0-04=A cancellation policy', () => {
    it('allows any authenticated actor in the same organization before the service checks trip state', () => {
      expect(cancellationStatusForUser(facts, user('passenger-1', 'PASSENGER'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_USER);
      expect(cancellationStatusForUser(facts, user('passenger-2', 'PASSENGER'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_USER);
      expect(cancellationStatusForUser(facts, user('driver-2', 'DRIVER'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_USER);
      expect(cancellationStatusForUser(facts, user('admin-1', 'ADMIN'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_USER);
      expect(cancellationStatusForUser(facts, user('auditor-1', 'AUDITOR'), 'Motivo válido')).toBe(TripStatus.CANCELLED_BY_USER);
    });
    it('denies cancellation across organizations', () => {
      expect(() => cancellationStatusForUser(facts, user('passenger-1', 'PASSENGER', 'org-b'), 'Motivo válido')).toThrow(ForbiddenException);
    });
    it('retains input reason validation', () => {
      expect(() => cancellationStatusForUser(facts, user('user-1', 'ADMIN'), 'x')).toThrow(ForbiddenException);
      expect(() => cancellationStatusForUser(facts, user('user-1', 'ADMIN'), 'x'.repeat(501))).toThrow(ForbiddenException);
    });
  });
});
