import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['lib/tutorial-audio.ts'],outfile:'.sites-runtime/tour-audio-test.mjs',bundle:true,platform:'node',format:'esm'});
const {createTourSoundPlayer,tourSoundKey}=await import('../.sites-runtime/tour-audio-test.mjs');
function fixture(){
  const stored=new Map(),oscillators=[],gains=[];let time=0,visible=true,contexts=0;
  const param=()=>({value:1,events:[],setValueAtTime(value,at){this.events.push(['set',value,at]);},linearRampToValueAtTime(value,at){this.events.push(['linear',value,at]);},exponentialRampToValueAtTime(value,at){this.events.push(['exp',value,at]);},cancelAndHoldAtTime(at){this.events.push(['hold',at]);}});
  const context={state:'running',currentTime:0,destination:{},async resume(){this.state='running';},createGain(){const g={gain:param(),connect(){this.initialGain=this.gain.value;},disconnect(){this.disconnected=true;}};gains.push(g);return g;},createOscillator(){const o={type:'',frequency:param(),stops:[],connect(){},start(at){this.started=at;},stop(at){this.stops.push(at);},disconnect(){this.disconnected=true;}};oscillators.push(o);return o;}};
  const storage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
  const options={createContext:()=>{contexts++;return context;},storage:()=>storage,visible:()=>visible,now:()=>time};
  return {context,oscillators,gains,storage,options,player:createTourSoundPlayer(options),contexts:()=>contexts,advance(ms){time+=ms;context.currentTime=time/1000;},hide(){visible=false;}};
}

test('audio is lazy, muting persists, and a storage failure still respects mute',async()=>{
  const f=fixture();assert.equal(f.player.isEnabled(),true);assert.equal(f.contexts(),0);
  f.player.setEnabled(false);await f.player.play('next');assert.equal(f.contexts(),0);
  assert.equal(f.storage.getItem(tourSoundKey),'off');assert.equal(createTourSoundPlayer(f.options).isEnabled(),false);
  f.storage.setItem(tourSoundKey,'on');f.storage.setItem=()=>{throw new Error('Storage unavailable');};
  const player=createTourSoundPlayer(f.options);assert.equal(player.isEnabled(),true);player.setEnabled(false);
  await player.play('next');assert.equal(player.isEnabled(),false);assert.equal(f.contexts(),0);
});

test('cues use audible bounded levels, smooth envelopes, finite tails, and disconnected voices',async()=>{
  for(const cue of ['next','back','complete','close']){
    const f=fixture();await f.player.play(cue);
    assert.ok(f.oscillators.length>0&&f.oscillators.length<=3);
    assert.equal(new Set(f.oscillators.map(o=>o.started)).size,cue==='complete'?3:1,'only Done has a short musical sequence');
    for(const oscillator of f.oscillators){
      assert.equal(oscillator.type,'sine');assert.ok(oscillator.stops[0]<.35);
      const pitch=oscillator.frequency.events;
      if(cue!=='next')assert.equal(pitch.length,1,'only the jelly impact bends pitch');
      for(let i=0;i<pitch.length;i++){
        assert.ok(pitch[i][1]>=120&&pitch[i][1]<=2400,'pitch stays within a bounded, audible range');
        assert.ok(pitch[i][2]<oscillator.stops[0],'pitch movement ends before the voice stops');
        if(i)assert.ok(pitch[i][2]>pitch[i-1][2],'pitch automation stays ordered');
      }
      oscillator.onended();assert.equal(oscillator.disconnected,true);
    }
    for(const gain of f.gains){
      assert.equal(gain.initialGain,0,'even future notes start with silent intrinsic gain');
      const events=gain.gain.events;assert.equal(events[0][1],0);
      assert.ok(events[1][2]-events[0][2]>=.002,'even a crisp onset ramps up from silence');
      assert.ok(events[1][1]<=.06,'each voice has a bounded peak');assert.equal(events.at(-1)[1],0);
      for(let i=1;i<events.length;i++)assert.ok(events[i][2]>events[i-1][2],'envelope times stay ordered, including short overtones');
      assert.equal(gain.disconnected,true);
    }
    const peak=f.gains.reduce((sum,g)=>sum+g.gain.events[1][1],0);
    assert.ok(peak>=.03&&peak<.12,'bounded playback gain, including overlapping completion notes');
  }
});

