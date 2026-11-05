(()=>{
  const style=document.createElement('link');style.rel='stylesheet';style.href='/arena.css';document.head.append(style);
  const board=document.createElement('section');board.className='arena-board';board.id='arena-board';
  board.innerHTML='<div class="arena-top"><div><div class="eyebrow">VENTUREQUEST LIVE ARENA</div><h2>Signals in the simulation</h2><p>Illustrative activity from this browser only. No live market data or location tracking.</p></div><span class="arena-live"><i></i> SIMULATION FEED</span></div><div class="arena-ticker"><span id="arena-news">Simulation briefing: explore a venture to create a local market signal.</span></div><div class="arena-grid"><section class="arena-panel"><h3>Innovation ticker</h3><p class="arena-caption">A playful local index that reacts to demo signals and scenarios. It is not a stock price or financial return.</p><svg class="arena-chart" viewBox="0 0 640 180" role="img" aria-label="Illustrative simulated interest line chart"><defs><linearGradient id="arenaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9aca62" stop-opacity=".35"/><stop offset="1" stop-color="#9aca62" stop-opacity="0"/></linearGradient></defs><path id="arena-chart-area" class="arena-chart-area"></path><path id="arena-chart-line" class="arena-chart-line"></path></svg><div class="arena-stats"><div>Signals recorded<b id="arena-signal-count">0</b></div><div>Local market index<b id="arena-index">50</b></div><div>Featured category<b id="arena-category">—</b></div></div></section><section class="arena-panel"><h3>Innovation world map</h3><p class="arena-caption">Decorative demo hotspots by fictional region; no location or country is collected.</p><svg class="arena-map" viewBox="0 0 500 230" role="img" aria-label="Illustrative fictional region activity map"><path class="arena-continent" d="M42 61l25-24 35-8 21 12 20-3 18 14-8 18-20 6-8 18-20 9-9 22-20 7-7 20-14-3-7-18-19-5-12-22 8-23-8-14zM185 53l28-17 38 4 20 15 34-2 16 13-6 14-27 7-11 14-23-3-10 16-23 3-10 20-18-9-4-19-16-12 7-19-16-12zM291 42l31-15 38 5 24-13 32 11 13 19-17 13-3 18-22 10-11 24-21 6-11-15-20 2-9-15-22-6-12-17zM366 133l23-10 23 7 14 22-8 20-18 9-22-12-15-20z"/><circle class="arena-map-dot" cx="118" cy="88" r="8"/><circle class="arena-map-dot" cx="259" cy="91" r="8"/><circle class="arena-map-dot" cx="371" cy="78" r="8"/><text class="arena-region-label" x="74" y="125">AMERICAS</text><text class="arena-region-label" x="205" y="127">EUROPE · AFRICA</text><text class="arena-region-label" x="337" y="108">ASIA PACIFIC</text></svg></section><section class="arena-panel" style="grid-column:1/-1"><h3>AI Hall of Fame</h3><p class="arena-caption">Ranks ventures by simulated feasibility and community signals. Social impact scores are illustrative, not measured outcomes.</p><div class="arena-leader-list" id="arena-leaderboard"></div></section></div>';
  const market=document.querySelector('#market');if(market)market.insertAdjacentElement('afterend',board);
  const pitchContent=document.querySelector('#pitch-content');const pitchArena=document.createElement('section');pitchArena.className='pitch-arena';pitchArena.id='pitch-arena';pitchArena.setAttribute('aria-label','AI live pitch arena');if(pitchContent)pitchContent.insertAdjacentElement('afterend',pitchArena);
  let series=[34,37,36,42,39,45,44,48,46,51,49,53],signalCount=0,newsIndex=0;
  const news=['Simulation briefing: a community discovery event may lift interest in local climate ideas.','Simulation briefing: a fictional AI tools trend is drawing extra exploration in this demo market.','Simulation briefing: a steady-market scenario rewards clear onboarding and repeat use.','Simulation briefing: competitor pressure makes a focused user test the next useful move.'];
  const clamp=n=>Math.max(8,Math.min(94,n));
  function drawChart(){
    const line=document.querySelector('#arena-chart-line'),area=document.querySelector('#arena-chart-area');if(!line||!area)return;
    const vals=series.slice(-12),pts=vals.map((v,i)=>[24+i*(592/(vals.length-1)),150-(clamp(v)*1.28)]);
    const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    line.setAttribute('d',path);area.setAttribute('d',path+' L 616 170 L 24 170 Z');
    const index=document.querySelector('#arena-index');if(index)index.textContent=String(Math.round(vals[vals.length-1]));
    const count=document.querySelector('#arena-signal-count');if(count)count.textContent=String(signalCount);
  }
  function renderHall(){
    const list=document.querySelector('#arena-leaderboard');if(!list)return;
    const ranked=[...projects].sort((a,b)=>Number(b.score||0)-Number(a.score||0)||Number(b.backers||0)-Number(a.backers||0)).slice(0,5);
    list.innerHTML=ranked.map((p,i)=>{
      const category=String(p.category||'Community'),impact=Math.min(99,Math.round((Number(p.score||0)*.58)+(Number(p.backers||0)*.22)+(category==='Community'||category==='Climate'||category==='Health'?18:8)));
      const badge=impact>=75?'Impact explorer':category==='Climate'?'Climate spark':'Venture scout';
      return '<article class="arena-leader"><div class="arena-rank">#'+(i+1)+'</div><div><div class="arena-leader-name">'+esc(p.name)+'</div><div class="arena-leader-meta">'+esc(category)+' · '+Number(p.score||0)+' simulated score · '+Number(p.raised||0).toLocaleString()+' signal pts</div><span class="arena-badge">'+badge+' · '+impact+'</span><br><button class="arena-share" type="button" data-share="'+esc(p.id)+'">Share badge</button></div><div class="arena-impact">IMPACT<br>'+impact+'</div></article>';
    }).join('')||'<p class="arena-caption">Add a venture to start this local leaderboard.</p>';
    list.querySelectorAll('[data-share]').forEach(button=>button.onclick=async()=>{
      const p=projects.find(item=>item.id===button.dataset.share);if(!p)return;
      const impact=Math.min(99,Math.round((Number(p.score||0)*.58)+(Number(p.backers||0)*.22)+(p.category==='Community'||p.category==='Climate'||p.category==='Health'?18:8)));
      const message='I am exploring '+p.name+' in VentureQuest AI. Simulated impact score: '+impact+'/100. This is a game score, not a verified impact metric.';
      try{if(navigator.share)await navigator.share({title:'VentureQuest AI badge',text:message,url:location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(message);toast('Badge text copied.')}else toast(message)}catch{}
    });
  }
  function refreshArena(){drawChart();renderHall();}
  function showNews(message,project){const ticker=document.querySelector('#arena-news');if(ticker)ticker.textContent='Simulation insight: '+message;newsIndex=(newsIndex+1)%news.length;if(config.aiMode&&config.aiMode.indexOf('Ollama')===0){fetch('/api/market/briefing',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:message,projectName:project&&project.name,category:project&&project.category})}).then(r=>r.json()).then(data=>{if(data.headline&&ticker)ticker.textContent=data.headline}).catch(()=>{})}}
  function celebrate(label){
    for(let i=0;i<36;i++){const bit=document.createElement('i');bit.className='arena-confetti';bit.style.left=(Math.random()*100)+'vw';bit.style.background=['#b8f36b','#ffb36c','#e7ddff','#77b9ef'][i%4];bit.style.animationDelay=(Math.random()*.35)+'s';document.body.append(bit);setTimeout(()=>bit.remove(),2200)}
    if(label)toast(label);
  }
  function pitchText(p){const text=String(p.pitch||((p.name||'This venture')+' helps '+(p.audience||'a specific audience')+' address '+(p.problem||'a clear problem')+' with '+(p.solution||p.description||'a focused solution')+'.'));return text.split(/\s+/).slice(0,72).join(' ')}
  async function askFounder(p,question,answerBox){
    const q=String(question||'').trim();if(!q){answerBox.textContent='Enter a question for the founder first.';return}
    answerBox.textContent='Founder AI is thinking…';
    try{const response=await fetch('/api/founder/answer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project:p,question:q})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Founder answer unavailable.');answerBox.textContent=(data.source||'Founder AI')+': '+data.answer}
    catch(error){answerBox.textContent=error.message||'Could not reach the founder coach.'}
  }
  function showPitchArena(p){
    const host=document.querySelector('#pitch-arena');if(!host)return;
    const face=p.category==='Climate'?'🌱':p.category==='Health'?'✚':p.category==='Education'?'✎':'✳';
    host.innerHTML='<div class="pitch-arena-head"><div><div class="eyebrow">AI LIVE PITCH ARENA · SIMULATED</div><h3>Meet the co-founder</h3><p>Listen with browser speech, or ask a question. Ollama answers locally when available.</p></div><div class="pitch-avatar" id="pitch-avatar"><span class="pitch-avatar-face">'+face+'</span><span>Founder · '+esc(p.founder||'AI Co-founder')+'</span></div></div><div class="pitch-arena-grid"><div class="holo-wrap"><article class="holo-card"><div class="holo-icon">'+face+'</div><div class="holo-tag">'+esc(p.category||'Venture concept')+'</div><h4>'+esc(p.name)+'</h4><p>'+esc(p.valueProposition||p.solution||p.description||'Early concept card')+'</p></article></div><div><div class="pitch-arena-actions"><button type="button" id="listen-pitch">▶ Listen to 30-second pitch</button><button type="button" class="light" id="stop-pitch">Stop voice</button><button type="button" class="light" id="voice-question">Ask by voice</button></div><div class="arena-question"><input id="founder-question" maxlength="800" placeholder="Ask the founder a question…"><button type="button" id="ask-founder">Ask founder</button></div><div class="arena-answer" id="founder-answer" aria-live="polite"></div><div class="pitch-arena-actions"><button type="button" class="light" id="run-negotiation">Run agent-to-agent bid demo</button></div><div class="arena-negotiation" id="negotiation-output" hidden></div><div class="pitch-arena-actions" id="sandbox-award-row" hidden><button type="button" id="sandbox-award">Send fixed $1 Sandbox game award</button></div><p class="arena-caption">Demo negotiations use signal points only. The optional award is a user-triggered PayPal Sandbox payout, not an investor dividend.</p></div></div>';
    const answerBox=host.querySelector('#founder-answer'),question=host.querySelector('#founder-question'),avatar=host.querySelector('#pitch-avatar');
    host.querySelector('#listen-pitch').onclick=()=>{
      if(!('speechSynthesis'in window)||!window.SpeechSynthesisUtterance){answerBox.textContent='Browser speech synthesis is not available here.';return}
      speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(pitchText(p));utterance.rate=1.02;utterance.pitch=1.08;avatar.classList.add('speaking');utterance.onend=()=>avatar.classList.remove('speaking');utterance.onerror=()=>avatar.classList.remove('speaking');speechSynthesis.speak(utterance);
    };
    host.querySelector('#stop-pitch').onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();avatar.classList.remove('speaking')};
    host.querySelector('#ask-founder').onclick=()=>askFounder(p,question.value,answerBox);
    question.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();askFounder(p,question.value,answerBox)}};
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,voiceButton=host.querySelector('#voice-question');
    if(!Recognition)voiceButton.hidden=true;else voiceButton.onclick=()=>{const recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;recognition.onresult=e=>{question.value=e.results[0][0].transcript;askFounder(p,question.value,answerBox)};recognition.onerror=()=>{answerBox.textContent='Voice input did not work; type your question instead.'};recognition.start()};
    host.querySelector('#run-negotiation').onclick=async()=>{
      const out=host.querySelector('#negotiation-output'),btn=host.querySelector('#run-negotiation');btn.disabled=true;out.hidden=false;out.textContent='Investor agent is preparing a demo offer…';
      const q='An explorer agent proposes 5 simulated community signal points for this venture, with no money and no ownership. What experiment result would the founder share before asking for more support?';
      try{const response=await fetch('/api/founder/answer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project:p,question:q})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Negotiation unavailable.');out.textContent='Explorer agent (fictional): I can add 5 signal points after you define what evidence you will bring back.\\nFounder AI: '+data.answer+'\\n\\nNo payment, ownership, or profit share is created.';const accept=document.createElement('button');accept.className='fund-btn';accept.textContent='Accept 5-point demo signal';accept.onclick=()=>{applySignal(p.id,5);out.textContent+='\\n\\nDemo signal recorded.';accept.remove()};out.append(document.createElement('br'),accept)}
      catch(error){out.textContent=error.message||'Negotiation unavailable.'}
      finally{btn.disabled=false}
    };
    const awardRow=host.querySelector('#sandbox-award-row');awardRow.hidden=!Boolean(config.payoutsEnabled);
    if(config.payoutsEnabled)host.querySelector('#sandbox-award').onclick=async()=>{
      const button=host.querySelector('#sandbox-award');button.disabled=true;button.textContent='Sending Sandbox award…';
      try{const response=await fetch('/api/paypal/payout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId:p.id,scenario:'Pitch Arena demo award'})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Sandbox award failed.');celebrate('Fixed $1 Sandbox game award: '+data.status)}
      catch(error){answerBox.textContent=error.message||'Sandbox award failed.'}
      finally{button.disabled=false;button.textContent='Send fixed $1 Sandbox game award'}
    };
  }
  const originalOpenPitch=openPitch;
  openPitch=function(id){originalOpenPitch(id);const p=projects.find(item=>item.id===id);if(p)showPitchArena(p)};
  const originalRender=render;
  render=function(){originalRender();refreshArena()};
  const originalSignal=applySignal;
  applySignal=function(id,amount){originalSignal(id,amount);const p=projects.find(item=>item.id===id);if(p){signalCount++;series.push(clamp(series[series.length-1]+Math.max(1,Number(amount)||1)));showNews('Demo signal: '+p.name+' gained '+Number(amount||0)+' simulated community points in this browser.',p);document.querySelector('#arena-category').textContent=p.category||'Community';document.querySelectorAll('.arena-map-dot').forEach((dot,i)=>dot.setAttribute('r',i===signalCount%3?'10':'7'))}refreshArena()};
  const originalSimulation=runMarketSimulation;
  runMarketSimulation=function(p){originalSimulation(p);series.push(clamp(series[series.length-1]+3));showNews('Simulation complete: scenario signals refreshed for '+p.name+'. No revenue or ROI was estimated.',p);refreshArena();celebrate('Scenario complete · simulated milestone')};
  renderArena();
  setInterval(()=>{const ticker=document.querySelector('#arena-news');if(ticker){ticker.textContent=news[newsIndex];newsIndex=(newsIndex+1)%news.length}},11000);
})();
