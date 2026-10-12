import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

await mkdir('.sites-runtime',{recursive:true});
await build({stdin:{contents:"export * from './lib/tutorial'; export * from './lib/tour-position'; export * from './app/workspace/learning'; export * from './app/workspace/evidence'; export * from './app/workspace/thinking';",resolveDir:process.cwd(),loader:'tsx'},outfile:'.sites-runtime/tutorial-test.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const {createTutorialApi,tutorialKey,lessons,positionTour,tourContentRect,readTutorialProgress,saveTutorialProgress,LearningStart,TutorialComplete,InterviewView,QuotesView,StatementsView,MapView}=await import('../.sites-runtime/tutorial-test.mjs');
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};

test('the quick tour opens a complete fictional example and persists optional edits without a network',async()=>{
  const storage=store(),client=createTutorialApi(storage),originalFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Tour must stay offline');};
  try{
    const record=(await client.request('/api/projects')).projects[0],p=record.project;
    assert.equal(p.interviews.length,1);assert.equal(p.quotes.length,2);assert.equal(p.statements.length,1);
    assert.ok(p.statements[0].checks.every(Boolean));assert.equal(p.statements[0].towerId,p.towers[0].id);assert.ok(p.towers[0].support);
    const reviews=(await client.request('/api/reviews')).reviews;
    assert.equal(reviews[0].source,'demo');assert.equal(reviews[0].targetId,p.statements[0].id);
    p.towers[0].support='An edited practice opportunity';
    await client.request('/api/projects','PUT',{project:p,revision:record.revision});
    assert.equal((await createTutorialApi(storage).request('/api/projects')).projects[0].project.towers[0].support,p.towers[0].support);
    await client.request('/api/reviews','POST',{projectId:p.id,targetId:p.statements[0].id,kind:'statement'});
  }finally{globalThis.fetch=originalFetch;}
});

test('tour reset and recovery preserve demo data, old practice, and real project drafts',async()=>{
  const storage=store();
  for(const k of ['mental-model-demo-v1','mental-model-tutorial-v1','mental-model-draft-real-user'])storage.setItem(k,`preserve ${k}`);
  const client=createTutorialApi(storage),first=(await client.request('/api/projects')).projects[0].project.id;
  assert.notEqual(client.reset().projects[0].project.id,first);
  for(const k of ['mental-model-demo-v1','mental-model-tutorial-v1','mental-model-draft-real-user'])assert.equal(storage.getItem(k),`preserve ${k}`);
  storage.setItem(tutorialKey,'invalid JSON');await assert.rejects(()=>client.request('/api/projects'),/could not be opened/);
  client.reset();assert.equal((await client.request('/api/projects')).projects.length,1);
});

test('every content coachmark targets a real element in the prepared example',async()=>{
  const api=createTutorialApi().request,p=(await api('/api/projects')).projects[0].project,reviews=(await api('/api/reviews')).reviews;
  const props={project:p,reviews,demo:true,busy:false,update(){},ask:async()=>{},notice(){},onContinue(){},onCancel(){},write(){},focusQuote:'',openQuotes(){},openStatements(){}};
  const html={interview:renderToStaticMarkup(createElement(InterviewView,props)),quotes:renderToStaticMarkup(createElement(QuotesView,props)),statements:renderToStaticMarkup(createElement(StatementsView,props)),map:renderToStaticMarkup(createElement(MapView,props))};
  for(const lesson of lessons){if(lesson.target.startsWith('nav-'))continue;assert.ok(html[lesson.view].includes(`data-tour="${lesson.target}"`),lesson.target);assert.ok(lesson.body.split(/\s+/).length<=26);}
  assert.match(html.map,/<article[^>]*data-tour-region="tower"/);
  assert.match(html.map,/<div class="tower-title"><h3 data-tour-region="tower"/);
  assert.match(html.map,/<button data-tour-region="tower"[^>]*>Edit tower<\/button>/);
  assert.match(html.map,/<span data-tour-region="support">Support opportunities<\/span><textarea data-tour-region="support"/);
});

test('tower and support spotlights hug their own content without including container whitespace',()=>{
  const outer={left:540,top:150,right:794,bottom:670};
  const statement={left:540,top:180,right:794,bottom:365};
  const title={left:572,top:378,right:762,bottom:404};
  const edit={left:612,top:410,right:722,bottom:428};
  const label={left:540,top:476,right:794,bottom:498};
  const field={left:540,top:507,right:794,bottom:640};
  const tower=tourContentRect([statement,title,edit],outer);
  const support=tourContentRect([label,field],outer);
  assert.equal(tower.top,statement.top);assert.equal(tower.bottom,edit.bottom);
  assert.equal(support.top,label.top);assert.equal(support.bottom,field.bottom);
  const viewport={width:1440,height:1000},size={width:340,height:260};
  const towerPos=positionTour(tower,size,viewport),supportPos=positionTour(support,size,viewport);
  assert.ok(towerPos.highlight.bottom<450,'the title padding and divider stay outside the highlight');
  assert.ok(towerPos.highlight.bottom<supportPos.highlight.top,'the two topics have separate highlight bounds');
  assert.ok(supportPos.highlight.bottom<outer.bottom,'support padding stays outside the highlight');
  assertAttached(towerPos);assertAttached(supportPos);
  const resized=tourContentRect([label,{...field,bottom:730}],outer);
  assert.equal(resized.bottom,730,'resizing the input updates the content bounds');
  assert.deepEqual(tourContentRect([] ,outer),outer,'ordinary targets keep their original bounds');
  assert.deepEqual(tourContentRect([{left:0,top:0,right:0,bottom:0},statement],outer),statement,'hidden regions add no empty space');
});

test('empty destinations and the finish screen have short, usable next actions',()=>{
  for(const view of ['overview','interview','quotes','statements','map','coaching','settings']){
    const html=renderToStaticMarkup(createElement(LearningStart,{view,onStart(){},onCreate(){}}));
    assert.ok(html.includes('Show me around'));assert.ok(html.includes('Create a project'));assert.ok(!html.includes('disabled=""'));
  }
  const done=renderToStaticMarkup(createElement(TutorialComplete,{onExit(){},onCreate(){},onRevisit(){}}));assert.ok(done.includes('Replay tour'));assert.ok(done.includes('Create a project'));
});

test('coachmark placement remains inside the viewport and avoids its desktop target',()=>{
  const anchor={left:24,top:340,right:218,bottom:388},size={width:340,height:230},viewport={width:1440,height:900};
  let p=positionTour(anchor,size,viewport);assert.equal(p.placement,'right');assert.ok(p.left>anchor.right);
  p=positionTour({left:1100,top:760,right:1400,bottom:880},size,viewport);assert.equal(p.placement,'left');assert.ok(p.top+size.height<=888);assert.ok(p.left+size.width<1100);
  for(const [width,height] of [[390,844],[320,568],[667,375],[1024,600]]){
    p=positionTour({left:18,top:70,right:width-18,bottom:350},size,{width,height});assert.ok(p.left>=12);assert.ok(p.top>=12);assert.ok(p.left+p.width<=width-12);assert.ok(p.top+Math.min(size.height,height-24)<=height-12);
  }
});

function assertAttached(p){
  const h=p.highlight,a=p.pointer;
  assert.ok(h&&a,'a visible target has a highlight and pointer');
  assert.equal(p.detached,false);
  assert.ok(p.left+p.width<=h.left||p.left>=h.right||p.top+p.height<=h.top||p.top>=h.bottom,'card does not cover the highlighted area');
  if(a.edge==='left'||a.edge==='right'){
    const y=p.top+a.offset;
    assert.ok(y>=h.top&&y<=h.bottom,'horizontal pointer meets the target');
    const gap=a.edge==='left'?p.left-h.right:h.left-p.left-p.width;
    assert.ok(Math.abs(gap-10)<.01,'pointer bridges the gap to the highlight');
  }else{
    const x=p.left+a.offset;
    assert.ok(x>=h.left&&x<=h.right,'vertical pointer meets the target');
    const gap=a.edge==='top'?p.top-h.bottom:h.top-p.top-p.height;
    assert.ok(Math.abs(gap-10)<.01,'pointer bridges the gap to the highlight');
  }
}

test('pointers stay attached on all four sides and near viewport corners',()=>{
  const size={width:340,height:250},viewport={width:1440,height:900};
  const cases=[
    [{left:18,top:300,right:218,bottom:348},viewport,'right'],
    [{left:1140,top:700,right:1400,bottom:800},viewport,'left'],
    [{left:40,top:120,right:320,bottom:180},{width:390,height:844},'bottom'],
    [{left:40,top:690,right:320,bottom:780},{width:390,height:844},'top'],
    [{left:18,top:0,right:218,bottom:14},viewport,'bottom'],
    [{left:18,top:886,right:218,bottom:900},viewport,'top'],
  ];
  for(const [anchor,v,side] of cases){const p=positionTour(anchor,size,v);assert.equal(p.placement,side);assertAttached(p);}
});

test('tall mobile editors retain an attached visible spotlight, including a reduced visual viewport',()=>{
  for(const viewport of [{width:390,height:700},{width:320,height:568},{width:667,height:375},{left:40,top:100,width:390,height:500}]){
    const x=viewport.left||0,y=viewport.top||0;
    const p=positionTour({left:x+22,top:y+20,right:x+viewport.width-22,bottom:y+980},{width:340,height:220},viewport);
    assert.equal(p.placement,'dock');assertAttached(p);
    assert.ok(p.left>=x+12&&p.top>=y+12);
    assert.ok(p.left+p.width<=x+viewport.width-12&&p.top+p.height<=y+viewport.height-12);
    assert.ok(p.highlight.top>=y&&p.highlight.bottom<=y+viewport.height);
  }
});

test('offscreen targets never leave a misleading pointer or spotlight behind',()=>{
  const viewport={width:1200,height:800},size={width:340,height:240};
  for(const anchor of [{left:300,top:-240,right:600,bottom:-10},{left:300,top:810,right:600,bottom:1000},{left:1300,top:100,right:1500,bottom:300}]){
    const p=positionTour(anchor,size,viewport);assert.equal(p.detached,true);assert.equal(p.pointer,null);assert.equal(p.highlight,null);
  }
});

test('all six tour positions can resume and corrupt or unrelated progress is ignored',()=>{
  const oldStorage=globalThis.localStorage;globalThis.localStorage=store();
  try{
    assert.equal(lessons.length,6);
    assert.equal(lessons.at(-1).view,'coaching');
    assert.equal(lessons.at(-1).target,'nav-coaching');
    for(let step=0;step<lessons.length;step++){saveTutorialProgress({projectId:'practice',step,finished:false});assert.equal(readTutorialProgress('practice').step,step);}
    saveTutorialProgress({projectId:'practice',step:5,finished:true});assert.equal(readTutorialProgress('practice').finished,true);
    assert.equal(readTutorialProgress('new-practice').step,0);
    globalThis.localStorage.setItem(`${tutorialKey}-progress`,JSON.stringify({projectId:'other',step:99,finished:true}));assert.equal(readTutorialProgress('other').step,0);
  }finally{globalThis.localStorage=oldStorage;}
});


test('existing eight-step progress resumes at the matching topic without changing practice data',()=>{
  const oldStorage=globalThis.localStorage;globalThis.localStorage=store();
  try{
    globalThis.localStorage.setItem(tutorialKey,'existing practice data');
    const expected=[0,0,1,2,2,2,3,4];
    for(let step=0;step<expected.length;step++){
      globalThis.localStorage.setItem(`${tutorialKey}-progress`,JSON.stringify({projectId:'legacy',step,finished:step===7}));
      const migrated=readTutorialProgress('legacy');
      assert.equal(migrated.step,expected[step]);assert.equal(migrated.finished,step===7);
      saveTutorialProgress(migrated);assert.equal(readTutorialProgress('legacy').step,expected[step]);
    }
    assert.equal(globalThis.localStorage.getItem(tutorialKey),'existing practice data');
  }finally{globalThis.localStorage=oldStorage;}
});