test('Next is one short impact with a diminishing elastic rebound',async()=>{
  const f=fixture();await f.player.play('next');
  assert.equal(new Set(f.oscillators.map(o=>o.started)).size,1,'all parts form one impact');
  const elastic=f.oscillators.filter(o=>o.frequency.events.length>2);
  assert.equal(elastic.length,2,'the main impact and its quiet body rebound together');
  for(const oscillator of elastic){
    const pitch=oscillator.frequency.events.map(event=>event[1]),settled=pitch.at(-1);
    assert.ok(pitch[0]>pitch[1]&&pitch[2]>pitch[1]&&pitch[3]<pitch[2],'compression followed by a rebound');
    for(let i=1;i<pitch.length;i++)assert.ok(Math.abs(pitch[i]-settled)<Math.abs(pitch[i-1]-settled),'the wobble loses energy as it settles');
    assert.ok(oscillator.stops[0]-oscillator.started<=.25,'no lingering boing');
  }
  const snap=f.oscillators.find(o=>o.frequency.events.length===2);
  assert.ok(snap.frequency.events[0][1]>1000&&snap.stops[0]-snap.started<.06,'a brief bright onset adds crispness');
});

test('Done rises in three short notes and Close cancels its remaining notes immediately',async()=>{
  const f=fixture();await f.player.play('complete');const notes=[...f.oscillators];
  assert.equal(notes.length,3);
  for(let i=1;i<notes.length;i++){
    assert.ok(notes[i].started>notes[i-1].started);
    assert.ok(notes[i].frequency.events[0][1]>notes[i-1].frequency.events[0][1]);
  }
  f.advance(10);await f.player.play('close');
  assert.equal(f.oscillators.length,4,'Close is not suppressed by the click rate limit');
  for(const note of notes)assert.ok(note.stops.at(-1)<=f.context.currentTime+.026);
  const close=f.oscillators.at(-1);
  assert.ok(close.stops[0]-close.started<.1,'Close is a short ending cue');
});

test('repeated steps keep the same cue level instead of escalating',async()=>{
  const f=fixture(),cues=[];
  for(let i=0;i<6;i++){
    const start=f.oscillators.length;await f.player.play('next');
    cues.push(f.oscillators.slice(start).map((o,j)=>({frequency:o.frequency.events[0][1],gain:f.gains[start+j].gain.events[1][1]})));
    f.advance(400);
  }
  for(const cue of cues)assert.deepEqual(cue,cues[0]);
});

test('rapid clicking is bounded and mute fades current voices immediately',async()=>{
  const f=fixture();await f.player.play('next');const nextCount=f.oscillators.length;
  await f.player.play('next');assert.equal(f.oscillators.length,nextCount);
  f.advance(180);await f.player.play('back');const activeCount=f.oscillators.length;assert.ok(activeCount>nextCount);
  assert.ok(f.oscillators[0].stops.at(-1)<=f.context.currentTime+.026);
  f.player.setEnabled(false);for(const o of f.oscillators)assert.ok(o.stops.at(-1)<=f.context.currentTime+.026);
  f.advance(200);await f.player.play('complete');assert.equal(f.oscillators.length,activeCount);
});

test('suspended, hidden, missing, or rejected audio never delays or breaks the tour',async()=>{
  for(const action of ['mute','stop','hide','late']){
    const f=fixture();let release;f.context.state='suspended';
    f.context.resume=()=>new Promise(resolve=>{release=()=>{f.context.state='running';resolve();};});
    const pending=f.player.play('next');
    if(action==='mute')f.player.setEnabled(false);if(action==='stop')f.player.stop();if(action==='hide')f.hide();if(action==='late')f.advance(600);
    release();await pending;assert.equal(f.oscillators.length,0);
  }
  const f=fixture();f.context.state='suspended';f.context.resume=async()=>{throw new Error('Audio blocked');};await assert.doesNotReject(()=>f.player.play('next'));
  const missing=createTourSoundPlayer({...f.options,createContext:()=>undefined});await assert.doesNotReject(()=>missing.play('complete'));
});
