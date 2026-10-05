import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../api/config.js';
import shared from '../api/shared.js';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};}
test('public config never returns server secrets',async()=>{
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_test_example';process.env.CLERK_SECRET_KEY='server-secret';process.env.DATABASE_URL='private-database';
  const res=response();await config({method:'GET'},res);
  assert.equal(res.code,200);assert.deepEqual(res.data,{publishableKey:'pk_test_example',sharedEnabled:false});assert.equal(res.headers['Cache-Control'],'no-store');
});
test('shared data rejects anonymous callers before database access',async()=>{
  const res=response();await shared({method:'GET',headers:{},url:'/api/shared'},res);assert.equal(res.code,401);
});
test('unsupported methods cannot change shared data',async()=>{
  const res=response();await shared({method:'DELETE',headers:{},url:'/api/shared'},res);assert.equal(res.code,405);
});
test('cross-origin authenticated requests are denied before token verification',async()=>{
  const res=response();await shared({method:'PUT',headers:{authorization:'Bearer forged',origin:'https://untrusted.example'},url:'/api/shared'},res);assert.equal(res.code,403);
});
