import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['lib/demo.ts'],outfile:'.sites-runtime/demo-test.mjs',bundle:true,platform:'node',format:'esm'});
const {createDemoApi,demoKey}=await import('../.sites-runtime/demo-test.mjs');
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};

test('demo is preloaded, stays offline, and never reads production browser data',async()=>{
 const storage=store();storage.data.set('mental-model-workspace-v1','DO NOT TOUCH');
 const api=createDemoApi(storage).request;const originalFetch=globalThis.fetch;
 globalThis.fetch=()=>{throw new Error('Unexpected network request');};
 try{
  const {projects}=await api('/api/projects');assert.equal(projects.length,1);
  const p=projects[0].project;assert.equal(p.interviews.length,2);assert.equal(p.quotes.length,6);assert.equal(p.statements.length,6);assert.equal(p.towers.length,3);
  p.statements[0].text='Avoid another demanding choice';
  const saved=await api('/api/projects','PUT',{project:p,revision:1});assert.equal(saved.revision,2);
  const feedback=await api('/api/reviews','POST',{projectId:p.id,targetId:p.statements[0].id,kind:'statement'});
  assert.equal(feedback.source,'demo');assert.equal(feedback.status,'completed');assert.equal(feedback.feedback.checks.length,6);
  assert.ok(feedback.feedback.checks.some(c=>c.status==='unclear'));
  const reopened=createDemoApi(storage);const loaded=await reopened.request('/api/projects');assert.equal(loaded.projects[0].project.statements[0].text,p.statements[0].text);
  assert.equal(storage.data.get('mental-model-workspace-v1'),'DO NOT TOUCH');
  await assert.rejects(()=>api('/api/projects','PUT',{project:p,revision:1}),/changed/);
  await assert.rejects(()=>api('/api/private'),/not part/);
  const restored=reopened.reset();assert.equal(restored.projects[0].project.statements[0].text,'Avoid making another decision about dinner');
  assert.equal(storage.data.get('mental-model-workspace-v1'),'DO NOT TOUCH');
 }finally{globalThis.fetch=originalFetch;}
});

test('all coaching flows complete locally and project deletion removes its feedback',async()=>{
 const api=createDemoApi(store()).request,{projects}=await api('/api/projects'),p=projects[0].project;
 for(const kind of ['interview','question','map']){
  const r=await api('/api/reviews','POST',{projectId:p.id,targetId:kind==='map'?p.id:p.interviews[0].id,kind,question:'What was going through your mind?'});
  assert.equal(r.source,'demo');assert.ok(r.feedback.question);
 }
 const original={...p,id:crypto.randomUUID(),name:'A second demo project'};
 await api('/api/projects','POST',original);assert.equal((await api('/api/projects')).projects.length,2);
 await api('/api/projects','DELETE',{id:p.id});assert.equal((await api('/api/projects')).projects.length,1);
 assert.equal((await api(`/api/reviews?projectId=${p.id}`)).reviews.length,0);
});

test('storage corruption can be reset without erasing unrelated data',async()=>{
 const storage=store();storage.setItem(demoKey,JSON.stringify({version:0}));const client=createDemoApi(storage);
 await assert.rejects(()=>client.request('/api/projects'),/could not be opened/);
 client.reset();assert.equal((await client.request('/api/projects')).projects.length,1);
});
