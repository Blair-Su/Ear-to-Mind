import { z } from 'zod';
import { sampleProject,newStatement,projectSchema,reviewKindSchema,feedbackSchema,reviewSnapshot,formatCheck,uid,now,type Project,type Review,type Feedback,type SavedProject,type ReviewKind } from './research';

export const demoKey='mental-model-demo-v1';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export type DemoData={version:1;projects:SavedProject[];reviews:Review[]};
const dataSchema=z.object({version:z.literal(1),projects:z.array(z.object({project:projectSchema,revision:z.number().int().positive(),updatedAt:z.string().datetime()})),reviews:z.array(z.object({id:z.string(),projectId:z.string(),targetId:z.string(),kind:reviewKindSchema,status:z.enum(['completed','cancelled']),source:z.literal('demo'),snapshot:z.record(z.unknown()),feedback:feedbackSchema,createdAt:z.string().datetime(),completedAt:z.string().datetime()}))});

export function demoFeedback(kind:ReviewKind,snapshot:Record<string,unknown>):Feedback{
  if(kind==='statement'){
    const text=String(snapshot.statement||''),hints=formatCheck(text);
    const original=text==='Avoid making another decision about dinner';
    return {
      strength:original?'The draft stays with the participant’s mental effort, rather than describing a product feature.':'You have kept the source quote beside your draft, so you can check every interpretation against the evidence.',
      improvement:original?'Look at “about dinner.” Is that essential to the intention, or is it the setting in which the intention appears?':hints.solution?'A product term appears in the draft. Revisit what the person is trying to work out underneath that solution.':hints.multiple?'Check whether the draft contains two intentions that deserve their own space.':'Read the draft back against the quote. Notice which words come from the participant and which are your interpretation.',
      question:original?'What is this person trying to give themselves a break from?':'Which exact words in the quote support the intention you have named?',
      suggestions:[],
      checks:Array.from({length:6},(_,criterion)=>({criterion,status:criterion===5?(hints.short?'pass':'revisit'):'unclear',reason:criterion===5?`${hints.words} words. This is a local length check; meaning still needs your judgment.`:'Review this against the source yourself. Demo feedback does not evaluate meaning.'})),
    };
  }
  if(kind==='interview'){
    const fridge=String(snapshot.transcript||'').includes('I kept opening the fridge');
    return {strength:'The notes keep a specific experience available to revisit.',improvement:'Stay with one moment before moving to a new topic. These are scripted demo prompts; check that each fits the participant’s actual words.',question:'What feels worth staying with for a little longer?',checks:[],suggestions:[
      {lens:'Thought',question:fridge?'What was going through your mind when you opened the fridge again?':'What was going through your mind at that moment?',reason:'Invites the person to recall their thinking, without supplying a reason.'},
      {lens:'Feeling',question:fridge?'What did having another decision to make feel like then?':'What was that experience like for you?',reason:'Makes room for the participant’s own description of the experience.'},
      {lens:'Philosophy',question:fridge?'What mattered to you about having one less thing to decide?':'What mattered to you in that moment?',reason:'Opens a possible belief without assuming what it is.'},
    ]};
  }
  if(kind==='question')return {strength:'You are taking a moment to examine the question before asking it.',improvement:'Check for an assumed feeling, a hypothetical situation, or two questions joined together. This is a demo checklist, not an AI assessment.',question:'Could the participant answer from a specific memory, using their own words?',checks:[],suggestions:[]};
  return {strength:'The map keeps human intentions and possible product support in separate places.',improvement:'Choose one tower and revisit its original quotes. A shared topic may still contain different intentions.',question:'What shared intention connects these statements, and how is it different from the tower next to it?',checks:[],suggestions:[]};
}

function makeReview(p:Project,kind:ReviewKind,targetId:string,question=''):Review{
  const snapshot=reviewSnapshot(p,kind,targetId,question),at=now();
  return {id:uid(),projectId:p.id,targetId,kind,source:'demo',status:'completed',snapshot,feedback:demoFeedback(kind,snapshot),createdAt:at,completedAt:at};
}

