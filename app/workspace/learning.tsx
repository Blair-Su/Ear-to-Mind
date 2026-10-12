'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft,Volume2,VolumeX,X } from 'lucide-react';
import { tourSound } from '@/lib/tutorial-audio';
import { ParticleButton } from '@/components/ui/particle-button';
import { lessons,type WorkspaceView } from '@/lib/tutorial';
import { positionTour,tourContentRect,type TourPosition } from '@/lib/tour-position';

const introductions:Record<WorkspaceView,{title:string;description:string}>={
  overview:{title:'Start with a conversation.',description:'Turn interview evidence into a clearer understanding of people.'},
  interview:{title:'Every model begins with listening.',description:'Bring in a transcript and save the words worth exploring.'},
  quotes:{title:'Keep their words close.',description:'Collect original quotes, then explore the intention behind them.'},
  statements:{title:'Find the intention inside the words.',description:'Write one idea, keep its source, and refine your thinking.'},
  map:{title:'See how intentions connect.',description:'Group related statements and explore opportunities for support.'},
  coaching:{title:'A coach for your thinking.',description:'Use questions and feedback to look more closely at your research.'},
  settings:{title:'Make a home for your research.',description:'Create a project to organize your interviews, statements, and model.'},
};

export function LearningStart({view,onStart,onCreate}:{view:WorkspaceView;onStart:()=>void;onCreate:()=>void}){
  const intro=introductions[view];
  return <section className="learning-start"><div className="page-heading"><div><h1>{intro.title}</h1><p>{intro.description}</p></div></div><div className="learning-start-actions"><button className="primary" onClick={onStart}>Show me around</button><button className="secondary" onClick={onCreate}>Create a project</button></div></section>;
}
export function LearningInvitation({onStart}:{onStart:()=>void}){return <div className="learning-invitation"><p>New here? Take a quick look around.</p><button className="secondary" onClick={onStart}>Show me around</button></div>;}

const destinationNames:Record<WorkspaceView,string>={overview:'Overview',interview:'Interviews',quotes:'Quotes',statements:'Statements',map:'Mental model',coaching:'Coach',settings:'Project settings'};
type GuideLayout=TourPosition&{visible:boolean;maxHeight:number;targetFound:boolean;stepKey:string};

