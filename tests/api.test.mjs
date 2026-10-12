import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject,uid } from '../lib/research.ts';
const base='http://127.0.0.1:4173';
const call=async(path,method='GET',data,auth=true,origin=base)=>{const r=await fetch(base+path,{method,headers:{...(auth?{Cookie:'__sites_local_auth=1'}:{}),...(data?{'Content-Type':'application/json',Origin:origin}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});let value;try{value=await r.json();}catch{}return {status:r.status,value,headers:r.headers};};
const rpc=(name,args={},auth=true)=>call('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},auth);

test('authentication, persistence, concurrency, and ChatGPT coaching contract',async()=>{
  assert.equal((await call('/api/projects','GET',undefined,false)).status,401);
  assert.equal((await call('/workspace','GET',undefined,false)).status,307);
  assert.equal((await rpc('list_coaching_requests',{},false)).status,401);
  const discovery=await call('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/list'},false);
  assert.equal(discovery.status,200);assert.equal(discovery.value.result.tools.length,4);
  const p=sampleProject();p.name='Integration test '+uid();
  try{
    assert.equal((await call('/api/projects','POST',p,true,'https://untrusted.example')).status,403);
    const created=await call('/api/projects','POST',p);assert.equal(created.status,201);assert.equal(created.value.revision,1);
    p.purpose='An updated research intention';
    const saved=await call('/api/projects','PUT',{project:p,revision:1});assert.equal(saved.status,200);assert.equal(saved.value.revision,2);
    assert.equal((await call('/api/projects','PUT',{project:p,revision:1})).status,409);
    const missing={...p,id:'not-your-project'};assert.equal((await call('/api/projects','PUT',{project:missing,revision:1})).status,409);
    const list=await call('/api/projects');assert.equal(list.value.projects.find(r=>r.project.id===p.id).project.purpose,p.purpose);
    const payload={projectId:p.id,kind:'statement',targetId:p.statements[0].id};
    const requested=await call('/api/reviews','POST',payload);assert.equal(requested.status,201);
    const r=requested.value;assert.equal(r.status,'pending');
    assert.equal((await call('/api/reviews','POST',payload)).value.id,r.id);
    const pending=await rpc('list_coaching_requests');assert.ok(JSON.parse(pending.value.result.content[0].text).some(x=>x.review_id===r.id));
    const snap=await rpc('get_coaching_request',{review_id:r.id});assert.equal(JSON.parse(snap.value.result.content[0].text).review.snapshot.statement,p.statements[0].text);
    const invalid=await rpc('submit_coaching_feedback',{review_id:r.id,feedback:{strength:'test'}});assert.equal(invalid.value.result.isError,true);
    const feedback={strength:'Test fixture: grounded action.',improvement:'Test fixture: inspect intention.',question:'Test fixture: what were they trying to understand?',suggestions:[],checks:Array.from({length:6},(_,criterion)=>({criterion,status:'pass',reason:'Integration fixture only.'}))};
    const completed=await rpc('submit_coaching_feedback',{review_id:r.id,feedback});assert.equal(completed.value.result.isError,undefined);assert.equal(JSON.parse(completed.value.result.content[0].text).status,'completed');
    assert.equal((await rpc('submit_coaching_feedback',{review_id:r.id,feedback})).value.result.isError,undefined);
    const readback=await call(`/api/reviews?projectId=${p.id}`);assert.equal(readback.value.reviews[0].feedback.question,feedback.question);
    assert.equal((await rpc('submit_coaching_feedback',{review_id:r.id,feedback:{...feedback,question:'Different reply'}})).value.result.isError,true);
    const another=await call('/api/reviews','POST',{projectId:p.id,kind:'map',targetId:p.id});
    assert.equal((await call('/api/reviews','DELETE',{id:another.value.id})).status,200);
    assert.equal((await rpc('submit_coaching_feedback',{review_id:another.value.id,feedback})).value.result.isError,true);
    p.interviews[0].consent=false;assert.equal((await call('/api/projects','PUT',{project:p,revision:2})).status,200);
    assert.equal((await call('/api/reviews','POST',{projectId:p.id,kind:'interview',targetId:p.interviews[0].id})).status,400);
  }finally{
    assert.equal((await call('/api/projects','DELETE',{id:p.id})).status,200);
    const remaining=await call('/api/projects');assert.ok(!remaining.value.projects.some(r=>r.project.id===p.id));
    assert.deepEqual((await call(`/api/reviews?projectId=${p.id}`)).value.reviews,[]);
  }
});
