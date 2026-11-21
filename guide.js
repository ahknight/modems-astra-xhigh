(() => {
  'use strict';
  const chapters=window.ModemChapters, byId=id=>document.getElementById(id);
  const origins=byId('origins'), reader=byId('reader');
  const formatRate=id=>Number(id).toLocaleString('en-US');
  const shortRate=id=>Number(id)>=10000?Number(id)/1000+'k':formatRate(id);
  const speedButtons=[];
  let selected=-1;
  function stepLink(text,hash){
    const a=document.createElement('a');a.href=hash;a.textContent=text;return a;
  }
  function choose(index){
    if(index===selected)return;
    const c=chapters[index];
    selected=index;
    speedButtons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
    byId('chapter-count').textContent='Chapter '+String(index+1).padStart(2,'0')+' / 08';
    byId('chapter-standard').textContent=c.standard;
    byId('chapter-title').textContent=c.title;byId('chapter-dek').textContent=c.dek;
    byId('rate-display').textContent=formatRate(c.id);byId('chapter-copy').innerHTML=c.body;
    byId('step-nav').replaceChildren(
      index?stepLink('Previous · '+shortRate(chapters[index-1].id)+' bps','#rate-'+chapters[index-1].id):stepLink('Read the origins','#origins'),
      index<chapters.length-1?stepLink('Next · '+shortRate(chapters[index+1].id)+' bps','#rate-'+chapters[index+1].id):stepLink('Continue to the epilogue','#epilogue')
    );
    window.SignalPlayer.load(c.id);
  }
  chapters.forEach((c,i)=>{
    const b=document.createElement('button');b.type='button';b.className='speed';b.setAttribute('aria-label',formatRate(c.id)+' bits per second, '+c.standard);
    b.innerHTML='<span class="index-rate">'+shortRate(c.id)+' <small>bps</small></span><span class="year">'+c.year+'</span>';
    b.onclick=()=>{
      origins.hidden=true;choose(i);history.pushState(null,'','#rate-'+c.id);
      // Keep the selector in reach for side-by-side listening comparisons.
      if(reader.getBoundingClientRect().top>innerHeight*.55)reader.scrollIntoView();
    };
    speedButtons.push(b);byId('speed-list').append(b);
    const group=document.createElement('div');group.innerHTML=c.body;
    const links=new Map([...group.querySelectorAll('a')].map(a=>[a.href,a]));
    const title=document.createElement('h3');title.textContent=c.standard+' · '+formatRate(c.id)+' bps';
    const list=document.createElement('ul');
    for(const link of links.values()){const li=document.createElement('li');li.append(link);list.append(li);}
    byId('bibliography').append(title,list);
  });
  function route(){
    const hash=location.hash;
    if(hash==='#origins'){
      origins.hidden=false;origins.scrollIntoView();origins.focus({preventScroll:true});
    }
    if(hash.startsWith('#rate-')){
      const i=chapters.findIndex(c=>'#rate-'+c.id===hash);
      if(i!==-1){origins.hidden=true;choose(i);reader.scrollIntoView();reader.focus({preventScroll:true});}
    }
  }
  document.querySelectorAll('.origin-link').forEach(a=>a.addEventListener('click',()=>{origins.hidden=false;}));
  byId('start').onclick=()=>{
    origins.hidden=true;choose(0);history.pushState(null,'','#rate-300');
    byId('lab').scrollIntoView();byId('play-btn').focus({preventScroll:true});window.SignalPlayer.start();
  };
  choose(0);
  window.addEventListener('hashchange',route);
  if(location.hash)requestAnimationFrame(route);
})();
