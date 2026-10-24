import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
export class DocumentPolicy {
 constructor(private readonly db:DataSource){}
 async requiredTypes(org:string,key:'onboarding.driver_required_document_types'|'onboarding.vehicle_required_document_types'):Promise<string[]>{
  const rows=await this.db.query('SELECT value FROM configuration WHERE organization_id=$1 AND key=$2 LIMIT 1',[org,key]);
  let value:unknown=rows[0]?.value;
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{value=null;}}
  if(!Array.isArray(value)||!value.length)throw new ForbiddenException(`Falta definir ${key}; no se puede habilitar la unidad`);
  const types=[...new Set(value.filter((v):v is string=>typeof v==='string'&&v.trim().length>0).map((v:string)=>v.trim()))];
  if(!types.length)throw new ForbiddenException(`La política ${key} no contiene tipos válidos`);
  return types;
 }
 async assertRequiredDocuments(org:string,table:'driver_documents'|'vehicle_documents',ownerColumn:'driver_id'|'vehicle_id',ownerId:string,key:'onboarding.driver_required_document_types'|'onboarding.vehicle_required_document_types'):Promise<void>{
  const required=await this.requiredTypes(org,key);
  const rows=await this.db.query(`SELECT DISTINCT doc_type FROM ${table} WHERE ${ownerColumn}=$1 AND verified=true AND (expires_at IS NULL OR expires_at>=CURRENT_DATE)`,[ownerId]);
  const verified=new Set<string>(rows.map((r:{doc_type:string})=>r.doc_type));
  if(required.some(t=>!verified.has(t)))throw new ForbiddenException('Faltan documentos requeridos verificados y vigentes');
 }
}
