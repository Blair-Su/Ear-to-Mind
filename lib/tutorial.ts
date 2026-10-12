import { createDemoApi,demoFeedback,type DemoData } from './demo';
import { sampleProject,now,uid,reviewSnapshot,type Project } from './research';

export type WorkspaceView='overview'|'interview'|'quotes'|'statements'|'map'|'coaching'|'settings';
export const tutorialKey='mental-model-tour-v2';
export const tutorialPassage='I kept opening the fridge. I just didn’t want to make another decision. By the end of the day, even choosing dinner felt like work.';

export const lessons=[
  {view:'interview',target:'nav-interview',title:'Interviews',body:'Paste a transcript, then select a passage and click Save selected quote. This fictional example is ready to explore.',side:'right'},
  {view:'quotes',target:'quote',title:'Saved quote',body:'A quote keeps its source. Click Write a statement to explore the intention behind it.',side:'right'},
  {view:'statements',target:'statement-editor',title:'Statement editor',body:'Choose a lens and write one intention. Refine it with coach feedback, then complete the six review checks before mapping.',side:'left'},
  {view:'map',target:'tower',title:'Intention tower',body:'Group related statements into a tower. Mental spaces bring related towers together.',side:'right'},
  {view:'map',target:'support',title:'Support opportunities',body:'Write opportunities for support below the line. Keep them connected to the human intention above.',side:'right'},
  {view:'coaching',target:'nav-coaching',title:'Practice coach',body:'Try a statement review, then revisit your feedback in Coaching history. Practice uses scripted examples; your own project connects to ChatGPT.',side:'right'},
] as const satisfies readonly {view:WorkspaceView;target:string;title:string;body:string;side:'right'|'left'}[];

export function initialTutorial():DemoData{
  const project=sampleProject(),at=now();
  project.interviews[0].participant='Participant 01';
  project.quotes.forEach(q=>q.participant='Participant 01');
  project.statements=[{...project.statements[0],text:'Avoid making another decision',lens:'Thought'}];
  project.towers[0].name='Reduce decision effort';
  project.towers[0].support='Make familiar options easier to compare.';
  const snapshot=reviewSnapshot(project,'statement',project.statements[0].id);
  return {version:1,projects:[{project,revision:1,updatedAt:at}],reviews:[{id:uid(),projectId:project.id,targetId:project.statements[0].id,kind:'statement',source:'demo',status:'completed',snapshot,feedback:demoFeedback('statement',snapshot),createdAt:at,completedAt:at}]};
}

export function tutorialEvidence(project:Project){
  const quote=project.quotes.find(q=>q.text.trim().length>0&&project.interviews.some(i=>i.id===q.interviewId&&i.text.includes(q.text)));
  const drafts=project.statements.filter(s=>s.quoteId===quote?.id);
  const statement=drafts.find(s=>s.text.trim()&&s.lens==='Thought')||drafts[0];
  const tower=project.towers.find(t=>t.id===statement?.towerId);
  return {quote,statement,tower};
}

export const createTutorialApi=(storage?:Pick<Storage,'getItem'|'setItem'>)=>createDemoApi(storage,{key:tutorialKey,initial:initialTutorial});
let client:ReturnType<typeof createTutorialApi>|undefined;
let persistent=true;
function browserClient(){if(!client){let storage:Storage|undefined;try{const s=window.localStorage;s.setItem(`${tutorialKey}-probe`,'1');s.removeItem(`${tutorialKey}-probe`);storage=s;}catch{persistent=false;}client=createTutorialApi(storage);}return client;}
export const tutorialApi=<T,>(path:string,method='GET',input?:unknown)=>browserClient().request<T>(path,method,input);
export const resetTutorial=()=>browserClient().reset();
export const tutorialSaveLabel=()=>persistent?'Practice saved in this browser':'Practice saved for this session';

type Progress={projectId:string;step:number;finished:boolean};
let memoryProgress:Progress|null=null;
const legacyTargets=['nav-interview','transcript','quote','statement-editor','feedback','review-checks','tower','support'];
const mergedTargets:Record<string,string>={transcript:'nav-interview',feedback:'statement-editor','review-checks':'statement-editor'};
export function readTutorialProgress(projectId:string):Progress{
  const fallback={projectId,step:0,finished:false};
  try{const p=JSON.parse(localStorage.getItem(`${tutorialKey}-progress`)||'null');
    if(p?.projectId===projectId&&Number.isInteger(p.step)&&p.step>=0&&typeof p.finished==='boolean'){
      // Stable target IDs preserve progress when tour steps are merged or reordered.
      const target=p.stepTarget===undefined?legacyTargets[p.step]:p.stepTarget;
      if(typeof target==='string'){
        const step=lessons.findIndex(lesson=>lesson.target===(mergedTargets[target]||target));
        if(step>=0)return {projectId,step,finished:p.finished};
      }
    }
  }catch{}
  return memoryProgress?.projectId===projectId?memoryProgress:fallback;
}
export function saveTutorialProgress(progress:Progress){
  const lesson=lessons[progress.step];if(!lesson)return;
  memoryProgress=progress;
  try{localStorage.setItem(`${tutorialKey}-progress`,JSON.stringify({...progress,stepTarget:lesson.target}));}catch{}
}
