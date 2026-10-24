import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { GpsController } from './gps.controller';

const dto = {
  lng: -98.05,
  lat: 20.17,
  recordedAt: '2026-10-24T12:00:00.000Z',
  speedKmh: 12,
  heading: 180,
  accuracyM: 5,
};
const user = (id: string, role = 'DRIVER', organizationId = 'org-a') =>
  ({ id, role, organizationId, permissions: [] }) as any;

describe('GpsController tenant and actor isolation', () => {
  it('rejects another driver id before attempting writes', async () => {
    const history = { create: jest.fn((value: any) => value), save: jest.fn(async () => undefined) };
    const db = { query: jest.fn(async () => [{ user_id: 'driver-a' }]) };
    const controller = new GpsController(history as any, db as any);
    await expect(controller.ping('driver-b', dto as any, user('driver-a'))).rejects.toThrow(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
    expect(history.save).not.toHaveBeenCalled();
  });

  it('rejects an authenticated non-driver even when the route id matches the JWT subject', async () => {
    const history = { create: jest.fn((value: any) => value), save: jest.fn(async () => undefined) };
    const db = { query: jest.fn(async () => [{ user_id: 'operator-a' }]) };
    const controller = new GpsController(history as any, db as any);
    await expect(controller.ping('operator-a', dto as any, user('operator-a', 'OPERATOR'))).rejects.toThrow(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects a driver whose active profile does not belong to the JWT organization', async () => {
    const history = { create: jest.fn((value: any) => value), save: jest.fn(async () => undefined) };
    const db = { query: jest.fn(async () => []) };
    const controller = new GpsController(history as any, db as any);
    await expect(controller.ping('driver-a', dto as any, user('driver-a'))).rejects.toThrow(ForbiddenException);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(history.save).not.toHaveBeenCalled();
  });

  it('persists own GPS only after validating the active profile in the same organization', async () => {
    const history = { create: jest.fn((value: any) => value), save: jest.fn(async (value: any) => value) };
    const db = { query: jest.fn<(...args: any[]) => Promise<any[]>>(async () => [])
      .mockResolvedValueOnce([{ user_id: 'driver-a' }])
      .mockResolvedValueOnce([]) };
    const controller = new GpsController(history as any, db as any);
    await expect(controller.ping('driver-a', dto as any, user('driver-a'))).resolves.toBeUndefined();
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][1]).toEqual(['driver-a', 'org-a']);
    expect(history.save).toHaveBeenCalledTimes(1);
  });
});
