import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareStaffLink} from '../lib/staff.mjs';
const data={bdm_users:[{id:'U1',manager:true},{id:'U2',manager:false}]};
const actor={userId:'U1',clerkUserId:'owner',manager:true};
const user={id:'staff',primaryEmailAddressId:'e',emailAddresses:[{id:'e',emailAddress:'staff@example.com',verification:{status:'verified'}}],privateMetadata:{}};
test('verified staff linking preserves data and grants only staff role',()=>{
 const result=prepareStaffLink(data,actor,'U2',user,'staff@example.com');
 assert.equal(result.data.bdm_users[1].clerkUserId,'staff');assert.equal(data.bdm_users[1].clerkUserId,undefined);
 assert.deepEqual(result.metadata,{bdmUserId:'U2',bdmRole:'staff'});
});
test('staff links reject nonmanagers, manager targets, unverified emails and remapping',()=>{
 const cases=[
 [data,{...actor,manager:false},'U2',user],
 [data,actor,'U1',user],
 [data,actor,'U2',{...user,emailAddresses:[]}],
 [data,actor,'U2',{...user,privateMetadata:{bdmUserId:'U3'}}],
 [data,actor,'U2',{...user,privateMetadata:{bdmAccessRevoked:true}}],
 [{bdm_users:[data.bdm_users[0],{...data.bdm_users[1],clerkUserId:'other'}]},actor,'U2',user],
 [{bdm_users:[{...data.bdm_users[0],active:false},data.bdm_users[1]]},actor,'U2',user]
 ];
 for(const args of cases)assert.throws(()=>prepareStaffLink(...args,'staff@example.com'),e=>e.status===400||e.status===403||e.status===409);
});
