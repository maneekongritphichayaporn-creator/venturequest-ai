(()=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href='/city.css';document.head.append(link);
  const hero=document.querySelector('.hero');if(!hero)return;
  const city=document.createElement('section');city.id='city';city.className='city-section';
  city.innerHTML='<div class="city-heading"><div><div class="eyebrow">VENTURE METROPOLIS · PLAYABLE DEMO</div><h2>Walk the innovation city</h2><p>Explore venture buildings, meet the founder, and open a pitch. Building levels respond to simulated community signal points stored in this browser.</p></div><span class="city-tag">2D CITY · NO EXTRA LIBRARIES</span></div><div class="city-layout"><div class="city-stage"><div class="city-canvas-wrap"><canvas id="city-canvas" class="city-canvas" width="960" height="540" tabindex="0" aria-label="Interactive Venture Metropolis. Use WASD or arrow keys to move and E near a building to meet its founder."></canvas><div class="city-help"><b>WASD / ARROWS</b> move<br><b>E</b> talk to a nearby founder<br>Click a building to inspect</div></div><div class="city-toolbar"><span>PLAYER <strong>BUILDER 01</strong></span><span id="city-status" aria-live="polite">Choose a building or walk over to one.</span></div></div><aside class="city-side"><h3>Neighborhood ventures</h3><p>Each building represents a venture in your local market.</p><div class="city-selected" id="city-selected"></div><div class="city-list" id="city-project-list"></div><div class="city-controls" aria-label="Touch movement controls"><button data-move="up" aria-label="Move up">↑</button><button data-move="left" aria-label="Move left">←</button><button data-move="down" aria-label="Move down">↓</button><button data-move="right" aria-label="Move right">→</button></div><p class="city-note">City data is local to this browser. Other visitors are not synced in this free demo.</p></aside></div>';
  hero.insertAdjacentElement('afterend',city);
  const canvas=document.querySelector('#city-canvas'),ctx=canvas.getContext('2d');
  const slots=[{x:65,y:205},{x:285,y:205},{x:630,y:205},{x:65,y:385},{x:285,y:385},{x:630,y:385}];
  const keys=new Set();let player={x:480,y:285},selectedId=null,lastTime=0,npcClock=0;
  const projectFor=i=>projects[i]||null;
  function levelFor(p){const n=Number(p&&p.raised||0);return n>=2500?4:n>=1500?3:n>=500?2:1}
  function buildingRect(i,p){const slot=slots[i%slots.length],level=levelFor(p),h=67+level*18;return{x:slot.x,y:slot.y-h+12,w:145,h:h,base:slot.y,doorX:slot.x+72,doorY:slot.y+8,level:level}}
  function setStatus(text){const el=document.querySelector('#city-status');if(el)el.textContent=text}
  function selectedProject(){return projects.find(p=>p.id===selectedId)||projectFor(0)}
  function updateSelected(){
    const p=selectedProject(),box=document.querySelector('#city-selected');if(!box)return;
    if(!p){box.innerHTML='<span>No ventures in your market yet. Build an idea to add one.</span>';return}
    selectedId=p.id;const level=levelFor(p);
    box.innerHTML='<div class="city-selected-name">'+esc(p.name)+'</div><div class="city-selected-meta">'+esc(p.category||'Community')+' · Building level '+level+' · '+Number(p.raised||0).toLocaleString()+' signal points</div><div class="city-selected-desc">'+esc(p.description||p.solution||'An early venture concept.')+'</div><button class="city-open-pitch" id="city-open-pitch">Meet founder · Open pitch</button>';
    box.querySelector('#city-open-pitch').onclick=()=>openPitch(p.id);
  }
  function updateProjectList(){
    const list=document.querySelector('#city-project-list');if(!list)return;
    list.innerHTML=projects.map((p,i)=>'<button class="city-project-button'+(p.id===selectedId?' active':'')+'" data-city-project="'+esc(p.id)+'">'+String(i+1).padStart(2,'0')+' · '+esc(p.name)+' · L'+levelFor(p)+'</button>').join('');
    list.querySelectorAll('[data-city-project]').forEach(btn=>btn.onclick=()=>{selectedId=btn.dataset.cityProject;updateSelected();updateProjectList();setStatus('Selected '+(projects.find(p=>p.id===selectedId)?.name||'venture')+'. Walk to its highlighted building and press E.')});
    updateSelected();
  }
  function round(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
  function drawWorld(){
    ctx.fillStyle='#a8d67a';ctx.fillRect(0,0,960,540);
    for(let y=10;y<540;y+=32)for(let x=8;x<960;x+=38){
      const n=((x*3+y*5)%13);ctx.fillStyle=n<3?'#96c967':n<6?'#b3dc84':'#a6d276';ctx.fillRect(x,y,2,2);
    }
    ctx.fillStyle='#d6c996';ctx.fillRect(0,246,960,74);ctx.fillRect(438,0,82,540);
    ctx.fillStyle='#e4d8aa';ctx.fillRect(0,251,960,6);ctx.fillRect(0,309,960,6);ctx.fillRect(444,0,6,540);ctx.fillRect(514,0,6,540);
    ctx.fillStyle='#f8f1cd';for(let x=15;x<960;x+=46)ctx.fillRect(x,280,24,5);for(let y=15;y<540;y+=46)ctx.fillRect(476,y,5,24);
    ctx.fillStyle='#7fb65b';ctx.fillRect(540,255,65,56);ctx.fillStyle='#e6d9ad';ctx.fillRect(548,264,49,38);
    for(let i=0;i<7;i++){const x=40+i*126,y=i%2?35:510;drawTree(x,y)}
    ctx.fillStyle='#426d43';ctx.font='10px monospace';ctx.fillText('VENTURE METROPOLIS',735,32);
  }
  function drawTree(x,y){ctx.fillStyle='#765539';ctx.fillRect(x+9,y+18,5,11);ctx.fillStyle='#4c8a45';ctx.fillRect(x+2,y+4,19,17);ctx.fillStyle='#75b853';ctx.fillRect(x+6,y,11,6)}
  function drawBuilding(i,p){
    const r=buildingRect(i,p),colors=['#8193b1','#738f71','#a57eaa','#cb8d5a'];const face=colors[(i+Number(p.score||0))%colors.length];
    ctx.fillStyle='#48623c55';ctx.fillRect(r.x+5,r.base-2,r.w,13);
    ctx.fillStyle='#b9a178';ctx.fillRect(r.x-9,r.base-2,r.w+18,9);
    ctx.fillStyle='#e5dfc3';ctx.fillRect(r.x,r.y+16,r.w,r.h-16);
    ctx.fillStyle=face;ctx.fillRect(r.x+8,r.y+19,r.w-16,r.h-24);
    ctx.fillStyle='#f3d88d';ctx.fillRect(r.x+2,r.y+11,r.w-4,16);ctx.fillStyle='#b9734e';ctx.fillRect(r.x+8,r.y+7,r.w-16,10);
    ctx.fillStyle='#f8e8b6';for(let row=0;row<r.level;row++)for(let col=0;col<4;col++)ctx.fillRect(r.x+19+col*27,r.y+34+row*13,13,7);
    ctx.fillStyle='#344638';ctx.fillRect(r.doorX-9,r.base-23,18,23);ctx.fillStyle='#ddc57f';ctx.fillRect(r.doorX+4,r.base-13,2,2);
    ctx.fillStyle='#263529';ctx.fillRect(r.x+17,r.y-5,r.w-34,16);ctx.fillStyle='#d9ff9c';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(String(p.name||'VENTURE').toUpperCase().slice(0,22),r.x+r.w/2,r.y+6);
    ctx.textAlign='left';ctx.fillStyle='#243025';ctx.font='bold 9px monospace';ctx.fillText('LV '+r.level,r.x+5,r.base+21);
    ctx.fillStyle='#53654c';ctx.font='8px monospace';ctx.fillText(Number(p.backers||0)+' EXPLORERS',r.x+42,r.base+21);
    const npcBob=Math.sin(npcClock+i)*2;ctx.fillStyle='#f2c987';ctx.fillRect(r.doorX-5,r.base+22+npcBob,10,9);ctx.fillStyle='#455481';ctx.fillRect(r.doorX-6,r.base+31+npcBob,12,10);ctx.fillStyle='#f7f0d8';ctx.fillRect(r.doorX-3,r.base+24+npcBob,2,2);ctx.fillRect(r.doorX+2,r.base+24+npcBob,2,2);
    if(p.id===selectedId){ctx.strokeStyle='#edffb7';ctx.lineWidth=3;ctx.strokeRect(r.x-2,r.y-8,r.w+4,r.h+37)}
    const distance=Math.hypot(player.x-r.doorX,player.y-(r.base+34));if(distance<72){ctx.fillStyle='#1d281dcc';round(r.doorX-22,r.base+49,44,21,5);ctx.fill();ctx.fillStyle='#dfffac';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('E  TALK',r.doorX,r.base+63);ctx.textAlign='left'}
  }
  function drawPlayer(){
    ctx.fillStyle='#27332b55';ctx.fillRect(player.x-10,player.y+9,20,5);
    ctx.fillStyle='#edc38e';ctx.fillRect(player.x-6,player.y-15,12,11);
    ctx.fillStyle='#404c82';ctx.fillRect(player.x-7,player.y-4,14,15);
    ctx.fillStyle='#f1d9a7';ctx.fillRect(player.x-5,player.y+11,4,6);ctx.fillRect(player.x+2,player.y+11,4,6);
    ctx.fillStyle='#303923';ctx.fillRect(player.x-7,player.y-18,14,5);ctx.fillRect(player.x-4,player.y-20,8,4);
  }
  function blocked(x,y){
    return projects.some((p,i)=>{const r=buildingRect(i,p);return x>r.x+6&&x<r.x+r.w-6&&y>r.y+6&&y<r.base-7});
  }
  function move(dx,dy){
    const speed=3.2,nx=Math.max(17,Math.min(943,player.x+dx*speed)),ny=Math.max(28,Math.min(520,player.y+dy*speed));
    if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;
  }
  function nearby(){
    let best=null,distance=Infinity;
    projects.forEach((p,i)=>{const r=buildingRect(i,p),d=Math.hypot(player.x-r.doorX,player.y-(r.base+34));if(d<distance){distance=d;best={p:p,i:i,d:d}}});
    return best;
  }
  function interact(){
    const n=nearby();if(!n||n.d>76){setStatus('Walk closer to a building entrance, then press E.');return}
    selectedId=n.p.id;updateProjectList();setStatus('Meeting the founder of '+n.p.name+'.');openPitch(n.p.id);
  }
  function frame(time){
    const dt=Math.min(2,(time-lastTime)/16||1);lastTime=time;npcClock=time/320;
    let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('a'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;if(keys.has('ArrowUp')||keys.has('w'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;
    if(dx||dy){const len=Math.hypot(dx,dy);move(dx/len*dt,dy/len*dt)}
    drawWorld();projects.slice(0,slots.length).forEach((p,i)=>drawBuilding(i,p));drawPlayer();
    const n=nearby();if(n&&n.d<76&&selectedId!==n.p.id){selectedId=n.p.id;updateProjectList()}requestAnimationFrame(frame);
  }
  function selectFromPoint(ev){
    const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*canvas.width/rect.width,y=(ev.clientY-rect.top)*canvas.height/rect.height;
    projects.slice(0,slots.length).forEach((p,i)=>{const r=buildingRect(i,p);if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.base+44){selectedId=p.id;updateProjectList();setStatus(p.name+' selected. Press E near the door or use Open pitch.')}});
  }
  canvas.addEventListener('click',selectFromPoint);canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','e','E'].includes(e.key)){e.preventDefault();if(e.key==='e'||e.key==='E')interact();else keys.add(e.key)}});
  window.addEventListener('keyup',e=>keys.delete(e.key));
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D'].includes(e.key)&&document.activeElement===canvas){e.preventDefault();keys.add(e.key)}if((e.key==='e'||e.key==='E')&&document.activeElement===canvas)interact()});
  window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.city-controls [data-move]').forEach(btn=>{
    const dir=btn.dataset.move,down=e=>{e.preventDefault();canvas.focus();keys.add(({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'})[dir])},up=()=>keys.delete(({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'})[dir]);
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up);
  });
  const originalRender=render;render=function(){originalRender();updateProjectList()};
  const originalSignal=applySignal;applySignal=function(id,amount){originalSignal(id,amount);updateProjectList();setStatus('Community signal recorded. The building can grow as simulated points accumulate.')};
  updateProjectList();requestAnimationFrame(frame);
})();
