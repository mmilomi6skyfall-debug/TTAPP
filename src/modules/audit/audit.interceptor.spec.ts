import { describe, expect, it } from '@jest/globals';
import { sanitizeAuditPayload } from './audit.interceptor';

describe('sanitizeAuditPayload', () => {
  it('redacts credentials, contact fields, personal identifiers and location recursively', () => {
    expect(sanitizeAuditPayload({
      password: 'synthetic-secret',
      email: 'example@example.invalid',
      passengerId: 'synthetic-passenger-id',
      fileUrl: 'https://files.example.invalid/document',
      location: { lat: 20.1, lng: -98.4 },
      nested: { token: 'synthetic-token', safeStatus: 'OPEN' },
    })).toEqual({
      password: '[REDACTED]',
      email: '[REDACTED]',
      passengerId: '[REDACTED]',
      fileUrl: '[REDACTED]',
      location: '[REDACTED]',
      nested: { token: '[REDACTED]', safeStatus: 'OPEN' },
    });
  });
});
