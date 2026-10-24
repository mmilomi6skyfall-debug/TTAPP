import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TripStatus } from '../../common/enums';
import { DispatchService } from './dispatch.service';

const user = (id: string, organizationId: string, permissions = ['dispatch.manual_assign']) =>
  ({ id, role: 'OPERATOR', organizationId, permissions }) as any;

describe('DispatchService organization isolation', () => {
  let trips: any;
  let events: any;
  let offers: any;
  let drivers: any;
  let db: any;
  let audit: any;
  let service: DispatchService;

  beforeEach(() => {
    trips = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(async (value: any) => value),
    };
    events = {
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };
    offers = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };
    drivers = {
      findOne: jest.fn(),
      update: jest.fn(async () => undefined),
    };
    db = { query: jest.fn(async () => [{ vehicle_id: 'vehicle-a' }]) };
    audit = { record: jest.fn(async () => undefined) };
    service = new DispatchService(trips, events, offers, drivers, db, audit);
  });

  it('denies candidate lookup for a foreign-organization trip before reading config or GPS', async () => {
    trips.findOne.mockResolvedValue({ id: 'trip-b', organization: { id: 'org-b' } });
    await expect(service.getRankedCandidates('trip-b', 'org-a')).rejects.toThrow(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('denies manual assignment to a foreign-organization trip without writes', async () => {
    trips.findOne.mockResolvedValue({
      id: 'trip-b',
      organization: { id: 'org-b' },
      status: TripStatus.QUOTED,
    });
    await expect(service.manualAssign(
      { tripId: 'trip-b', driverId: 'driver-a', reason: 'Prueba autorizada' } as any,
      user('operator-a', 'org-a'),
    )).rejects.toThrow(ForbiddenException);
    expect(drivers.findOne).not.toHaveBeenCalled();
    expect(trips.save).not.toHaveBeenCalled();
    expect(offers.save).not.toHaveBeenCalled();
  });

  it('denies assigning a driver from another organization without changing the trip', async () => {
    const trip = { id: 'trip-a', organization: { id: 'org-a' }, status: TripStatus.QUOTED };
    trips.findOne.mockResolvedValue(trip);
    drivers.findOne.mockResolvedValue({
      userId: 'driver-b',
      status: 'AVAILABLE',
      user: { status: 'ACTIVE', organization: { id: 'org-b' } },
    });
    await expect(service.manualAssign(
      { tripId: 'trip-a', driverId: 'driver-b', reason: 'Prueba autorizada' } as any,
      user('operator-a', 'org-a'),
    )).rejects.toThrow(ForbiddenException);
    expect(trips.save).not.toHaveBeenCalled();
    expect(offers.save).not.toHaveBeenCalled();
  });

  it('assigns an eligible driver and active vehicle within the same organization', async () => {
    const trip = { id: 'trip-a', organization: { id: 'org-a' }, status: TripStatus.QUOTED } as any;
    trips.findOne.mockResolvedValue(trip);
    drivers.findOne.mockResolvedValue({
      userId: 'driver-a',
      status: 'AVAILABLE',
      user: { status: 'ACTIVE', organization: { id: 'org-a' } },
    });
    const assigned = await service.manualAssign(
      { tripId: 'trip-a', driverId: 'driver-a', reason: 'Asignación de prueba' } as any,
      user('operator-a', 'org-a'),
    );
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('v.organization_id = $2'), ['driver-a', 'org-a']);
    expect(trips.save).toHaveBeenCalledTimes(1);
    expect(assigned.status).toBe(TripStatus.DRIVER_ASSIGNED);
    expect(assigned.driver).toEqual({ userId: 'driver-a' });
    expect(assigned.vehicle).toEqual({ id: 'vehicle-a' });
    expect(drivers.update).toHaveBeenCalledWith('driver-a', { status: 'BUSY' });
  });

  it('does not persist an offer response when the trip belongs to another tenant', async () => {
    offers.findOne.mockResolvedValue({
      id: 'offer-a',
      trip: { id: 'trip-b', organization: { id: 'org-b' }, status: TripStatus.QUOTED },
      driver: { userId: 'driver-a', user: { status: 'ACTIVE', organization: { id: 'org-a' } }, status: 'AVAILABLE' },
      respondedAt: null,
    });
    await expect(service.respondToOffer('offer-a', 'ACCEPTED', {
      id: 'driver-a', role: 'DRIVER', organizationId: 'org-a', permissions: ['dispatch.offers.view'],
    } as any)).rejects.toThrow(ForbiddenException);
    expect(offers.save).not.toHaveBeenCalled();
    expect(trips.save).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('validates vehicle eligibility before saving an accepted offer', async () => {
    offers.findOne.mockResolvedValue({
      id: 'offer-a',
      trip: { id: 'trip-a', organization: { id: 'org-a' }, status: TripStatus.QUOTED },
      driver: { userId: 'driver-a', user: { status: 'ACTIVE', organization: { id: 'org-a' } }, status: 'AVAILABLE' },
      respondedAt: null,
    });
    db.query.mockResolvedValueOnce([]);
    await expect(service.respondToOffer('offer-a', 'ACCEPTED', {
      id: 'driver-a', role: 'DRIVER', organizationId: 'org-a', permissions: ['dispatch.offers.view'],
    } as any)).rejects.toThrow(ConflictException);
    expect(offers.save).not.toHaveBeenCalled();
    expect(trips.save).not.toHaveBeenCalled();
  });
});
