import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { TripStatus } from '../../common/enums';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { PanicService } from './panic.service';
describe('PanicService',()=>{
 const passenger={id:'passenger-1',organizationId:'org-a',role:'PASSENGER',permissions:[]} as AuthenticatedUser;
 const trip={id:'trip-1',organization:{id:'org-a'},passenger:{userId:'passenger-1'},driver:{userId:'driver-1'},status:TripStatus.TRIP_IN_PROGRESS};
 let alerts:any,trips:any,locations:any,audit:any,service:PanicService;
 beforeEach(()=>{
  alerts={create:jest.fn((v)=>v),save:jest.fn(async(v)=>({...v,id:'alert-1',createdAt:new Date('2026-01-01T00:00:00Z')})),findOne:jest.fn(),find:jest.fn()};
  trips={findOne:jest.fn(async()=>trip)};locations={findOne:jest.fn()};audit={record:jest.fn(async()=>undefined)};
  service=new PanicService(alerts,trips,locations,audit);
 });
 it('records authenticated participant and audits the panic alert',async()=>{
  const response=await service.trigger('trip-1',passenger,{lat:20.1,lng:-98.4,recordedAt:'2026-01-01T00:00:00Z'});
  expect(response.actorType).toBe('PASSENGER');expect(response.status).toBe('OPEN');
  expect(alerts.save).toHaveBeenCalledTimes(1);
  expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({action:'panic.triggered',organizationId:'org-a'}));
 });
 it('rejects panic trigger across organizations',async()=>{
  trips.findOne.mockResolvedValueOnce({...trip,organization:{id:'org-b'}});
  await expect(service.trigger('trip-1',passenger,{})).rejects.toThrow(ForbiddenException);
  expect(alerts.save).not.toHaveBeenCalled();
 });
});
