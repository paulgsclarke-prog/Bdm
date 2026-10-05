import { HttpError } from './policy.mjs';

export function prepareStaffLink(data,member,targetId,user,email) {
  const actor=data.bdm_users?.find(u=>u.id===member.userId);
  if(!member.manager||!actor?.manager||actor.active===false||(actor.clerkUserId&&actor.clerkUserId!==member.clerkUserId))
    throw new HttpError(403,'Active manager access required');
  const target=data.bdm_users.find(u=>u.id===targetId);
  if(!target||target.active===false||target.manager||!/^U[\w-]{1,100}$/.test(target.id))
    throw new HttpError(400,'Choose an active staff user');
  const primary=user.emailAddresses?.find(e=>e.id===user.primaryEmailAddressId);
  if(primary?.verification?.status!=='verified'||primary.emailAddress?.trim().toLowerCase()!==email)
    throw new HttpError(400,'The colleague must verify this as their primary login email first');
  const metadata=user.privateMetadata||{};
  if(metadata.bdmAccessRevoked||(metadata.bdmUserId&&metadata.bdmUserId!==targetId)||(metadata.bdmRole&&metadata.bdmRole!=='staff'))
    throw new HttpError(409,'This login already has a different or revoked BDM mapping');
  if((target.clerkUserId&&target.clerkUserId!==user.id)||data.bdm_users.some(u=>u.id!==targetId&&u.clerkUserId===user.id))
    throw new HttpError(409,'This login or BDM user is already linked');
  const next=JSON.parse(JSON.stringify(data));
  Object.assign(next.bdm_users.find(u=>u.id===targetId),{clerkUserId:user.id,loginEmail:email});
  return {data:next,metadata:{bdmUserId:targetId,bdmRole:'staff'}};
}
