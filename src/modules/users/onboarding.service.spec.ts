import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PassengerProfile } from '../passengers/entities/passenger-profile.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let db: any;
  let audit: any;
  const authorized = { id: 'admin-id', organizationId: 'org-a', role: 'ADMIN', permissions: ['users.manage', 'drivers.manage'] } as AuthenticatedUser;

  beforeEach(() => {
    const roles = { findOne: jest.fn(async (q: any) => ({ id: q.where.code === 'DRIVER' ? 'role-driver' : 'role-passenger', code: q.where.code })) };
    const users = { create: jest.fn((v: any) => v), save: jest.fn(async (v: any) => ({ ...v, id: 'new-user-id', status: 'ACTIVE' })) };
    const passengers = { create: jest.fn((v: any) => v), save: jest.fn(async (v: any) => v) };
    const drivers = { create: jest.fn((v: any) => v), save: jest.fn(async (v: any) => v) };
    const manager = { getRepository: jest.fn((entity: any) => {
      if (entity === Role) return roles;
      if (entity === User) return users;
      if (entity === PassengerProfile) return passengers;
      if (entity === DriverProfile) return drivers;
      throw new Error('Unexpected repository in test');
    }) };
    db = {
      query: jest.fn(async () => []),
      transaction: jest.fn(async (work: (manager: any) => Promise<any>) => work(manager)),
    };
    audit = { record: jest.fn(async () => undefined) };
    service = new OnboardingService(db, audit);
  });

  it('creates a passenger without returning password hash or contact fields', async () => {
    const response = await service.createPassenger({ fullName: 'Test Passenger', email: 'passenger@example.invalid', password: 'long-test-password' }, authorized);
    expect(response).toEqual({ id: 'new-user-id', role: 'PASSENGER', status: 'ACTIVE' });
    expect(response).not.toHaveProperty('passwordHash');
    expect(response).not.toHaveProperty('email');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'onboarding.passenger.created', organizationId: 'org-a' }));
  });

  it('creates a driver OFFLINE until document and vehicle validation allows activation', async () => {
    const response = await service.createDriver({ fullName: 'Test Driver', licenseNumber: 'TEST-1234', phone: '+10000000000', password: 'long-test-password' }, authorized);
    expect(response).toEqual({ id: 'new-user-id', role: 'DRIVER', status: 'OFFLINE', accountStatus: 'ACTIVE' });
  });

  it('refuses internal onboarding without users.manage', async () => {
    const actor = { ...authorized, permissions: [] } as AuthenticatedUser;
    await expect(service.createPassenger({ fullName: 'Test Passenger', email: 'passenger@example.invalid', password: 'long-test-password' }, actor)).rejects.toThrow(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
