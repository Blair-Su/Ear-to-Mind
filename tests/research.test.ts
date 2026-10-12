import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Node's strip-types test runner resolves TypeScript source directly.
import { sampleProject,projectSchema,reviseStatement,removeSpace,removeTower,reviewSnapshot,feedbackSchema } from '../lib/research.ts';

test('sample project preserves evidence and valid relationships',()=>{
  const p=sampleProject();assert.equal(projectSchema.safeParse(p).success,true);
  assert.equal(p.quotes.length,2);assert.equal(p.statements[0].quoteId,p.quotes[0].id);
});
test('changing a statement invalidates review and map placement',()=>{
  const p=sampleProject(),s=p.statements[0];const changed=reviseStatement(s,'Check available ingredients','Action');
  assert.equal(changed.towerId,null);assert.deepEqual(changed.checks,[false,false,false,false,false,false]);
  assert.equal(s.towerId,p.towers[0].id);assert.equal(reviseStatement(s,s.text,s.lens),s);
});
test('deleting a grouping keeps the research statements',()=>{
  const p=sampleProject();const withoutTower=removeTower(p,p.towers[0].id);
  assert.equal(withoutTower.statements.length,2);assert.equal(withoutTower.statements[0].towerId,null);assert.equal(withoutTower.quotes.length,2);
  const withoutSpace=removeSpace(p,p.spaces[0].id);assert.equal(withoutSpace.towers.length,0);assert.equal(withoutSpace.statements[0].towerId,null);
  assert.equal(projectSchema.safeParse(withoutSpace).success,true);
});
test('invalid graph relationships and duplicate identifiers are rejected',()=>{
  const p=sampleProject();p.statements[0].quoteId='missing';assert.equal(projectSchema.safeParse(p).success,false);
  const p2=sampleProject();p2.quotes.push(p2.quotes[0]);assert.equal(projectSchema.safeParse(p2).success,false);
  const p3=sampleProject();p3.statements[0].checks[0]=false;assert.equal(projectSchema.safeParse(p3).success,false);
});
test('consent is required for transcript, question, statement and map coaching',()=>{
  const p=sampleProject();p.interviews[0].consent=false;
  for(const kind of ['interview','question','statement','map'] as const)assert.throws(()=>reviewSnapshot(p,kind,kind==='statement'?p.statements[0].id:p.interviews[0].id,'What happened?'),/consent|permission/i);
});
test('review snapshots hold the submitted version and source quote',()=>{
  const p=sampleProject();const snap=reviewSnapshot(p,'statement',p.statements[0].id);
  p.statements[0].text='Edited after review';assert.equal(snap.statement,'Check what is in the fridge');assert.equal(snap.quote,p.quotes[0].text);
});
test('feedback rejects missing required fields and duplicate rubric judgments',()=>{
  assert.equal(feedbackSchema.safeParse({strength:'Okay'}).success,false);
  const f={strength:'Faithful to the quote',improvement:'Check the scope',question:'What matters most here?',suggestions:[],checks:[{criterion:1,status:'pass',reason:'Evidence supplied'},{criterion:1,status:'pass',reason:'Repeated'}]};
  assert.equal(feedbackSchema.safeParse(f).success,false);
  f.checks.pop();assert.equal(feedbackSchema.safeParse(f).success,true);
});
