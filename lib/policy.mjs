import { isDeepStrictEqual } from 'node:util';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const TYPES = {
  bdm_call_priorities:'array',bdm_nurture_settings:'object',bdm_period_settings:'object',
  bdm_period_targets:'object',bdm_standard_contact_messages:'object',bdm_user_targets:'object',
  bdm_users:'array',bdm_snapshots:'array',bdm_activity:'array',bdm_leads:'array',
  bdm_followups:'array',bdm_recent_transactions:'array',bdm_daily_user_targets:'object',
  bdm_ytd_report:'object',bdm_report_metadata:'object',bdm_nurture_progress:'object',bdm_target_history:'object'
};
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export function validateData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400,'Invalid data');
  for (const [key,value] of Object.entries(data)) {
    if (!own(TYPES,key)) throw new HttpError(400,'Unknown data key');
    if (TYPES[key] === 'array' ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value))
      throw new HttpError(400,'Invalid data type: '+key);
  }
  for (const key of ['bdm_users','bdm_snapshots','bdm_activity','bdm_leads','bdm_followups','bdm_recent_transactions']) {
    if (data[key]?.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new HttpError(400,'Invalid record');
  }
  if (data.bdm_snapshots?.some(s=>!Array.isArray(s.customers))) throw new HttpError(400,'Invalid snapshot');
  for(const key of ['bdm_users','bdm_leads','bdm_followups']) {
    const ids=(data[key]||[]).map(r=>r.id);
    if(ids.some(id=>typeof id!=='string'&&typeof id!=='number') || new Set(ids).size!==ids.length) throw new HttpError(400,'Invalid or duplicate record ID');
  }
  return data;
}
export function memberFromUser(user) {
  // privateMetadata is only editable through Clerk's trusted backend/dashboard.
  const m=user.privateMetadata||{};
  if(typeof m.bdmUserId!=='string'||!/^U[\w-]{1,100}$/.test(m.bdmUserId)||!['manager','staff'].includes(m.bdmRole))
    throw new HttpError(403,'Your login has not been linked to an authorised BDM user');
  return {clerkUserId:user.id,userId:m.bdmUserId,manager:m.bdmRole==='manager'};
}
export function authoriseWrite(previous,next,member) {
  validateData(next);
  const keys=new Set([...Object.keys(previous),...Object.keys(next)]);
  for(const key of keys) {
    if(isDeepStrictEqual(previous[key],next[key])) continue;
    if(member.manager) continue;
    if(key==='bdm_target_history') {
      const ids=new Set([...Object.keys(previous[key]||{}),...Object.keys(next[key]||{})]);
      for(const id of ids) if(id!==member.userId&&!isDeepStrictEqual(previous[key]?.[id],next[key]?.[id])) throw new HttpError(403,'Cannot change another user’s target history');
      continue;
    }
    if(!['bdm_activity','bdm_leads','bdm_followups','bdm_nurture_progress'].includes(key)) throw new HttpError(403,'Manager access required');
    if(key==='bdm_activity') {
      const old=previous[key]||[],updated=next[key]||[];
      const remaining=[...updated];
      for(const record of old){const i=remaining.findIndex(a=>isDeepStrictEqual(a,record));if(i<0)throw new HttpError(403,'Existing call history cannot be rewritten');remaining.splice(i,1);}
      if(remaining.some(a=>a.audit?.userId!==member.userId))throw new HttpError(403,'Calls must use your identity');
    }
    if(key==='bdm_leads') {
      const old=new Map((previous[key]||[]).map(l=>[l.id,l]));
      if((next[key]||[]).length<old.size) throw new HttpError(403,'Lead deletion requires a manager');
      for(const l of next[key]||[]) {
        const before=old.get(l.id);
        if(before&&(!isDeepStrictEqual(before.audit,l.audit)||before.createdAt!==l.createdAt)) throw new HttpError(403,'Lead creator credit cannot be changed');
        if(!before&&l.audit?.userId!==member.userId) throw new HttpError(403,'Lead creator must be your identity');
        old.delete(l.id);
      }
      if(old.size) throw new HttpError(403,'Lead deletion requires a manager');
    }
    if(key==='bdm_followups') {
      const old=new Map((previous[key]||[]).map(f=>[f.id,f]));
      for(const f of next[key]||[]) {
        const before=old.get(f.id);
        if(!before&&f.createdBy!==member.userId) throw new HttpError(403,'Follow-up creator must be your identity');
        if(before&&before.createdBy!==f.createdBy) throw new HttpError(403,'Follow-up creator cannot be changed');
        old.delete(f.id);
      }
      if(old.size) throw new HttpError(403,'Follow-up deletion requires a manager');
    }
  }
}
