import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(name){
 const start=html.indexOf('function '+name+'(');assert.ok(start>=0);
 const next=html.indexOf('\nfunction ',start+10);let code=html.slice(start,next<0?html.length:next);
 const end=code.indexOf('\n}');return end>=0?code.slice(0,end+2):code;
}
function build(names,bindings){return new Function(...Object.keys(bindings),names.map(source).join('\n')+'\nreturn {'+names.join(',')+'};')(...Object.values(bindings));}
test('directory keeps current account details, includes accounts without history and flags older records',()=>{
 const latest={customers:[{customer:' A ',name:'Current name'},{customer:'C',name:'No history',phone:'02012345678'}]};
 const {customerDirectory}=build(['customerDirectory'],{latestSnapshot:()=>latest,snapshots:[{customers:[{customer:'A',name:'Old name',phone:'07700900123'},{customer:'B',name:'Old account'}]},latest],demoCustomers:{},ytdReport:{customers:[{customer:'A',name:'Report name'}]},leads:[{customerId:'A',customer:'Lead name'}],followups:[],activity:[]});
 const customers=customerDirectory();assert.equal(customers.length,3);
 assert.equal(customers.find(c=>c.id==='A').name,'Current name');assert.equal(customers.find(c=>c.id==='A').phone,'07700900123');assert.equal(customers.find(c=>c.id==='A').current,true);
 assert.equal(customers.find(c=>c.id==='B').current,false);assert.equal(customers.find(c=>c.id==='C').current,true);
});
test('an empty real customer upload does not add demonstration customers to search',()=>{
 const {customerDirectory}=build(['customerDirectory'],{latestSnapshot:()=>({customers:[]}),snapshots:[],demoCustomers:{new:[{id:'Demo',name:'Demo'}]},ytdReport:{customers:[]},leads:[],followups:[],activity:[]});
 assert.deepEqual(customerDirectory(),[]);
});
test('search matches names, account numbers and national/international formatted phones',()=>{
 const customers=[{id:'A104',name:'Oak & Stone',phone:'+44 7700 900123'},{id:'B200',name:'Other',phone:'020 1234 5678'}];
 const {matchingCustomers}=build(['phoneSearchDigits','matchingCustomers'],{customerDirectory:()=>customers});
 for(const query of ['oak','a104','07700 900123','+44 (7700) 900123','00447700900123'])assert.equal(matchingCustomers(query)[0].id,'A104');
 assert.equal(matchingCustomers('0201234')[0].id,'B200');assert.equal(matchingCustomers('unknown').length,0);assert.equal(matchingCustomers('').length,2);
});
test('combined work list excludes completed callbacks, closed leads and undated items',()=>{
 const {followupItems}=build(['followupItems'],{activeUserId:'U1',followups:[{id:'F1',ownerId:'U1',date:'2026-10-01',customer:'A'},{id:'done',ownerId:'U1',date:'2026-10-01',completedAt:'done'},{id:'undated',ownerId:'U1'},{id:'other',ownerId:'U2',date:'2026-10-02'}],leads:[{id:'L1',ownerId:'U1',followUpDate:'2026-10-05',customer:'A',nextActionReason:'Call about quote'},{id:'won',ownerId:'U1',followUpDate:'2026-10-01',status:'won'}],leadIsClosed:l=>['won','lost'].includes(l.status)});
 const mine=followupItems('U1');assert.deepEqual(mine.map(f=>f.id),['F1','L1']);assert.deepEqual(mine.map(f=>f.kind),['task','lead']);assert.equal(mine[1].reason,'Call about quote');assert.equal(followupItems(null).length,3);
});
test('due today includes overdue work and today, leaving future work for All scheduled',()=>{
 const list=[{id:'overdue',date:'2026-10-01'},{id:'today',date:'2026-10-05'},{id:'future',date:'2026-10-06'}];
 const {ownDue}=build(['ownDue'],{activeUserId:'U1',followupItems:()=>list,isoToday:()=>'2026-10-05'});
 assert.deepEqual(ownDue().map(f=>f.id),['overdue','today']);
});
test('staff cannot select depot-wide work and the list still offers future schedules',()=>{
 const app={},nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},querySelectorAll:()=>[]};let scope;
 const {renderFollowups}=build(['renderFollowups'],{activeUserId:'U1',activeUser:()=>({id:'U1',manager:false}),cloud:{enabled:true,member:{manager:false}},currentView:'',title:{},setNav:()=>{},followupItems:id=>{scope=id;return [];},isoToday:()=>'2026-10-05',users:[{id:'U1',name:'Staff'}],app,esc:v=>String(v||''),document,renderHome:()=>{},openFollowupCall:()=>{},renderLeadEditor:()=>{}});
 renderFollowups(null);assert.equal(scope,'U1');assert.ok(!app.innerHTML.includes('All depot follow-ups'));assert.ok(app.innerHTML.includes('All scheduled'));assert.ok(app.innerHTML.includes('No follow-ups due today.'));
});
test('search renders safe customer text and opens the selected account without recording a call',()=>{
 const nodes=new Map(),button={dataset:{customerOpen:'A'}},app={};
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{value:''});return nodes.get(id);},querySelectorAll:()=>[button]};
 const customer={id:'A',name:'<img src=x onerror=alert(1)>',phone:'07700900123',current:true};let rendered=0;
 const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const h=new Function('currentView','title','setNav','customerDirectory','app','document','matchingCustomers','esc','activeUserId','customerForFollowup','renderCustomer',"let lastCustomerQuery='',queueOwnerId=null,queueSnapshot=null,queueKey='',queueIndex=0;\n"+source('renderCustomerSearch')+'\nreturn {renderCustomerSearch,queue:()=>({queueKey,queueIndex,queueOwnerId,queueSnapshot})};')('',{},()=>{},()=>[customer],app,document,()=>[customer],esc,'U1',f=>({id:f.customerId,name:f.customer}),()=>rendered++);
 h.renderCustomerSearch('A');assert.equal(document.getElementById('customerQuery').value,'A');
 assert.ok(!document.getElementById('customerSearchResults').innerHTML.includes('<img'));
 assert.ok(document.getElementById('customerSearchResults').innerHTML.includes('&lt;img'));
 button.onclick();assert.equal(h.queue().queueKey,'search');assert.equal(h.queue().queueIndex,0);assert.equal(h.queue().queueSnapshot[0].id,'A');assert.equal(rendered,1);
});
