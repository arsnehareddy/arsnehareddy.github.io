
(() => {
  const viewer=document.getElementById('lightbox');
  const stage=viewer?.querySelector('.lightbox-stage');
  const photo=stage?.querySelector('img');
  const button=document.getElementById('lightbox-zoom');
  if(!viewer||!stage||!photo||!button) return;
  let scale=1,x=0,y=0,start=null,previousDistance=0,previousCenter=null,moved=false,lastTap=0;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const maxScale=()=>Math.max(2,Math.min(5,Math.max(photo.naturalWidth/Math.max(photo.offsetWidth,1),photo.naturalHeight/Math.max(photo.offsetHeight,1))));
  function bounds(){
    const width=photo.offsetWidth;
    const height=photo.offsetHeight;
    return {x:Math.max(0,(width*scale-stage.clientWidth)/2),y:Math.max(0,(height*scale-stage.clientHeight)/2)};
  }
  function draw(){
    const limit=bounds();x=clamp(x,-limit.x,limit.x);y=clamp(y,-limit.y,limit.y);
    photo.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;
    stage.classList.toggle('is-pannable',scale>1.01);
    stage.classList.remove('zoomed');
    button.textContent=scale>1.01?'Fit image':'Zoom in';
  }
  function reset(){scale=1;x=0;y=0;start=null;previousDistance=0;previousCenter=null;stage.classList.remove('is-gesturing');draw();}
  const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  const midpoint=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  // Capture the controls before the older click handler, which only supports a fixed zoom.
  button.addEventListener('click',event=>{
    event.stopImmediatePropagation();
    if(scale>1.01) reset();else {scale=2.25;draw();}
  },true);
  stage.addEventListener('touchstart',event=>{
    event.stopPropagation();
    stage.classList.add('is-gesturing');
    if(event.touches.length===2){
      previousDistance=distance(event.touches[0],event.touches[1]);
      previousCenter=midpoint(event.touches[0],event.touches[1]);
      start=null;moved=true;
    }else if(event.touches.length===1){
      const t=event.touches[0];start={x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY};moved=false;
    }
  },{passive:true});
  stage.addEventListener('touchmove',event=>{
    event.stopPropagation();
    if(event.touches.length===2){
      event.preventDefault();
      const current=distance(event.touches[0],event.touches[1]);
      const center=midpoint(event.touches[0],event.touches[1]);
      if(previousDistance){
        const next=clamp(scale*current/previousDistance,1,maxScale());
        const ratio=next/scale;
        const cx=center.x-stage.getBoundingClientRect().left-stage.clientWidth/2;
        const cy=center.y-stage.getBoundingClientRect().top-stage.clientHeight/2;
        x=cx-(cx-x)*ratio+(center.x-previousCenter.x);
        y=cy-(cy-y)*ratio+(center.y-previousCenter.y);
        scale=next;draw();
      }
      previousDistance=current;previousCenter=center;start=null;moved=true;
    }else if(event.touches.length===1&&start){
      const t=event.touches[0];
      if(Math.hypot(t.clientX-start.x,t.clientY-start.y)>9) moved=true;
      if(scale>1.01){event.preventDefault();x+=t.clientX-start.lastX;y+=t.clientY-start.lastY;draw();}
      start.lastX=t.clientX;start.lastY=t.clientY;
    }
  },{passive:false});
  stage.addEventListener('touchend',event=>{
    event.stopPropagation();
    if(event.touches.length===1){const t=event.touches[0];start={x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY};previousDistance=0;return;}
    if(event.touches.length>0)return;
    stage.classList.remove('is-gesturing');previousDistance=0;previousCenter=null;
    if(scale<=1.01&&start){
      const dx=(event.changedTouches[0]?.clientX??start.x)-start.x;
      if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs((event.changedTouches[0]?.clientY??start.y)-start.y)*1.2)
        document.getElementById(dx<0?'lightbox-next':'lightbox-prev')?.click();
      else if(!moved){
        const now=Date.now();if(now-lastTap<300){scale=2.25;draw();lastTap=0;}else lastTap=now;
      }
    }
    start=null;
  },{passive:true});
  stage.addEventListener('touchcancel',()=>{stage.classList.remove('is-gesturing');start=null;previousDistance=0;},{passive:true});
  stage.addEventListener('wheel',event=>{
    if(viewer.hidden)return;
    event.preventDefault();
    const next=clamp(scale*Math.exp(-event.deltaY*(event.ctrlKey?.012:.0025)),1,maxScale());
    const rect=stage.getBoundingClientRect(),cx=event.clientX-rect.left-rect.width/2,cy=event.clientY-rect.top-rect.height/2;
    const ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;draw();
  },{passive:false});
  let mouse=null;
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||scale<=1.01||event.button!==0)return;
    mouse={x:event.clientX,y:event.clientY};stage.setPointerCapture(event.pointerId);stage.classList.add('is-gesturing');
  });
  stage.addEventListener('pointermove',event=>{
    if(!mouse)return;x+=event.clientX-mouse.x;y+=event.clientY-mouse.y;mouse={x:event.clientX,y:event.clientY};draw();
  });
  const endDrag=()=>{mouse=null;stage.classList.remove('is-gesturing');};
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  stage.addEventListener('dblclick',event=>{event.preventDefault();if(scale>1.01)reset();else{scale=2.25;draw();}});
  new MutationObserver(()=>reset()).observe(photo,{attributes:true,attributeFilter:['src']});
  new MutationObserver(()=>{if(viewer.hidden)reset();}).observe(viewer,{attributes:true,attributeFilter:['hidden']});
  viewer.querySelector('.lightbox-hint')?.remove();
})();
