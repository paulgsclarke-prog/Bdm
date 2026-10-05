import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(name){
 const start=html.indexOf('function '+name+'(');assert.ok(start>=0);
 const next=html.indexOf('\nfunction ',start+10);
 let text=html.slice(start,next<0?html.length:next);
 const end=text.indexOf('\n}');return end>=0?text.slice(0,end+2):text;
}
const NativeDate=Date;
class LondonDate extends NativeDate{
 constructor(...args){if(!args.length)super("2026-10-05T11:00:00Z");else if(args.length>1)super(NativeDate.UTC(...args)-3600000);else super(...args);}
 shifted(){return new NativeDate(super.getTime()+3600000);}
 getFullYear(){return this.shifted().getUTCFullYear();}getMonth(){return this.shifted().getUTCMonth();}getDate(){return this.shifted().getUTCDate();}getDay(){return this.shifted().getUTCDay();}
 setDate(v){const d=this.shifted();d.setUTCDate(v);return super.setTime(d.getTime()-3600000);}
}
function build(names,bindings={}){
 return new Function('Date',...Object.keys(bindings),names.map(source).join('\n')+'\nreturn {'+names.join(',')+'};')(LondonDate,...Object.values(bindings));
}
const dates=['localDateOnly','workingDayKey','recordDateKey','isoToday'];
test('daily credit uses the local date and counts quoted conversations only for their actor',()=>{
 const h=build([...dates,'todaysUserMetrics'],{activity:[
 {audit:{userId:'U1'},type:'Quote given',iso:'2026-10-04T23:30:00Z'},
 {audit:{userId:'U1'},type:'No answer',iso:'2026-10-05T10:00:00Z'},
 {audit:{userId:'U2'},type:'Spoke to customer',iso:'2026-10-05T10:00:00Z'}],
 leads:[{id:'L1',audit:{userId:'U1'},createdAt:'2026-10-04T23:30:00Z'}]});
 assert.equal(h.recordDateKey('2026-10-04T23:30:00Z'),'2026-10-05');
 assert.deepEqual(h.todaysUserMetrics('U1'),{calls:2,conversations:1,leads:1,surveys:0});
});
test('a missing working day breaks best streak and weekend work adds no streak day',()=>{
 const h=build([...dates,'userStreak'],{targetHistory:{U1:{
 '2026-09-30':{complete:true},'2026-10-02':{complete:true},'2026-10-03':{complete:true}}}});
 assert.deepEqual(h.userStreak('U1'),{current:1,best:1});
});
test('Friday and Monday form a consecutive working-day streak',()=>{
 const h=build([...dates,'userStreak'],{targetHistory:{U1:{
 '2026-10-02':{complete:true},'2026-10-05':{complete:true}}}});
 assert.deepEqual(h.userStreak('U1'),{current:2,best:2});
});
test('daily queue keeps due tasks and top 20 first, then respects saved priority without duplicates',()=>{
 const groups={top20:[{id:'T'}],critical:[{id:'A',opportunityScore:100}],new:[{id:'B'},{id:'A'}],normal:[{id:'B'},{id:'C'}]};
 const h=build(['dailyQueue'],{liveGroups:()=>groups,currentCustomerModel:()=>({enriched:[{customer:'A',rank:2},{customer:'B',rank:1},{customer:'C',rank:3}]}),
 ownDue:()=>[{customerId:'D'}],customerForFollowup:f=>({id:f.customerId}),activity:[{customerId:'C',type:'Quote given',iso:'today'}],recordDateKey:x=>x,isoToday:()=>'today',priorityRankForCustomer:c=>c.rank,callPriorityConfig:[],n:v=>Number(v||0)});
 assert.deepEqual(h.dailyQueue().map(c=>c.id),['D','T','B','A']);
});
test('optional phone column is imported without using GDPR telephone permission as a number',()=>{
 const h=build(['validatedCustomerRows'],{FIELD_NAMES:['customer','name','gdprTel'],reportNumber:Number});
 const rows=[[],[],['Customer','Name','GDPR Telephone','Phone'],[],['A','Customer','Yes','07700 900123']];
 assert.equal(h.validatedCustomerRows(rows)[0].phone,'07700 900123');
 assert.equal(h.validatedCustomerRows(rows)[0].gdprTel,'Yes');
 assert.throws(()=>h.validatedCustomerRows([...rows,rows[4]]),/Duplicate/);
});
test('generation stats, required-period pipeline, and call follow-up totals remain separate',()=>{
 const h=build([...dates,'dashboardMetrics'],{periodInfo:()=>({start:new LondonDate(2026,8,28),end:new LondonDate(2026,9,25),period:11,week:2,day:1}),
 activity:[{iso:'2026-10-05T10:00:00Z',type:'Quote given',customerId:'A'}],
 leads:[{id:'old',customerId:'B',requiredPeriod:11,createdAt:'2026-09-01T12:00:00Z',value:9000,margin:3000,status:'open'},
 {id:'new',customerId:'A',requiredPeriod:12,createdAt:'2026-10-05T10:00:00Z',value:1000,margin:300,status:'open',followUpDate:'2026-10-05'},
 {id:'lost',customerId:'A',requiredPeriod:11,createdAt:'2026-10-04T10:00:00Z',value:500,margin:100,status:'lost'}],
 followups:[{date:'2026-10-05'},{date:'2026-10-01'},{date:'2026-10-01',completedAt:'done'}],latestSnapshot:()=>({customers:[{},{}]}),liveGroups:()=>({}),leadRequiredPeriod:l=>l.requiredPeriod,n:v=>Number(v||0)});
 const m=h.dashboardMetrics();assert.equal(m.generatedLeadCount,2);assert.equal(m.leadCount,1);assert.equal(m.generatedLeadMargin,400);assert.equal(m.weekLeadCount,1);assert.equal(m.leadStrike,100);assert.equal(m.taskFollowToday,1);assert.equal(m.taskOverdue,1);
});
test('lead creation from a call validates margin and returns to the same customer',()=>{
 const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{value:'',hidden:false});return nodes.get(id);},querySelectorAll(){return [];}};
 const leads=[],messages=[];let targetUpdates=0;
 const h=build(['renderSalesLeadForm','validateSalesLead'],{document,app:{},title:{},setNav:()=>{},currentView:'',users:[{id:'U1',name:'Manager'}],activeUserId:'U1',leads,
 leadFormCustomers:()=>[{id:'A',name:'Customer'}],esc:x=>String(x??''),LEAD_STAGES:['Opportunity','Quoted','Won','Lost'],LOSS_REASONS:['Price'],normalizeStage:l=>l.stage,staffOptions:()=>'',n:v=>Number(v||0),kitchenHandoverFields:()=>'',workingDayKey:()=>'',isoToday:()=>'2026-10-05',readKitchenHandover:()=>({}),validateHandover:()=>null,
 requestPin:opts=>opts.onSuccess({id:'U1',name:'Manager'}),auditStamp:()=>({userId:'U1'}),storage:{set:()=>{}},updateTargetHistory:()=>targetUpdates++,renderLeads:()=>assert.fail('Lost call queue')});
 h.renderSalesLeadForm(null,{id:'A',name:'Customer'},message=>messages.push(message||'cancel'));
 const values={salesCustomer:'A',salesCategory:'Joinery',salesDetails:'Doors',salesStage:'Opportunity',salesOwner:'U1',salesQuote:'',salesValue:'1000',salesMargin:'300',salesRequired:'2026-11-01',salesFollow:'2026-10-06',salesAction:'Call back',salesLoss:'',salesNotes:''};
 for(const [id,value]of Object.entries(values))document.getElementById(id).value=value;
 document.getElementById('salesMargin').oninput();assert.equal(document.getElementById('salesMarginPct').value,'30.0%');
 document.getElementById('salesMargin').value='2000';document.getElementById('saveSalesLead').onclick();assert.equal(leads.length,0);
 document.getElementById('salesMargin').value='300';document.getElementById('saveSalesLead').onclick();assert.equal(leads.length,1);assert.equal(targetUpdates,1);assert.equal(messages.length,1);
});
test('quoted follow-up completes checked tasks, credits nurture once and advances once',()=>{
 const start=html.indexOf('let pendingNextAction=null;'),end=html.indexOf('const originalManager=',start);
 const script='let queueIndex=0;\n'+html.slice(start,end)+
 "\npendingNextAction={customerId:'A',customer:'Customer',type:'quote',date:'2026-10-06',reason:'Discuss decision',ownerId:'U1',covered:['task:F1','newNurture']};requestPin({onSuccess:user=>{activity.unshift({customerId:'A',type:'Quote given'});leads.unshift({id:'L1'});queueIndex++;renderCustomer();}});return {queueIndex};";
 const followups=[{id:'F1',customerId:'A',ownerId:'U1',createdBy:'U1'}],nurture={newContacts:0,oldContacts:0};let renders=0;
 const result=new Function('Date','requestPin','nurtureRecord','followups','leads','activity','users','storage','renderCustomer','n','isoToday','nurtureProgress',script)(LondonDate,opts=>opts.onSuccess({id:'U1',name:'Manager'}),()=>nurture,followups,[],[],[{id:'U1',name:'Manager'}],{set:()=>{}},()=>renders++,v=>Number(v||0),()=>'2026-10-05',{});
 assert.ok(followups[0].completedAt);assert.equal(nurture.newContacts,1);assert.equal(result.queueIndex,1);assert.equal(renders,1);
});
