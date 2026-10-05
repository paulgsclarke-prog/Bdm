import { endpoint } from '../lib/server.mjs';
export default endpoint(async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  // Publishable key only: database URLs and secret keys never reach the frontend.
  res.status(200).json({publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||null,sharedEnabled:process.env.BDM_SHARED_ENABLED==='true'});
});
