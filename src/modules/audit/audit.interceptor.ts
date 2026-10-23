import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
const MUTATING_METHODS = new Set(['POST','PATCH','PUT','DELETE']);
const REDACTED = new Set([
 'password','passwordhash','password_hash','accesstoken','refreshtoken','token','secret','apikey','authorization',
 'email','phone','fullname','license_number','licensenumber','file_url','fileurl','lat','lng','latitude','longitude',
 'reason','comment','address','location','position','coordinates','reference_number','referencenumber',
]);
function sanitizeValue(value: unknown): unknown {
 if(Array.isArray(value)) return value.map(sanitizeValue);
 if(!value||typeof value!=='object') return value;
 const out:Record<string,unknown>={};
 for(const [key,item] of Object.entries(value as Record<string,unknown>)) out[key]=REDACTED.has(key.toLowerCase())?'[REDACTED]':sanitizeValue(item);
 return out;
}
export function sanitizeAuditPayload(body: unknown): Record<string, unknown> | null {
 const value=sanitizeValue(body);
 return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
@Injectable()
export class AuditInterceptor implements NestInterceptor {
 constructor(private readonly auditService:AuditService){}
 intercept(context:ExecutionContext,next:CallHandler):Observable<unknown>{
  const request=context.switchToHttp().getRequest();
  if(!MUTATING_METHODS.has(request.method)) return next.handle();
  return next.handle().pipe(tap(()=>{ void this.auditService.record({
   actorUserId:request.user?.id??null, organizationId:request.user?.organizationId??null,
   action:`HTTP ${request.method}`, entity:'http_request',
   entityId:request.route?.path??request.url, newValue:sanitizeAuditPayload(request.body),
   ipAddress:request.ip??null,
  }); }));
 }
}
