import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(name){
 const start=html.indexOf('function '+name+'(');assert.ok(start>=0);
 if(name==='setNav')return html.slice(start,html.indexOf('\n',start));
 return html.slice(start,html.indexOf('\n}',start)+2);
}
function navigation(){
 const classes=new Map(),active=new Map(),visits=[],scrolls=[];
 const managerButton={dataset:{view:'manager'},hidden:true,style:{removeProperty(){}}};
 const nav={hidden:true,style:{},querySelector:()=>managerButton};
 const buttons=['home','calls','leads','stats','manager'].map(view=>({dataset:{view},classList:{toggle:(name,value)=>active.set(view,value)}}));
 const document={body:{classList:{toggle:(name,value)=>classes.set(name,value)}},getElementById:()=>nav,querySelectorAll:()=>buttons};
 const app={classList:{toggle(){}}},state={user:{manager:true,active:true}},cloud={enabled:true,member:{manager:true}};
 const routes=['home','calls','groups','reports','history','import','leads','stats','settings','manager'];
 const declarations=routes.map(view=>'const render'+view[0].toUpperCase()+view.slice(1)+'=()=>{visits.push("'+view+'");setNav("'+view+'");};').join('\n');
 const h=new Function('document','app','activeUser','cloud','window','visits',[source('syncManagerSession'),source('setNav'),declarations,source('go')].join('\n')+'\nreturn {go,setNav};')(document,app,()=>state.user,cloud,{scrollTo:options=>scrolls.push(options)},visits);
 return {h,state,cloud,nav,managerButton,classes,active,visits,scrolls};
}
test('manager navigation remains visible across Leads, Stats, Manager and Home',()=>{
 const n=navigation();
 for(const page of ['leads','stats','manager','home']){
  n.nav.hidden=true;n.h.go(page);
  assert.equal(n.nav.hidden,false);assert.equal(n.managerButton.hidden,false);
  assert.equal(n.classes.get('manager-session'),true);assert.equal(n.active.get(page),true);
  assert.equal(n.nav.style.gridTemplateColumns,'repeat(5,minmax(0,1fr))');
 }
 assert.deepEqual(n.visits,['leads','stats','manager','home']);assert.equal(n.scrolls.length,4);
});
test('staff and unverified manager mappings never expose Manager navigation',()=>{
 const n=navigation();n.state.user.manager=false;n.h.go('leads');
 assert.equal(n.managerButton.hidden,true);assert.equal(n.nav.style.gridTemplateColumns,'repeat(4,minmax(0,1fr))');
 n.state.user.manager=true;n.cloud.member.manager=false;n.h.go('stats');
 assert.equal(n.managerButton.hidden,true);assert.equal(n.classes.get('manager-session'),false);
 n.state.user=null;n.h.setNav('');assert.equal(n.managerButton.hidden,true);
});
