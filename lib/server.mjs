import { createClerkClient } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';
import { HttpError, memberFromUser } from './policy.mjs';

export function database() {
  const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
  if(!url) throw new HttpError(503,'Database setup is incomplete');
  return neon(url);
}
export function origins() {
  return (process.env.BDM_ALLOWED_ORIGINS||'https://bdm.semtexgym.com').split(',').map(v=>v.trim()).filter(Boolean);
}
export async function authenticate(req) {
  if(!process.env.CLERK_SECRET_KEY||!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) throw new HttpError(503,'Login setup is incomplete');
  if(!req.headers.authorization?.startsWith('Bearer ')) throw new HttpError(401,'Sign in required');
  const origin=req.headers.origin;
  if(origin&&!origins().includes(origin)) throw new HttpError(403,'Origin is not allowed');
  const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY,publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY});
  const request=new Request(origins()[0]+req.url,{method:req.method,headers:{authorization:req.headers.authorization}});
  const result=await clerk.authenticateRequest(request,{authorizedParties:origins(),acceptsToken:'session_token'});
  const auth=result.toAuth();
  if(!auth?.userId) throw new HttpError(401,'Sign in required');
  return memberFromUser(await clerk.users.getUser(auth.userId));
}
export function endpoint(handler) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try { await handler(req,res); }
    catch(e) { res.status(e.status||500).json({error:e.status?e.message:'Unable to complete the request'}); }
  };
}
