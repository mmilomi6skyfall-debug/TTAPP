import { describe, expect, it } from '@jest/globals';
import { sanitizeAuditPayload } from './audit.interceptor';
describe('sanitizeAuditPayload',()=>{
 it('redacts credentials, contact data, documents and location recursively',()=>{
  expect(sanitizeAuditPayload({password:'secret',email:'person@example.invalid',fileUrl:'private-ref',location:{lat:20,lng:-98},nested:{token:'secret',safeStatus:'OPEN'}}))
  .toEqual({password:'[REDACTED]',email:'[REDACTED]',fileUrl:'[REDACTED]',location:'[REDACTED]',nested:{token:'[REDACTED]',safeStatus:'OPEN'}});
 });
});
