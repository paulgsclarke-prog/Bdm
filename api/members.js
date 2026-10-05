import { createClerkClient } from '@clerk/backend';
import { authenticate,database,endpoint } from '../lib/server.mjs';
import { HttpError } from '../lib/policy.mjs';
import { prepareStaffLink } from '../lib/staff.mjs';

export default endpoint(async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const member=await authenticate(req);
  if(!member.manager)throw new HttpError(403,'Manager access required');
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(!email||email.length>254||!email.includes('@')||!Number.isSafeInteger(body?.revision))
    throw new HttpError(400,'Choose a staff user and enter their verified login email');
  const sql=database();
  const [current]=await sql`SELECT revision,data FROM bdm_shared_state WHERE id=1`;
  if(!current||current.revision!==body.revision)throw new HttpError(409,'Shared data changed. Refresh before linking');
  const actor=current.data.bdm_users?.find(u=>u.id===member.userId);
  if(!actor?.manager||actor.active===false||(actor.clerkUserId&&actor.clerkUserId!==member.clerkUserId))
    throw new HttpError(403,'Active manager access required');
  const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY,publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY});
  const found=await clerk.users.getUserList({emailAddress:[email],limit:2});
  if(found.data.length!==1)throw new HttpError(400,'Ask the colleague to create and verify their account first');
  const user=found.data[0],link=prepareStaffLink(current.data,member,body.userId,user,email);
  // Reserve the unique association before granting access. A failed Clerk update
  // leaves no new access and the same manager can safely retry this association.
  const [saved]=await sql`
    WITH updated AS (
      UPDATE bdm_shared_state SET data=${JSON.stringify(link.data)}::jsonb,revision=revision+1,updated_at=now()
      WHERE id=1 AND revision=${body.revision} RETURNING revision,data
    ), backup AS (
      INSERT INTO bdm_shared_backups(revision,data,clerk_user_id,bdm_user_id)
      SELECT revision,data,${member.clerkUserId},${member.userId} FROM updated RETURNING revision
    ) SELECT revision FROM backup`;
  if(!saved)throw new HttpError(409,'Another user saved first. Refresh before linking');
  try{await clerk.users.updateUserMetadata(user.id,{privateMetadata:link.metadata});}
  catch{throw new HttpError(503,'Login linking was reserved but not completed. Refresh and retry the same colleague');}
  res.status(200).json({revision:saved.revision,userId:body.userId});
});