export function initialDemo():DemoData{
  const p=sampleProject(),at=now(),firstInterview=p.interviews[0].id,firstSpace=p.spaces[0].id,firstTower=p.towers[0].id;
  const chooseTower=uid(),secondSpace=uid(),secondTower=uid(),secondInterview=uid();
  p.interviews[0].participant='Participant 01';p.quotes.forEach(q=>q.participant='Participant 01');
  p.interviews.push({id:secondInterview,title:'Making space to unwind',participant:'Participant 02',consent:true,createdAt:at,text:'Interviewer: Tell me about the last time dinner felt difficult.\n\nParticipant: I got home late and stood in the kitchen. I looked at what was left before deciding what I could make.\n\nInterviewer: What were you thinking about then?\n\nParticipant: I was weighing how much energy cooking would take against the time I had left. I wanted the rest of the evening to feel like mine.\n\nInterviewer: What did that mean to you?\n\nParticipant: I believe evenings should leave room to recover. I did not want the whole evening to become another set of tasks.'});
  const extra=[
    {text:'I was thinking about what I could manage before it got too late. I made the same pasta I always make.',participant:'Participant 01',interviewId:firstInterview},
    {text:'I looked at what was left before deciding what I could make.',participant:'Participant 02',interviewId:secondInterview},
    {text:'I was weighing how much energy cooking would take against the time I had left.',participant:'Participant 02',interviewId:secondInterview},
    {text:'I believe evenings should leave room to recover. I did not want the whole evening to become another set of tasks.',participant:'Participant 02',interviewId:secondInterview},
  ].map(q=>({...q,id:uid(),createdAt:at}));p.quotes.push(...extra);
  p.spaces.push({id:secondSpace,name:'Protect the evening'});
  p.towers[0].support='Make it easier to see what is already available.';
  p.towers.push({id:chooseTower,spaceId:firstSpace,name:'Find a manageable option',support:'Reduce the effort of comparing familiar options.'},{id:secondTower,spaceId:secondSpace,name:'Make room to recover',support:'Help preserve time and energy after dinner.'});
  const ready=(q:string,text:string,lens:StatementLens,towerId:string)=>({...newStatement(q),text,lens,towerId,checks:[true,true,true,true,true,true]});
  p.statements=[
    {...newStatement(p.quotes[0].id),text:'Avoid making another decision about dinner',revisions:[{text:'Avoid making another decision about dinner',lens:'Thought',at}]},
    ready(p.quotes[0].id,'Check what is in the fridge','Action',firstTower),
    ready(extra[0].id,'Choose a familiar meal','Action',chooseTower),
    ready(extra[2].id,'Weigh effort against available time','Thought',chooseTower),
    ready(p.quotes[1].id,'Feel worn out by choosing','Feeling',secondTower),
    ready(extra[3].id,'Value time to recover','Philosophy',secondTower),
  ];
  return {version:1,projects:[{project:p,revision:1,updatedAt:at}],reviews:[makeReview(p,'statement',p.statements[0].id),makeReview(p,'interview',firstInterview)]};
}
type StatementLens=Project['statements'][number]['lens'];

export function createDemoApi(storage?:StorageLike,options:{key?:string;initial?:()=>DemoData}={}){
  const storageKey=options.key||demoKey,seed=options.initial||initialDemo;
  let memory:DemoData|undefined;
  function read(){if(!storage&&memory)return structuredClone(memory);const raw=storage?.getItem(storageKey);if(raw){let result;try{result=dataSchema.safeParse(JSON.parse(raw));}catch{}if(!result?.success)throw new Error('Your saved practice could not be opened. Reset the demo or restart the tutorial to begin again.');memory=result.data;}else{memory=seed();storage?.setItem(storageKey,JSON.stringify(memory));}return structuredClone(memory);}
  function write(data:DemoData){storage?.setItem(storageKey,JSON.stringify(data));memory=structuredClone(data);}
  async function request<T>(path:string,method='GET',input?:unknown):Promise<T>{
    const state=read(),url=new URL(path,'https://demo.local');let result:unknown;
    if(url.pathname==='/api/projects'){
      if(method==='GET')result={projects:state.projects};
      else if(method==='POST'){const p=projectSchema.parse(input);if(state.projects.some(r=>r.project.id===p.id))throw new Error('Project already exists.');const saved={project:p,revision:1,updatedAt:now()};state.projects.unshift(saved);result=saved;}
      else if(method==='PUT'){const {project:p,revision}=z.object({project:projectSchema,revision:z.number().int()}).parse(input);const index=state.projects.findIndex(r=>r.project.id===p.id);if(index<0||state.projects[index].revision!==revision)throw new Error('This demo changed. Load the latest version before saving.');const saved={project:p,revision:revision+1,updatedAt:now()};state.projects[index]=saved;result=saved;}
      else if(method==='DELETE'){const {id}=z.object({id:z.string()}).parse(input);state.projects=state.projects.filter(r=>r.project.id!==id);state.reviews=state.reviews.filter(r=>r.projectId!==id);result={deleted:true};}
      else throw new Error('Unsupported demo action.');
    }else if(url.pathname==='/api/reviews'){
      if(method==='GET'){const id=url.searchParams.get('projectId');result={reviews:state.reviews.filter(r=>!id||r.projectId===id)};}
      else if(method==='POST'){const args=z.object({projectId:z.string(),kind:reviewKindSchema,targetId:z.string(),question:z.string().default('')}).parse(input);const p=state.projects.find(r=>r.project.id===args.projectId)?.project;if(!p)throw new Error('Project not found.');const r=makeReview(p,args.kind,args.targetId,args.question);const duplicate=state.reviews.find(x=>x.projectId===r.projectId&&x.kind===r.kind&&x.targetId===r.targetId&&JSON.stringify(x.snapshot)===JSON.stringify(r.snapshot));if(duplicate)result=duplicate;else{state.reviews.unshift(r);state.reviews=state.reviews.slice(0,100);result=r;}}
      else if(method==='DELETE'){const {id}=z.object({id:z.string()}).parse(input);state.reviews=state.reviews.filter(r=>r.id!==id);result={cancelled:true};}
      else throw new Error('Unsupported demo action.');
    }else throw new Error('This action is not part of the offline demo.');
    if(method!=='GET')write(state);return structuredClone(result) as T;
  }
  return {request,reset(){const data=seed();write(data);return data;}};
}
let client:ReturnType<typeof createDemoApi>|undefined;
let persistent=true;
function browserClient(){if(!client){let storage:StorageLike|undefined;try{const s=window.localStorage;const probe='mental-model-demo-probe';s.setItem(probe,'1');s.removeItem(probe);storage=s;}catch{persistent=false;}client=createDemoApi(storage);}return client;}
export const demoApi=<T,>(path:string,method='GET',input?:unknown)=>browserClient().request<T>(path,method,input);
export const resetDemo=()=>browserClient().reset();
export const demoSaveLabel=()=>persistent?'Saved in this browser':'Saved for this session';
