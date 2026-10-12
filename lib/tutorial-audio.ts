export type TourSound='next'|'back'|'complete'|'close';
type PreferenceStore=Pick<Storage,'getItem'|'setItem'>;
type AudioOptions={createContext:()=>AudioContext|undefined;storage:()=>PreferenceStore|undefined;visible:()=>boolean;now:()=>number};
export const tourSoundKey='mental-model-tour-sound';

type Tone={frequency:number;duration:number;gain:number;attack:number;offset?:number;shape?:'elastic'|'snap'};
// Match the approved card preview at its default volume and crispness.
const cues:Record<TourSound,Tone[]>={
  next:[
    {frequency:480,duration:.17,gain:.055,attack:.004,shape:'elastic'},
    {frequency:240,duration:.11,gain:.055*.06,attack:.007,shape:'elastic'},
    {frequency:1152,duration:.042,gain:.055*.215,attack:.003,shape:'snap'},
  ],
  back:[{frequency:659.25,duration:.14,gain:.055*.82,attack:.012}],
  complete:[
    {frequency:587.33,duration:.10,gain:.055*.63,attack:.005},
    {frequency:587.33*1.259921,duration:.12,gain:.055*.68,attack:.005,offset:.07},
    {frequency:587.33*1.498307,duration:.18,gain:.055*.78,attack:.005,offset:.14},
  ],
  close:[{frequency:520,duration:.085,gain:.055*.70,attack:.004}],
};

export function createTourSoundPlayer(options:AudioOptions){
  let context:AudioContext|undefined,enabledInMemory=true,preferenceLoaded=false,generation=0,lastPlayed=-Infinity;
  const voices=new Set<{oscillator:OscillatorNode;envelope:GainNode}>();
  function isEnabled(){if(!preferenceLoaded){preferenceLoaded=true;try{const value=options.storage()?.getItem(tourSoundKey);if(value==='on'||value==='off')enabledInMemory=value==='on';}catch{}}return enabledInMemory;}
  function stop(){
    generation++;
    if(!context)return;
    const at=context.currentTime;
    for(const voice of voices){
      try{
        const gain=voice.envelope.gain;
        if(typeof gain.cancelAndHoldAtTime==='function')gain.cancelAndHoldAtTime(at);
        else{const current=gain.value;gain.cancelScheduledValues(at);gain.setValueAtTime(current,at);}
        gain.linearRampToValueAtTime(0,at+.018);
        voice.oscillator.stop(at+.025);
      }catch{}
    }
  }
  function setEnabled(value:boolean){preferenceLoaded=true;enabledInMemory=value;try{options.storage()?.setItem(tourSoundKey,value?'on':'off');}catch{}if(!value)stop();}
  async function play(kind:TourSound){
    if(!isEnabled()||!options.visible())return;
    const request=++generation,requestedAt=options.now();
    try{
      if(!context||context.state==='closed')context=options.createContext();
      if(!context)return;
      if(context.state!=='running')await context.resume();
      // Discard delayed or superseded requests instead of playing stale sounds.
      if(request!==generation||!isEnabled()||!options.visible()||context.state!=='running'||options.now()-requestedAt>500)return;
      if(options.now()-lastPlayed<110&&kind!=='close'&&kind!=='complete')return;
      stop();lastPlayed=options.now();
      const start=context.currentTime+.005;
      for(const note of cues[kind]){
        const oscillator=context.createOscillator(),envelope=context.createGain();
        const at=start+(note.offset||0),duration=note.duration,end=at+duration;
        const peak=note.gain,frequency=note.frequency;
        oscillator.type='sine';
        oscillator.frequency.setValueAtTime(frequency*(note.shape==='elastic'?1.3:note.shape==='snap'?1.12:1),at);
        if(note.shape==='elastic'){
          oscillator.frequency.exponentialRampToValueAtTime(frequency*.78,at+duration*.15);
          oscillator.frequency.exponentialRampToValueAtTime(frequency*1.07,at+duration*.35);
          oscillator.frequency.exponentialRampToValueAtTime(frequency*.96,at+duration*.6);
          oscillator.frequency.exponentialRampToValueAtTime(frequency,at+duration*.9);
        }else if(note.shape==='snap')oscillator.frequency.exponentialRampToValueAtTime(frequency*.94,end-.012);
        envelope.gain.value=0; // Muting a voice must hold silence, never the default gain of 1.
        envelope.gain.setValueAtTime(0,at);
        envelope.gain.linearRampToValueAtTime(peak,at+note.attack);
        envelope.gain.exponentialRampToValueAtTime(.0001,end-.01);
        envelope.gain.linearRampToValueAtTime(0,end);
        oscillator.connect(envelope);envelope.connect(context.destination);
        const voice={oscillator,envelope};voices.add(voice);
        oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();voices.delete(voice);};
        oscillator.start(at);oscillator.stop(end+.006);
      }
    }catch{stop();/* Audio is optional; it must never interrupt the tour. */}
  }
  return {isEnabled,setEnabled,play,stop};
}

export const tourSound=createTourSoundPlayer({
  createContext:()=>typeof window!=='undefined'&&window.AudioContext?new window.AudioContext({latencyHint:'interactive'}):undefined,
  storage:()=>typeof window!=='undefined'?window.localStorage:undefined,
  visible:()=>typeof document!=='undefined'&&document.visibilityState!=='hidden',
  now:()=>performance.now(),
});
