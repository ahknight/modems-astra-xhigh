// AudioBufferSourceNode and the oscilloscope use positions in the same mono buffer.
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const trace = byId('trace');
  const ctx = trace.getContext('2d');
  const seek = byId('seek');
  const play = byId('play-btn');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const windowMs = 12;
  let audio, source, buffer, signal, frame, request = 0;
  let offset = 0, started = 0, currentStage = -1, duration = 0;
  let stageRows = [];

  function position() {
    return source ? Math.min(duration, offset + audio.currentTime - started) : offset;
  }
  function timestamp(t) {
    const n = Math.floor(t * 10 + 0.000001);
    return Math.floor(n / 600) + ':' + String(Math.floor(n / 10) % 60).padStart(2,'0') + '.' + (n % 10);
  }
  function draw(t) {
    if (!signal || !ctx) return;
    const w = trace.clientWidth, h = trace.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    if (trace.width !== Math.round(w*scale) || trace.height !== Math.round(h*scale)) {
      trace.width = Math.round(w*scale); trace.height = Math.round(h*scale);
    }
    ctx.setTransform(scale,0,0,scale,0,0);
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='#2b4339';ctx.lineWidth=1;
    ctx.beginPath();
    for (let x=0; x<=w; x+=w/18) {ctx.moveTo(x,.5);ctx.lineTo(x,h);}
    for (let y=h/2; y<h; y+=h/6) {
      ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.moveTo(0,h-y);ctx.lineTo(w,h-y);
    }
    ctx.stroke();
    const samples = signal.samples;
    const count = Math.min(samples.length,Math.round(signal.rate*windowMs/1000));
    const begin = Math.min(samples.length-count,Math.max(0,Math.floor(t*signal.rate)));
    const amp = h*.47;
    ctx.strokeStyle='#b7d4a6';ctx.lineWidth=1.6;ctx.beginPath();
    for(let i=0;i<count;i++){
      const x=i*w/(count-1), y=h/2-amp*samples[begin+i];
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
    if(byId('envelope').checked){
      ctx.strokeStyle='#f5b68a';ctx.lineWidth=1.2;
      for(const direction of [-1,1]){
        ctx.beginPath();
        for(let i=0;i<count;i++){
          let peak=0;
          for(let j=Math.max(0,i-10);j<=Math.min(count-1,i+10);j++)
            peak=Math.max(peak,Math.abs(samples[begin+j]));
          const x=i*w/(count-1), y=h/2+direction*amp*peak;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    }
  }
  function refresh(forceDraw=false) {
    if(!signal)return;
    const pos=position();
    seek.value=pos;
    seek.setAttribute('aria-valuetext',timestamp(pos)+' of '+timestamp(duration));
    byId('time').textContent=timestamp(pos)+' / '+timestamp(duration);
    let index=0;
    for(let i=1;i<signal.stages.length && signal.stages[i].at<=pos;i++)index=i;
    if(index!==currentStage){
      stageRows[currentStage]?.removeAttribute('aria-current');
      currentStage=index;
      const stage=signal.stages[index];
      byId('stage-name').textContent=stage.title;
      byId('stage-text').textContent=stage.text;
      byId('stage-count').textContent='Stage '+(index+1)+' / '+signal.stages.length;
      stageRows[index].setAttribute('aria-current','step');
    }
    if(forceDraw || !reduced.matches)draw(pos);
  }
  function tick(){refresh();if(source)frame=requestAnimationFrame(tick);}
  function pause(){
    request++;
    if(source){
      offset=position();
      source.onended=null;source.stop();source.disconnect();source=null;
    }
    cancelAnimationFrame(frame);
    play.querySelector('use').setAttribute('href','#play');
    play.querySelector('span').textContent=offset>=duration && duration?'Replay':'Play signal';
    refresh(true);
  }
  async function start(){
    if(!signal)return;
    const token=++request;
    try{
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      await audio.resume();
      if(token!==request)return;
      if(!buffer){
        buffer=audio.createBuffer(1,signal.samples.length,signal.rate);
        buffer.copyToChannel(signal.samples,0);
      }
      if(offset>=duration)offset=0;
      source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);
      source.onended=()=>{
        if(token!==request)return;
        source.disconnect();source=null;offset=duration;pause();
      };
      started=audio.currentTime;source.start(started,offset);
      play.querySelector('use').setAttribute('href','#pause');
      play.querySelector('span').textContent='Pause';
      byId('transcript').open=true;
      refresh(true);tick();
    }catch{
      pause();byId('stage-text').textContent='Audio playback is unavailable here. Use the stage list to read and inspect each signal.';byId('transcript').open=true;
    }
  }
  function move(t,continuous=false){
    pause();offset=Math.max(0,Math.min(t,duration));refresh(true);
    if(continuous && offset<duration)start();
  }
  play.onclick=()=>source?pause():start();
  byId('restart-btn').onclick=()=>move(0,!!source);
  seek.oninput=()=>move(Number(seek.value),!!source);
  byId('envelope').onchange=()=>draw(position());
  window.addEventListener('resize',()=>draw(position()));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

  window.SignalPlayer={
    start,
    load(id){
      pause();signal=window.ModemSignals.build(id);buffer=null;offset=0;
      currentStage=-1;duration=signal.samples.length/signal.rate;seek.max=duration;
      play.querySelector('span').textContent='Play signal';
      byId('method').textContent=signal.method;
      byId('stage-list').replaceChildren();
      stageRows=signal.stages.map(s=>{
        const row=document.createElement('li'), jump=document.createElement('button');
        jump.className='stage-jump';jump.textContent=timestamp(s.at)+' · '+s.title;
        jump.setAttribute('aria-label','Inspect '+s.title+' at '+s.at+' seconds');
        jump.onclick=()=>move(s.at);
        row.append(jump,document.createTextNode(' '+s.text));byId('stage-list').append(row);return row;
      });
      byId('signal-sources').replaceChildren(...signal.sources.map(s=>{
        const link=document.createElement('a');link.href=s.url;link.textContent=s.title;return link;
      }));
      byId('transcript').open=false;refresh(true);
    }
  };
})();
