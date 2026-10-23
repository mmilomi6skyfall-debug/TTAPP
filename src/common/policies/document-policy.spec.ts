import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { DocumentPolicy } from './document-policy';
describe('DocumentPolicy',()=>{
 it('fails closed when required document types have not been configured',async()=>{
  const db={query:jest.fn(async()=>[])};
  await expect(new DocumentPolicy(db as any).assertRequiredDocuments('org-a','driver_documents','driver_id','driver-1','onboarding.driver_required_document_types')).rejects.toThrow(ForbiddenException);
 });
 it('blocks activation when a required type is absent or unverified',async()=>{
  const db={query:jest.fn().mockResolvedValueOnce([{value:['LICENSE','IDENTITY']}]).mockResolvedValueOnce([{doc_type:'LICENSE'}])};
  await expect(new DocumentPolicy(db as any).assertRequiredDocuments('org-a','driver_documents','driver_id','driver-1','onboarding.driver_required_document_types')).rejects.toThrow(ForbiddenException);
 });
 it('accepts all configured required types when verified and current',async()=>{
  const db={query:jest.fn().mockResolvedValueOnce([{value:['LICENSE']}]).mockResolvedValueOnce([{doc_type:'LICENSE'}])};
  await expect(new DocumentPolicy(db as any).assertRequiredDocuments('org-a','driver_documents','driver_id','driver-1','onboarding.driver_required_document_types')).resolves.toBeUndefined();
 });
});