export function TutorialGuide({step,view,onStep,onFinish,onClose}:{step:number;view:WorkspaceView;onStep:(n:number)=>void;onFinish:()=>void;onClose:()=>void}){
  const lesson=lessons[step],titleId=useId(),bodyId=useId(),stepKey=`${step}:${view}`;
  const panel=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null),anchorRef=useRef<HTMLElement|null>(null);
  const [soundEnabled,setSoundEnabled]=useState(true);
  const [advanceTarget,setAdvanceTarget]=useState('');
  const [mounted,setMounted]=useState(false),[layout,setLayout]=useState<GuideLayout>({left:12,top:12,width:340,height:260,maxHeight:600,placement:'dock',highlight:null,pointer:null,visible:false,detached:false,targetFound:true,stepKey:''});
  useEffect(()=>{setMounted(true);setSoundEnabled(tourSound.isEnabled());const silence=()=>{if(document.visibilityState==='hidden')tourSound.stop();};document.addEventListener('visibilitychange',silence);return ()=>document.removeEventListener('visibilitychange',silence);},[]);
  useEffect(()=>{
    if(!mounted)return;
    let frame=0,anchor:HTMLElement|null=null,stopped=false;
    let observedRegions:HTMLElement[]=[];
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const resize=new ResizeObserver(schedule);
    const release=(target:HTMLElement)=>{
      target.classList.remove('tour-target');
      const descriptions=(target.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==bodyId);
      if(descriptions.length)target.setAttribute('aria-describedby',descriptions.join(' '));else target.removeAttribute('aria-describedby');
    };
    function measure(){
      if(stopped||!panel.current)return;
      if(document.querySelector('dialog[open]')){if(anchor)release(anchor);setLayout(p=>p.visible?{...p,visible:false}:p);return;}
      const exact=view===lesson.view?document.querySelector<HTMLElement>(`[data-tour="${lesson.target}"]`):null;
      const target=exact||document.querySelector<HTMLElement>(`[data-tour="nav-${lesson.view}"]`);
      if(!target){if(anchor)release(anchor);setLayout(p=>p.visible?{...p,visible:false}:p);return;}
      const regions=Array.from(target.querySelectorAll<HTMLElement>('[data-tour-region]')).filter(el=>el.dataset.tourRegion===target.dataset.tour);
      for(const old of observedRegions)if(!regions.includes(old))resize.unobserve(old);
      for(const region of regions)if(!observedRegions.includes(region))resize.observe(region);
      observedRegions=regions;
      const contentRect=()=>tourContentRect(regions.map(el=>el.getBoundingClientRect()),target.getBoundingClientRect());
      const changed=target!==anchor;
      if(changed){
        if(anchor){release(anchor);resize.unobserve(anchor);}
        anchor=target;anchorRef.current=regions[0]||target;resize.observe(target);
        anchorRef.current.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      }
      target.classList.add('tour-target');
      const descriptions=new Set((target.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
      descriptions.add(bodyId);target.setAttribute('aria-describedby',[...descriptions].join(' '));
      const vv=window.visualViewport,viewport={width:vv?.width||window.innerWidth,height:vv?.height||window.innerHeight,left:vv?.offsetLeft||0,top:vv?.offsetTop||0};
      const width=Math.min(340,viewport.width-24);
      const maxHeight=Math.min(viewport.height-24,viewport.width<700?Math.max(200,viewport.height*.45):600);
      const height=Math.min(panel.current.getBoundingClientRect().height||260,maxHeight);
      let rect=contentRect(),pos=positionTour(rect,{width,height},viewport,lesson.side);
      if(changed&&pos.placement==='dock'&&target.closest('.mm-main')){
        window.scrollBy({top:rect.top-(viewport.top+20),behavior:'instant'});
        rect=contentRect();pos=positionTour(rect,{width,height},viewport,lesson.side);
      }
      const next={...pos,maxHeight,visible:true,targetFound:!!exact,stepKey};
      setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
    }
    if(panel.current)resize.observe(panel.current);
    const mutations=new MutationObserver(schedule);mutations.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
    window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
    window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
    schedule();
    return ()=>{stopped=true;cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();if(anchor)release(anchor);anchorRef.current=null;window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);};
  },[mounted,step,view,lesson,bodyId,stepKey]);
  const ready=layout.visible&&layout.stepKey===stepKey;
  useEffect(()=>{if(ready)heading.current?.focus({preventScroll:true});},[ready,stepKey]);
  useEffect(()=>{
    if(!ready||advanceTarget!==stepKey)return;
    const timer=window.setTimeout(()=>setAdvanceTarget(''),550);
    return ()=>window.clearTimeout(timer);
  },[ready,advanceTarget,stepKey]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();tourSound.stop();void tourSound.play('close');onClose();}};window.addEventListener('keydown',escape);return ()=>window.removeEventListener('keydown',escape);},[onClose]);
  function closeTour(){tourSound.stop();void tourSound.play('close');onClose();}
  function previous(){setAdvanceTarget('');void tourSound.play('back');onStep(step-1);}
  function next(){
    const complete=view===lesson.view&&step===lessons.length-1;
    const destination=view!==lesson.view?step:Math.min(step+1,lessons.length-1);
    if(!complete)setAdvanceTarget(`${destination}:${lessons[destination].view}`);
    void tourSound.play(complete?'complete':'next');
    if(complete)onFinish();else onStep(destination);
  }
  function toggleSound(){const enabled=!soundEnabled;tourSound.setEnabled(enabled);setSoundEnabled(enabled);if(enabled)void tourSound.play('next');}
  if(!mounted)return null;
  const highlight=layout.highlight,pointer=layout.pointer;
  const vertical=pointer?.edge==='top'||pointer?.edge==='bottom';
  const pointerPaths={left:'M10 0 L0 10 L10 20',right:'M0 0 L10 10 L0 20',top:'M0 10 L10 0 L20 10',bottom:'M0 0 L10 10 L20 0'};
  const body=layout.targetFound?lesson.body:view!==lesson.view?`Open ${destinationNames[lesson.view]} to return to this part of the tour.`:'This example is no longer available here. Continue to the next step.';
  return createPortal(<div className="mm-app tour-layer" data-ready={ready} style={{visibility:ready?'visible':'hidden'}}>
    {highlight&&<div className="tour-spotlight" aria-hidden="true" style={{left:highlight.left,top:highlight.top,width:highlight.right-highlight.left,height:highlight.bottom-highlight.top}}/>}
    <div className="tour-callout" data-placement={layout.placement} data-edge={pointer?.edge} style={{left:layout.left,top:layout.top,width:layout.width}}>
      <div className="tour-motion">
      <section ref={panel} className="tour-popover" role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={bodyId} style={{maxHeight:layout.maxHeight}}>
        <div className="tour-toolbar" role="group" aria-label="Tour controls">
          <div className="tour-back-slot">{step>0&&<button type="button" className="tour-icon-button tour-back" aria-label="Previous step" title="Previous step" onClick={previous}><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true"/></button>}</div>
          <div className="tour-utility-actions"><button type="button" className="tour-icon-button tour-sound" aria-label="Tutorial sounds" aria-pressed={soundEnabled} title={soundEnabled?"Mute tutorial sounds":"Enable tutorial sounds"} onClick={toggleSound}>{soundEnabled?<Volume2 size={18} strokeWidth={1.75} aria-hidden="true"/>:<VolumeX size={18} strokeWidth={1.75} aria-hidden="true"/>}</button><button type="button" className="tour-icon-button tour-close" aria-label="Close tour" title="Close tour" onClick={closeTour}><X size={18} strokeWidth={1.75} aria-hidden="true"/></button></div>
        </div>
        <h2 ref={heading} tabIndex={-1} id={titleId}>{layout.targetFound?lesson.title:destinationNames[lesson.view]}</h2>
        <p id={bodyId}>{body}</p>
        {layout.detached&&<button className="plain tour-find" onClick={()=>anchorRef.current?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})}>Show me where</button>}
        <div className="tour-actions" data-advanced={advanceTarget===stepKey}>
          <div className="tour-progress" role="progressbar" aria-label="Tour progress" aria-valuemin={1} aria-valuemax={lessons.length} aria-valuenow={step+1} aria-valuetext={`Step ${step+1} of ${lessons.length}: ${lesson.title}`}>{lessons.map((item,i)=><span aria-hidden="true" key={item.target} className={i===step?'current':i<step?'complete':''}/>)}</div>
          <ParticleButton className="primary tour-next" effectTrigger="hover" onClick={next}>{view!==lesson.view?'Show this step':step===lessons.length-1?'Done':'Next'}</ParticleButton>
        </div>
      </section>
      {pointer&&<svg aria-hidden="true" className={`tour-pointer pointer-${pointer.edge}`} viewBox={vertical?'0 0 20 10':'0 0 10 20'} style={vertical?{left:pointer.offset-10}:{top:pointer.offset-10}}><path d={pointerPaths[pointer.edge]}/></svg>}
      </div>
    </div>
  </div>,document.body);
}

export function TutorialComplete({onExit,onCreate,onRevisit}:{onExit:()=>void;onCreate:()=>void;onRevisit:()=>void}){
  return <section className="learning-start"><div className="page-heading"><div><h1>You’re ready to start.</h1><p>Begin with one question and one interview. You can replay the tour anytime.</p></div></div><div className="learning-start-actions"><button className="primary" onClick={onCreate}>Create a project</button><button className="secondary" onClick={onRevisit}>Replay tour</button><button className="plain" onClick={onExit}>Return to workspace</button></div></section>;
}
