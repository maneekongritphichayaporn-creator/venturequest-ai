const root=document.querySelector('#world3d'),feed=document.querySelector('#world-feed'),status=document.querySelector('#world-status');
const STORE='venturequest-projects-v1',CAPTURE_STORE='vq-seen-captures';
const escapeHtml=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const starter=[
{id:'p1',name:'Refill Route',category:'Climate',icon:'♻',description:'A neighborhood map that helps people find refill stations.',problem:'Single-use packaging is hard to avoid.',audience:'Neighborhood residents',solution:'Map refill stations and reward reusable containers.',businessModel:'Local merchant subscriptions',score:86,raised:1240,backers:128,founder:'Maya Chen',pitch:'Refill Route helps neighborhood residents avoid single-use packaging by making refill stations easy to find.'},
{id:'p2',name:'Mellow Mind',category:'Health',icon:'☁',description:'Tiny wellbeing routines for busy days.',problem:'People struggle to make time for everyday wellbeing.',audience:'Busy students and workers',solution:'Short guided routines that fit into a daily schedule.',businessModel:'Freemium subscription hypothesis',score:79,raised:910,backers:94,founder:'Noah Williams',pitch:'Mellow Mind helps busy people practice small, repeatable wellbeing routines.'},
{id:'p3',name:'Pocket Tutor',category:'Education',icon:'✎',description:'Bite-size lessons for confusing concepts.',problem:'Learners can get stuck on difficult topics.',audience:'Independent learners',solution:'Turn questions into short guided lessons.',businessModel:'School pilot hypothesis',score:91,raised:2120,backers:207,founder:'Aisha Rahman',pitch:'Pocket Tutor helps independent learners make progress on difficult topics with short guided lessons.'},
{id:'p4',name:'Good Grid',category:'Climate',icon:'⚡',description:'Coordinate local solar sharing.',problem:'Small communities find it hard to coordinate clean energy.',audience:'Neighborhood energy groups',solution:'A shared dashboard for local solar coordination.',businessModel:'Community group subscription hypothesis',score:74,raised:680,backers:61,founder:'Leo Park',pitch:'Good Grid helps neighborhood energy groups coordinate local solar sharing.'},
{id:'p5',name:'Crafted by AI',category:'AI Tools',icon:'✳',description:'Help makers turn rough ideas into first prototypes.',problem:'Independent makers spend time getting from idea to prototype.',audience:'Independent makers',solution:'A copilot that shapes a rough brief into a first prototype.',businessModel:'Creator subscription hypothesis',score:83,raised:1570,backers:153,founder:'Sofia Alvarez',pitch:'Crafted by AI helps independent makers turn a rough idea into a first prototype.'}
];
let projects;
try{const stored=JSON.parse(localStorage.getItem(STORE)||'null');projects=Array.isArray(stored)&&stored.length?stored:starter}catch{projects=starter}
let THREE,scene,camera,renderer,player,selectedId=null,lastFrame=0,marketPulse=0;
const buildings=[],keys=new Set(),visitors=[];
const positions=[[-8,-6],[-3,-6],[2,-6],[7,-6],[-8,4],[-3,4],[2,4],[7,4]];
const categoryColor={Climate:0x80bd66,Health:0xa58bd1,Education:0xe2a957,'AI Tools':0x62a9c3,Community:0xd77d69};
function say(message){if(status)status.textContent=message}
function save(){try{localStorage.setItem(STORE,JSON.stringify(projects))}catch{say('Browser storage is full; this change could not be saved.')}}
function levelFor(p){const points=Number(p&&p.raised||0);return points>=2500?4:points>=1500?3:points>=500?2:1}
function canvasLabel(text){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
  g.fillStyle='#1e2c22';g.fillRect(0,0,512,128);g.fillStyle='#c9f58f';g.font='bold 38px sans-serif';g.textAlign='center';
  let name=String(text||'VENTURE').toUpperCase();if(name.length>22)name=name.slice(0,20)+'…';g.fillText(name,256,78);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:false});const sprite=new THREE.Sprite(material);sprite.scale.set(3.0,.75,1);return sprite
}
function createBox(parent,w,h,d,x,y,z,color,options){
  const material=new THREE.MeshStandardMaterial(Object.assign({color:color,roughness:.8},options||{}));
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function makePerson(color,scale){
  const group=new THREE.Group(),s=scale||1;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22*s,.55*s,3,6),new THREE.MeshStandardMaterial({color:color,roughness:.8}));body.position.y=.55*s;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.19*s,8,6),new THREE.MeshStandardMaterial({color:0xf1c999,roughness:.9}));head.position.y=1.05*s;group.add(head);
  const cap=createBox(group,.39*s,.11*s,.35*s,0,1.19*s,0,0x324432);return group
}
function makeBuilding(p,index){
  const slot=positions[index%positions.length],group=new THREE.Group(),level=levelFor(p),floors=1+level,height=1.3+floors*.58;
  group.position.set(slot[0],0,slot[1]);group.userData.projectId=p.id;group.userData.category=p.category||'Community';
  const color=categoryColor[p.category]||categoryColor.Community;
  const shell=createBox(group,2.25,height,1.85,0,height/2,0,color);shell.userData.projectId=p.id;group.userData.shell=shell;
  createBox(group,2.5,.18,2.1,0,height+.08,0,0x344436);
  createBox(group,.8,.3,.12,0,height+.29,1.08,0x253328);
  for(let floor=0;floor<floors;floor++){
    const y=.5+floor*.58;
    for(let col=0;col<3;col++){
      const wx=-.72+col*.72;
      createBox(group,.28,.24,.06,wx,y,.96,0xe6f5c2,{emissive:0x263b18,roughness:.35});
    }
  }
  createBox(group,.38,.75,.08,0,.38,.98,0x273c32);
  const sign=canvasLabel(p.name);sign.position.set(0,height+.72,0);group.add(sign);
  const founder=makePerson(0xe8d68b,.82);founder.position.set(1.65,0,1.35);group.add(founder);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.035,5,24),new THREE.MeshStandardMaterial({color:0xc4f586,emissive:0x5d8633,emissiveIntensity:.45}));
  ring.rotation.x=Math.PI/2;ring.position.set(1.65,.05,1.35);group.add(ring);
  group.traverse(obj=>{obj.userData.projectId=p.id});
  scene.add(group);group.scale.y=.8;
  return {group,project:p,index:index,shell:shell,level:level,baseColor:color,pulseUntil:0}
}
function addWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0xdce9d5);scene.fog=new THREE.Fog(0xdce9d5,25,65);
  camera=new THREE.PerspectiveCamera(48,root.clientWidth/root.clientHeight,.1,120);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(root.clientWidth,root.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;root.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf8ffe9,0x64745b,2.0));
  const sun=new THREE.DirectionalLight(0xfff0cf,2.3);sun.position.set(-12,20,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(48,38),new THREE.MeshStandardMaterial({color:0x9bc878,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.07;ground.receiveShadow=true;scene.add(ground);
  createBox(scene,48,.08,4,0,0,0,0xd7c99c);createBox(scene,4,.09,38,0,.01,0,0xd7c99c);
  createBox(scene,48,.035,.08,0,.07,-2.1,0xf5edcb);createBox(scene,48,.035,.08,0,.07,2.1,0xf5edcb);
  createBox(scene,.08,.035,38,-2.1,.07,0,0xf5edcb);createBox(scene,.08,.035,38,2.1,.07,0,0xf5edcb);
  for(let i=-20;i<20;i+=2.4){createBox(scene,.95,.025,.09,i,.07,0,0xfff3d1);createBox(scene,.09,.025,.95,0,.07,i,0xfff3d1)}
  for(let i=0;i<12;i++){const x=-21+(i%6)*8.4,z=-15+Math.floor(i/6)*29;const trunk=createBox(scene,.18,.9,.18,x,.45,z,0x80613c);const top=new THREE.Mesh(new THREE.ConeGeometry(.8,1.6,5),new THREE.MeshStandardMaterial({color:i%2?0x4c8c49:0x67a950}));top.position.set(x,1.55,z);top.castShadow=true;scene.add(top)}
  projects.slice(0,positions.length).forEach((p,i)=>buildings.push(makeBuilding(p,i)));
  player=makePerson(0x495a98,1);player.position.set(0,0,1.2);scene.add(player);
  for(let i=0;i<3;i++){const bot=makePerson([0xd18469,0x7e6eb2,0x4d9b9a][i],.82);scene.add(bot);visitors.push({mesh:bot,phase:i*2.1,radius:5+i*1.1})}
  camera.position.set(9,10,14);camera.lookAt(0,0,0);
  renderer.domElement.addEventListener('click',onCanvasClick);
  window.addEventListener('resize',resize);
  renderer.setAnimationLoop(animate);
}
function resize(){if(!renderer||!camera)return;const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
function projectFor(id){return projects.find(p=>p.id===id)}
function showProject(p){
  if(!p)return;selectedId=p.id;
  document.querySelector('#venture-details').innerHTML='<h3>'+escapeHtml(p.name)+'</h3><div class="world-meta">'+escapeHtml(p.category||'Community')+' · SIMULATED SCORE '+Number(p.score||0)+'</div><p>'+escapeHtml(p.description||p.solution||p.problem||'Early venture idea')+'</p><span class="world-level">BUILDING LEVEL '+levelFor(p)+' · '+Number(p.raised||0).toLocaleString()+' SIGNAL POINTS</span>';
  ['#world-enter','#world-speak','#world-question','#world-ask','#world-demo-signal'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.disabled=false});
  renderList();say('Selected '+p.name+'. Walk to the building and press E to meet the founder.');
}
function renderList(){
  const list=document.querySelector('#world-project-list');if(!list)return;
  list.innerHTML=projects.map((p,i)=>'<button class="'+(p.id===selectedId?'active':'')+'" data-world-project="'+escapeHtml(p.id)+'">'+String(i+1).padStart(2,'0')+' · '+escapeHtml(p.name)+' · L'+levelFor(p)+'</button>').join('');
  list.querySelectorAll('[data-world-project]').forEach(btn=>btn.onclick=()=>{const p=projectFor(btn.dataset.worldProject);showProject(p);focusBuilding(p.id)});
}
function focusBuilding(id){
  const b=buildings.find(item=>item.project.id===id);if(!b)return;
  player.position.x=b.group.position.x+2.7;player.position.z=b.group.position.z+2.9;
  say('Walked to '+b.project.name+'. Press E to meet the founder.');
}
function nearestBuilding(){
  let best=null,distance=Infinity;
  for(const b of buildings){const x=b.group.position.x+1.65,z=b.group.position.z+1.35,d=Math.hypot(player.position.x-x,player.position.z-z);if(d<distance){best=b;distance=d}}
  return {building:best,distance:distance}
}
function interact(){
  const n=nearestBuilding();if(!n.building||n.distance>3.5){say('Move closer to a founder booth, then press E.');return}
  showProject(n.building.project);document.querySelector('#world-feed').textContent='Founder booth: '+n.building.project.name+'. Ask a question or listen to the pitch.';
}
function onCanvasClick(event){
  const rect=renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1)),ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects(buildings.map(b=>b.group),true)[0];if(hit){const p=projectFor(hit.object.userData.projectId);if(p){showProject(p);document.querySelector('#world-feed').textContent='Building selected: '+p.name+'. Use the founder panel or walk up and press E.'}}
}
function collides(x,z){
  return buildings.some(b=>Math.abs(x-b.group.position.x)<1.55&&Math.abs(z-b.group.position.z)<1.35)
}
function onKeysDown(event){
  if(event.target&&['INPUT','TEXTAREA','BUTTON'].includes(event.target.tagName))return;
  const key=event.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){event.preventDefault();keys.add(key)}
  if(key==='e')interact()
}
function moveStep(dt){
  let x=0,z=0;if(keys.has('arrowleft')||keys.has('a'))x-=1;if(keys.has('arrowright')||keys.has('d'))x+=1;if(keys.has('arrowup')||keys.has('w'))z-=1;if(keys.has('arrowdown')||keys.has('s'))z+=1;
  if(x||z){const len=Math.hypot(x,z),nx=THREE.MathUtils.clamp(player.position.x+x/len*dt*5,-20,20),nz=THREE.MathUtils.clamp(player.position.z+z/len*dt*5,-15,15);if(!collides(nx,player.position.z))player.position.x=nx;if(!collides(player.position.x,nz))player.position.z=nz}
}
function animate(time){
  const dt=Math.min(.04,(time-lastFrame)/1000||0);lastFrame=time;
  if(player){moveStep(dt);player.rotation.y=keys.has('arrowleft')||keys.has('a')?-Math.PI/2:keys.has('arrowright')||keys.has('d')?Math.PI/2:0}
  if(camera&&player){const target=new THREE.Vector3(player.position.x+8,9,player.position.z+11);camera.position.lerp(target,.06);camera.lookAt(player.position.x,0.8,player.position.z)}
  visitors.forEach(bot=>{const a=time/3500+bot.phase;bot.mesh.position.set(Math.cos(a)*bot.radius,0,Math.sin(a)*bot.radius);bot.mesh.rotation.y=-a});
  buildings.forEach(b=>{if(b.group.scale.y<1)b.group.scale.y=Math.min(1,b.group.scale.y+dt*1.4);if(b.pulseUntil>Date.now()){const m=b.shell.material;m.emissive.setHex(0x6b9b38);m.emissiveIntensity=.4+Math.sin(time/100)*.32}else{b.shell.material.emissive.setHex(0x000000);b.shell.material.emissiveIntensity=0}});
  if(renderer)renderer.render(scene,camera)
}
function refreshBuilding(p){
  const old=buildings.find(b=>b.project.id===p.id);if(!old)return;
  const i=old.index;scene.remove(old.group);old.group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose()}});
  buildings[i]=makeBuilding(p,i);buildings[i].group.scale.y=.55;showProject(p);
}
function submitSignal(){
  const p=projectFor(selectedId);if(!p)return;
  p.raised=Number(p.raised||0)+1;p.backers=Number(p.backers||0)+1;save();refreshBuilding(p);
  document.querySelector('#world-feed').textContent='No-payment demo signal recorded for '+p.name+'. The building now reflects local game points.';
  say('Demo signal added. No money was charged.');
}
async function askFounder(){
  const p=projectFor(selectedId),input=document.querySelector('#world-question'),answer=document.querySelector('#world-answer');if(!p)return;
  const question=input.value.trim();if(!question){answer.textContent='Type a question for the founder first.';return}
  answer.textContent='Founder AI is thinking…';
  try{const response=await fetch('/api/founder/answer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project:p,question:question})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Founder response unavailable.');answer.textContent=(data.source||'Founder AI')+': '+data.answer}
  catch(error){answer.textContent=error.message||'Could not reach the founder coach.'}
}
function speakPitch(){
  const p=projectFor(selectedId);if(!p)return;
  if(!('speechSynthesis'in window)||!window.SpeechSynthesisUtterance){say('Speech synthesis is not available in this browser.');return}
  const text=String(p.pitch||((p.name||'This venture')+' helps '+(p.audience||'a specific audience')+' with '+(p.solution||p.description||'a focused solution')+'.')).split(/\s+/).slice(0,72).join(' ');
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.rate=1.02;utterance.pitch=1.08;speechSynthesis.speak(utterance);say('Playing the founder pitch using browser speech.');
}
function updateEventVisual(category){
  buildings.forEach(b=>{if(b.project.category===category)b.pulseUntil=Date.now()+8000})
}
async function marketEvent(manual){
  const events=[{category:'Climate',title:'Green neighborhood shift',detail:'A fictional community tailwind gives climate concepts more attention.'},{category:'AI Tools',title:'AI tool discovery wave',detail:'A fictional technology trend sends more explorers to AI tool concepts.'},{category:'Health',title:'Wellbeing awareness week',detail:'A fictional health-awareness scenario brings new attention to wellbeing ideas.'},{category:'Education',title:'Learning access challenge',detail:'A fictional education scenario rewards clear onboarding and accessible learning.'}];
  const event=events[Math.floor(Math.random()*events.length)],example=projects.find(p=>p.category===event.category);
  document.querySelector('#world-feed').textContent='SIMULATION EVENT: '+event.title+'. '+event.detail;
  updateEventVisual(event.category);marketPulse++;
  try{const r=await fetch('/api/market/briefing',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:event.detail,projectName:example&&example.name,category:event.category})});const data=await r.json();if(data.headline)document.querySelector('#world-feed').textContent=data.headline}catch{}
  if(manual)say('Fictional market event applied to '+event.category+'. No payout or real-world market change occurred.');
}
function handleServerSignal(message){
  if(!message||message.type!=='community_signal'||!message.projectId)return;
  const seen=new Set();try{JSON.parse(localStorage.getItem(CAPTURE_STORE)||'[]').forEach(x=>seen.add(x))}catch{}
  if(seen.has(message.captureId))return;
  if(message.captureId){seen.add(message.captureId);while(seen.size>500)seen.delete(seen.values().next().value);localStorage.setItem(CAPTURE_STORE,JSON.stringify([...seen]))}
  const p=projectFor(message.projectId);if(!p)return;
  p.raised=Number(p.raised||0)+Number(message.amount||0);p.backers=Number(p.backers||0)+1;save();refreshBuilding(p);
  document.querySelector('#world-feed').textContent='Verified PayPal Sandbox signal updated '+p.name+'. Building level '+levelFor(p)+'.';
  say('Sandbox signal confirmed. Venture building refreshed.');
}
function setupWorldControls(){
  window.addEventListener('keydown',onKeysDown);window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  const dirs={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'};
  document.querySelectorAll('[data-move]').forEach(btn=>{const key=dirs[btn.dataset.move],down=e=>{e.preventDefault();keys.add(key)},up=()=>keys.delete(key);btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up)});
  document.querySelector('#world-enter').onclick=interact;document.querySelector('#world-speak').onclick=speakPitch;
  document.querySelector('#world-ask').onclick=askFounder;document.querySelector('#world-question').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();askFounder()}};
  document.querySelector('#world-demo-signal').onclick=submitSignal;document.querySelector('#world-event').onclick=()=>marketEvent(true);
  document.querySelectorAll('.world-project-list').forEach(list=>list.addEventListener('click',e=>{const btn=e.target.closest('[data-world-project]');if(btn){const p=projectFor(btn.dataset.worldProject);showProject(p);focusBuilding(p.id)}}));
  const events=new EventSource('/api/events');events.onmessage=e=>{try{handleServerSignal(JSON.parse(e.data))}catch{}};
  setInterval(()=>marketEvent(false),120000);
}
async function start(){
  try{
    THREE=await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js');
    addWorld();setupWorldControls();
    selectedId=projects[0]&&projects[0].id;if(selectedId)showProject(projects[0]);renderList();
    document.querySelector('#world-feed').textContent='3 fictional district visitors are exploring. Walk to a building to meet its founder.';
    say('Use WASD or arrow keys to explore. Press E at a founder booth.');
  }catch(error){
    root.innerHTML='<div class="world-error"><div><strong>3D world could not load in this browser.</strong><br>Check the internet connection for the Three.js CDN, or return to the VentureQuest dashboard.<br><a href="/">Back to dashboard</a></div></div>';
    say('Three.js or WebGL is unavailable.');
  }
}
start();
