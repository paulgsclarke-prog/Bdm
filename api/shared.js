import { authenticate,database,endpoint } from '../lib/server.mjs';
import { HttpError,authoriseWrite,validateData } from '../lib/policy.mjs';
import { ensureSchema } from '../lib/schema.mjs';

export default endpoint(async(req,res)=>{
  if(!['GET','PUT'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  const member=await authenticate(req),sql=database();
  if(member.manager)await ensureSchema(sql);
  const [current]=await sql`SELECT revision,data FROM bdm_shared_state WHERE id=1`;
  if(!current)throw new HttpError(503,'Database schema has not been installed');
  const user=current.data.bdm_users?.find(u=>u.id===member.userId);
  if(current.revision>0&&(!user||user.active===false||Boolean(user.manager)!==member.manager))throw new HttpError(403,'BDM access is inactive or mismatched');
  if(req.method==='GET')return res.status(200).json({...current,member});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!Number.isSafeInteger(body?.revision)||body.revision<0)throw new HttpError(400,'A revision is required');
  if(Buffer.byteLength(JSON.stringify(body),'utf8')>3500000)throw new HttpError(413,'Upload is too large; split the customer reports');
  if(body.revision!==current.revision)throw new HttpError(409,'Shared data changed. Back up unsaved work and reload before retrying');
  validateData(body.data);
  if(current.revision===0&&!member.manager)throw new HttpError(403,'A manager must migrate the initial data');
  authoriseWrite(current.data,body.data,member);
  const newUser=body.data.bdm_users?.find(u=>u.id===member.userId);
  if(!newUser||newUser.active===false||Boolean(newUser.manager)!==member.manager)throw new HttpError(400,'Keep your linked BDM user active');
  // Atomic compare-and-swap and backup in one SQL statement. Concurrent writers
  // cannot both advance the same revision; no stale data is silently overwritten.
  const [saved]=await sql`
    WITH updated AS (
      UPDATE bdm_shared_state SET data=${JSON.stringify(body.data)}::jsonb,revision=revision+1,updated_at=now()
      WHERE id=1 AND revision=${body.revision} RETURNING revision,data
    ), backup AS (
      INSERT INTO bdm_shared_backups(revision,data,clerk_user_id,bdm_user_id)
      SELECT revision,data,${member.clerkUserId},${member.userId} FROM updated RETURNING revision
    ) SELECT revision FROM backup`;
  if(!saved)throw new HttpError(409,'Another user saved first. Back up unsaved work and reload');
  res.status(200).json(saved);
});
