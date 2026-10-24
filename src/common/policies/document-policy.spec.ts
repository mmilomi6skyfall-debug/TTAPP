import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { DocumentPolicy } from './document-policy';

describe('DocumentPolicy', () => {
  it('fails closed when required document types have not been configured', async () => {
    const query = jest.fn<(...args: any[]) => Promise<any[]>>(async () => []);
    const policy = new DocumentPolicy({ query } as any);
    await expect(policy.assertRequiredDocuments('org-a', 'driver_documents', 'driver_id', 'driver-1', 'onboarding.driver_required_document_types'))
      .rejects.toThrow(ForbiddenException);
  });

  it('blocks activation when a required type is absent or unverified', async () => {
    const query = jest.fn<(...args: any[]) => Promise<any[]>>();
    query.mockResolvedValueOnce([{ value: ['LICENSE', 'IDENTITY'] }]);
    query.mockResolvedValueOnce([{ doc_type: 'LICENSE' }]);
    const policy = new DocumentPolicy({ query } as any);
    await expect(policy.assertRequiredDocuments('org-a', 'driver_documents', 'driver_id', 'driver-1', 'onboarding.driver_required_document_types'))
      .rejects.toThrow(ForbiddenException);
  });

  it('accepts all configured required types when verified and current', async () => {
    const query = jest.fn<(...args: any[]) => Promise<any[]>>();
    query.mockResolvedValueOnce([{ value: ['LICENSE'] }]);
    query.mockResolvedValueOnce([{ doc_type: 'LICENSE' }]);
    const policy = new DocumentPolicy({ query } as any);
    await expect(policy.assertRequiredDocuments('org-a', 'driver_documents', 'driver_id', 'driver-1', 'onboarding.driver_required_document_types'))
      .resolves.toBeUndefined();
  });
});
