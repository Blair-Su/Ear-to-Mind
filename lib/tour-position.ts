export type TourRect={left:number;top:number;right:number;bottom:number};
type Viewport={width:number;height:number;left?:number;top?:number};
type Side='right'|'left'|'bottom'|'top';
export type TourPosition={left:number;top:number;width:number;height:number;placement:Side|'dock';highlight:TourRect|null;pointer:{edge:Side;offset:number}|null;detached:boolean};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,max));

// A tour target can describe several pieces of content without including the
// parent container's padding, flex space, or neighboring fields.
export function tourContentRect(regions:TourRect[],fallback:TourRect):TourRect{
  const visible=regions.filter(r=>r.right>r.left&&r.bottom>r.top);
  if(!visible.length)return fallback;
  return {
    left:Math.min(...visible.map(r=>r.left)),top:Math.min(...visible.map(r=>r.top)),
    right:Math.max(...visible.map(r=>r.right)),bottom:Math.max(...visible.map(r=>r.bottom)),
  };
}

export function positionTour(anchor:TourRect,size:{width:number;height:number},viewport:Viewport,preferred:'right'|'left'='right'):TourPosition{
  const margin=12,gap=10,padding=6,vx=viewport.left||0,vy=viewport.top||0;
  const left=vx+margin,top=vy+margin,right=vx+viewport.width-margin,bottom=vy+viewport.height-margin;
  const width=Math.min(size.width,Math.max(0,right-left)),height=Math.min(size.height,Math.max(0,bottom-top));
  const dock={left:right-width,top:bottom-height,width,height,placement:'dock' as const};
  // Do not point at an unrelated part of the page when the target scrolls away.
  if(anchor.right<=vx||anchor.left>=vx+viewport.width||anchor.bottom<=vy||anchor.top>=vy+viewport.height){
    return {...dock,highlight:null,pointer:null,detached:true};
  }
  const highlight={left:Math.max(vx+4,anchor.left-padding),top:Math.max(vy+4,anchor.top-padding),right:Math.min(vx+viewport.width-4,anchor.right+padding),bottom:Math.min(vy+viewport.height-4,anchor.bottom+padding)};
  const y=clamp((highlight.top+highlight.bottom-height)/2,top,bottom-height),x=clamp((highlight.left+highlight.right-width)/2,left,right-width);
  const candidates={right:{left:highlight.right+gap,top:y},left:{left:highlight.left-gap-width,top:y},bottom:{left:x,top:highlight.bottom+gap},top:{left:x,top:highlight.top-gap-height}};
  const pointerFor=(p:{left:number;top:number},side:Side,h:TourRect)=>{
    const horizontal=side==='right'||side==='left';
    const start=horizontal?p.top:p.left,extent=horizontal?height:width;
    const a=horizontal?h.top:h.left,b=horizontal?h.bottom:h.right;
    const inset=Math.min(24,extent/2),targetInset=Math.min(8,(b-a)/2);
    const min=Math.max(start+inset,a+targetInset),max=Math.min(start+extent-inset,b-targetInset);
    if(min>max)return null;
    const edge:Side=side==='right'?'left':side==='left'?'right':side==='bottom'?'top':'bottom';
    return {edge,offset:clamp((a+b)/2,min,max)-start};
  };
  const sides:Side[]=viewport.width<700?['bottom','top',preferred,preferred==='right'?'left':'right']:[preferred,preferred==='right'?'left':'right','bottom','top'];
  for(const side of sides){
    const p=candidates[side],pointer=pointerFor(p,side,highlight);
    if(pointer&&p.left>=left&&p.left+width<=right&&p.top>=top&&p.top+height<=bottom){
      return {...p,width,height,placement:side,highlight,pointer,detached:false};
    }
  }
  // Tall editors may not fit beside a card on mobile. Keep a visible part of
  // the actual target above (or below) it, with the pointer touching that part.
  const below={...highlight,bottom:Math.min(highlight.bottom,dock.top-gap)};
  const above={...highlight,top:Math.max(highlight.top,top+height+gap)};
  const choices=[{p:dock,h:below,side:'bottom' as const},{p:{...dock,top},h:above,side:'top' as const}].sort((a,b)=>(b.h.bottom-b.h.top)-(a.h.bottom-a.h.top));
  for(const {p,h,side} of choices){
    const pointer=pointerFor(p,side,h);
    if(h.bottom-h.top>=28&&pointer)return {...p,highlight:h,pointer,detached:false};
  }
  // Very short viewports can leave no usable area for an honest pointer.
  return {...dock,highlight:null,pointer:null,detached:true};
}
