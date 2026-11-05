const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const paypalBase = 'https://api-m.sandbox.paypal.com';
const ollamaBase = 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
let ollamaAvailable = false;
const orderInfo=new Map();
const seenCaptures=new Set();
const eventClients=new Set();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const readJson = req => new Promise((resolve, reject) => { let body=''; req.on('data', c => { body += c; if (body.length > 1e6) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); });
const readRaw = req => new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',c=>{size+=c.length;if(size>1e6){reject(new Error('Request too large'));req.destroy();return}chunks.push(c)});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject)});
const send = (res, code, data) => { res.writeHead(code, { 'content-type':'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
function emitEvent(event){const nl=String.fromCharCode(10),message='data: '+JSON.stringify(event)+nl+nl;for(const client of eventClients)client.write(message)}
function recordCaptureSignal(projectId,captureId,amount){if(!projectId||!captureId||seenCaptures.has(String(captureId)))return false;seenCaptures.add(String(captureId));emitEvent({type:'community_signal',projectId:String(projectId),captureId:String(captureId),amount:Number(amount)||0});return true}

async function detectOllama() {
  try {
    const response = await fetch(`${ollamaBase}/api/tags`, { signal:AbortSignal.timeout(900) });
    if (!response.ok) return false;
    const data = await response.json();
    return (data.models || []).some(model => model.name === ollamaModel || model.model === ollamaModel);
  } catch { return false; }
}

async function evaluateWithOllama(project) {
  const response = await fetch(`${ollamaBase}/api/chat`, {
    method:'POST', headers:{'content-type':'application/json'}, signal:AbortSignal.timeout(90000),
    body:JSON.stringify({ model:ollamaModel, stream:false, format:'json', options:{temperature:0.3}, messages:[
      { role:'system', content:'You are a cautious AI co-founder for a fictional venture simulator. Evaluate idea clarity, user need, delivery plan, and risks. Draft practical venture assets from the user-provided idea. Do not give investment advice, predict financial returns, invent market facts, or claim validation. Return JSON with score (integer 1-100), verdict (one sentence), strengths (2 short strings), risks (2 short strings), nextSteps (2 short strings), valueProposition (one sentence), targetUser (one concise phrase), businessModelDraft (one concise hypothesis), pitch (a concise 2-sentence pitch), and firstExperiment (one measurable test a founder can run within a week).' },
      { role:'user', content:JSON.stringify(project) }
    ] })
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = await response.json();
  const parsed = JSON.parse(data.message?.content || '{}');
  const draft=localDrafts(project);
  const list = (value, fallback) => Array.isArray(value) ? value.slice(0,3).map(x => String(x).slice(0,240)) : fallback;
  const text = (value, fallback) => String(value || fallback).trim().slice(0,360);
  return {
    score:Math.max(1,Math.min(100,Math.round(Number(parsed.score) || 50))),
    verdict:String(parsed.verdict || 'A useful starting point; test the riskiest assumption with real users.').slice(0,300),
    strengths:list(parsed.strengths, ['The idea can be shaped through user feedback.']),
    risks:list(parsed.risks, ['Validate the need before building.']),
    nextSteps:list(parsed.nextSteps, ['Talk with five potential users.', 'Test one small prototype.']),
    valueProposition:text(parsed.valueProposition,draft.valueProposition),
    targetUser:text(parsed.targetUser,draft.targetUser),
    businessModelDraft:text(parsed.businessModelDraft,draft.businessModelDraft),
    pitch:text(parsed.pitch,draft.pitch),
    firstExperiment:text(parsed.firstExperiment,draft.firstExperiment)
  };
}

function localDrafts(p) {
  const clean=value=>String(value||'').trim().replace(/\s+/g,' ').slice(0,220);
  const name=clean(p.name)||'This venture';
  const problem=clean(p.problem)||'a problem worth solving';
  const audience=clean(p.audience)||'people who experience this problem';
  const solution=clean(p.solution)||'a focused solution';
  const model=clean(p.model);
  return {
    valueProposition:`${audience}: ${solution} addresses ${problem}.`.slice(0,360),
    targetUser:audience,
    businessModelDraft:model||'Test a small paid pilot only after users confirm they want this solution.',
    pitch:`${name} helps ${audience} address ${problem} with ${solution}. The next step is to test the riskiest assumption with real users.`.slice(0,480),
    firstExperiment:`Within one week, speak with five ${audience} about ${problem}, show them a simple ${solution} concept, and record how many ask to try it.`.slice(0,480)
  };
}

function localEvaluation(p) {
  const words = String(p.problem || '').trim().split(/\\s+/).filter(Boolean).length;
  const audience = String(p.audience || '').trim().length;
  const solution = String(p.solution || '').trim().length;
  const model = String(p.model || '').trim().length;
  const score = Math.max(28, Math.min(91, 34 + Math.min(words, 20) + (audience ? 12 : 0) + Math.min(solution, 90) / 8 + Math.min(model, 70) / 10));
  return { score: Math.round(score), verdict: score > 72 ? 'A promising simulation candidate; validate demand with a small user test.' : 'A useful starting point; sharpen the target user and test the riskiest assumption.', strengths: [audience ? `Clear audience: ${p.audience}` : 'An early idea is ready to explore', solution ? 'A solution direction is defined' : 'Room to shape a distinctive solution'], risks: [audience ? 'Confirm that this audience feels the problem often.' : 'The target user is still unclear.', 'Market response in this simulator is illustrative, not predictive.'], nextSteps: ['Interview five target users and record what they do today.', 'Build the smallest prototype that tests one key assumption.'], ...localDrafts(p) };
}

async function paypalToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Add PayPal Sandbox credentials to .env to enable checkout.');
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch(`${paypalBase}/v1/oauth2/token`, { method:'POST', headers:{ authorization:`Basic ${auth}`, 'content-type':'application/x-www-form-urlencoded' }, body:'grant_type=client_credentials' });
  const j = await r.json(); if (!r.ok) throw new Error(j.error_description || 'PayPal authentication failed');
  return j.access_token;
}

async function verifyPayPalWebhook(event,headers){
  if(!process.env.PAYPAL_WEBHOOK_ID)return false;
  const token=await paypalToken();
  const verification={auth_algo:headers['paypal-auth-algo'],cert_url:headers['paypal-cert-url'],transmission_id:headers['paypal-transmission-id'],transmission_sig:headers['paypal-transmission-sig'],transmission_time:headers['paypal-transmission-time'],webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:event};
  if(Object.values(verification).some(value=>!value))return false;
  const response=await fetch(paypalBase+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(verification)});
  const data=await response.json();return response.ok&&data.verification_status==='SUCCESS';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    if(url.pathname==='/api/events'&&req.method==='GET'){
      res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform',connection:'keep-alive'});
      const nl=String.fromCharCode(10);res.write('event: ready'+nl+'data: {}'+nl+nl);eventClients.add(res);req.on('close',()=>eventClients.delete(res));return;
    }
    if (url.pathname === '/api/config' && req.method === 'GET') {
      ollamaAvailable = await detectOllama();
      return send(res, 200, { paypalClientId:process.env.PAYPAL_CLIENT_ID || '', aiMode:ollamaAvailable ? `Ollama · ${ollamaModel}` : 'Local coach', payoutsEnabled:Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_PAYOUT_TEST_EMAIL), webhookEnabled:Boolean(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_WEBHOOK_ID) });
    }
    if (url.pathname === '/api/evaluate' && req.method === 'POST') {
      const project = await readJson(req);
      const ai = ollamaAvailable ? await evaluateWithOllama(project).catch(() => null) : null;
      return send(res, 200, { ... (ai || localEvaluation(project)), source:ai ? `Ollama local · ${ollamaModel}` : 'Local coach' });
    }
    if (url.pathname === '/api/market/briefing' && req.method === 'POST') {
      const input=await readJson(req),event=String(input.event||'').trim().slice(0,500),projectName=String(input.projectName||'this venture').trim().slice(0,100),category=String(input.category||'Community').trim().slice(0,50),outcomes=String(input.outcomes||'').trim().slice(0,800);
      if(ollamaAvailable){
        try{
          const response=await fetch(`${ollamaBase}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:ollamaModel,stream:false,options:{temperature:0.4,num_predict:90},messages:[
            {role:'system',content:'Write one short, lively fictional market simulation insight using the supplied event and the supplied deterministic AI-score impact summary. Do not change or invent score outcomes. Begin with “Simulation insight:”. Do not describe real news, live market data, actual companies, actual investment performance, payouts, or financial returns.'},
            {role:'user',content:JSON.stringify({event,projectName,category,outcomes})}
          ]})});
          if(response.ok){const data=await response.json(),headline=String(data.message?.content||'').trim().slice(0,240);if(headline)return send(res,200,{headline,source:`Ollama · ${ollamaModel}`})}
        }catch{}
      }
      return send(res,200,{headline:`Simulation insight: ${projectName} in ${category} — ${event}. AI-score stress test: ${outcomes||'No venture impact calculated.'}`.slice(0,240),source:'Local simulation'});
    }
    if (url.pathname === '/api/founder/answer' && req.method === 'POST') {
      const input=await readJson(req),project=input.project||{},question=String(input.question||'').trim().slice(0,800);
      if(!question)return send(res,400,{error:'Enter a question for the founder.'});
      if(ollamaAvailable){
        try{
          const response=await fetch(`${ollamaBase}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({model:ollamaModel,stream:false,options:{temperature:0.4,num_predict:180},messages:[
            {role:'system',content:'You are the founder of the venture described by the user. Answer the investor question in a confident but honest founder voice, in 2-4 concise sentences. Use only facts in the provided venture profile. Do not invent customers, revenue, competitors, traction, or results. Clearly label assumptions and say what still needs testing.'},
            {role:'user',content:JSON.stringify({venture:project,question})}
          ]})});
          if(response.ok){const data=await response.json(),answer=String(data.message?.content||'').trim().slice(0,900);if(answer)return send(res,200,{answer,source:`Ollama · ${ollamaModel}`})}
        }catch{}
      }
      const model=String(project.businessModelDraft||project.businessModel||project.model||'a business model hypothesis to validate');
      const audience=String(project.targetUser||project.audience||'the intended users');
      let answer;
      if(/revenue|price|income|monet|business model|รายได้|ราคา|เงิน/i.test(question))answer=`Our current revenue hypothesis is ${model}. We have not validated willingness to pay yet, so the next step is to test the offer with ${audience} before committing to this model.`;
      else if(/compet|alternative|different|เดิม|คู่แข่ง|ต่าง/i.test(question))answer=`We are starting with ${audience} and the problem described in this pitch. We have not verified a competitive advantage yet; we would compare the current workaround with a small prototype and learn which part people value most.`;
      else if(/customer|user|who|ลูกค้า|ผู้ใช้/i.test(question))answer=`The first audience we want to learn from is ${audience}. Our first experiment is to speak with target users and observe whether this problem is important enough for them to try a new approach.`;
      else answer=`The pitch proposes ${String(project.solution||project.description||'a focused solution')} for ${audience}. We are treating this as a hypothesis, and would test the riskiest assumption with a small user experiment before making stronger claims.`;
      return send(res,200,{answer:answer.slice(0,900),source:'Local founder fallback'});
    }
    if (url.pathname === '/api/paypal/order' && req.method === 'POST') {
      const { projectId, amount } = await readJson(req);
      const dollars = Number(amount);
      if (!Number.isFinite(dollars) || dollars < 1 || dollars > 10) return send(res, 400, { error:'Choose a demo contribution from $1 to $10.' });
      const token = await paypalToken();
      const order = await fetch(`${paypalBase}/v2/checkout/orders`, { method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'application/json', 'paypal-request-id':crypto.randomUUID() }, body:JSON.stringify({ intent:'CAPTURE', purchase_units:[{ reference_id:String(projectId || 'venturequest-demo').slice(0,64), custom_id:String(projectId || 'venturequest-demo').slice(0,64), description:'VentureQuest simulator demo contribution', amount:{ currency_code:'USD', value:dollars.toFixed(2) } }], application_context:{ brand_name:'VentureQuest AI', user_action:'PAY_NOW', shipping_preference:'NO_SHIPPING' } }) });
      const data = await order.json(); if (!order.ok) return send(res, order.status, { error:data.message || 'PayPal could not create the order.' });
      orderInfo.set(data.id,{projectId:String(projectId || 'venturequest-demo').slice(0,64),amount:dollars});
      return send(res, 200, { id:data.id });
    }
    if (url.pathname === '/api/paypal/capture' && req.method === 'POST') {
      const { orderId } = await readJson(req);
      if (!/^[A-Z0-9-]+$/i.test(String(orderId || ''))) return send(res, 400, { error:'Invalid order id.' });
      const token = await paypalToken();
      const capture = await fetch(`${paypalBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'application/json', 'paypal-request-id':crypto.randomUUID() }, body:'{}' });
      const data = await capture.json(); if (!capture.ok) return send(res, capture.status, { error:data.message || 'PayPal capture failed.' });
      const unit=data.purchase_units && data.purchase_units[0], payment=unit && unit.payments && unit.payments.captures && unit.payments.captures[0], saved=orderInfo.get(orderId);
      const projectId=(unit && (unit.custom_id||unit.reference_id))||(saved&&saved.projectId);
      if(data.status==='COMPLETED'&&payment)recordCaptureSignal(projectId,payment.id,(payment.amount&&payment.amount.value)||(saved&&saved.amount));
      return send(res, 200, { status:data.status, id:data.id, captureId:payment&&payment.id, amount:payment&&payment.amount&&payment.amount.value, projectId });
    }
    if(url.pathname==='/api/paypal/payout'&&req.method==='POST'){
      const receiver=process.env.PAYPAL_PAYOUT_TEST_EMAIL;
      if(!receiver)return send(res,409,{error:'Set PAYPAL_PAYOUT_TEST_EMAIL to a PayPal Sandbox recipient account first.'});
      const input=await readJson(req),projectId=String(input.projectId||''),scenario=String(input.scenario||'Market simulation');
      if(!/^[a-z0-9_-]{1,64}$/i.test(projectId))return send(res,400,{error:'Invalid venture id.'});
      const batchId=('VQ'+Date.now()+crypto.randomUUID().slice(0,8)).slice(0,30),token=await paypalToken();
      const response=await fetch(paypalBase+'/v1/payments/payouts',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','paypal-request-id':crypto.randomUUID()},body:JSON.stringify({sender_batch_header:{sender_batch_id:batchId,email_subject:'VentureQuest Sandbox game reward',email_message:'Sandbox-only educational game reward. Not an investment return.'},items:[{recipient_type:'EMAIL',receiver:receiver,amount:{value:'1.00',currency:'USD'},note:'VentureQuest Sandbox demo reward: '+scenario.slice(0,80),sender_item_id:batchId+'-1'}]})});
      const data=await response.json();if(!response.ok)return send(res,response.status,{error:data.message||(data.details&&data.details[0]&&data.details[0].description)||'PayPal Sandbox payout was not created.'});
      const result={type:'sandbox_payout',projectId:projectId,scenario:scenario,batchId:data.batch_header&&data.batch_header.payout_batch_id,status:(data.batch_header&&data.batch_header.batch_status)||'ACKNOWLEDGED'};emitEvent(result);
      return send(res,200,{batchId:result.batchId,status:result.status});
    }
    if(url.pathname==='/api/paypal/webhook'&&req.method==='POST'){
      const raw=await readRaw(req);let event;try{event=JSON.parse(raw.toString('utf8'))}catch{return send(res,400,{error:'Invalid webhook JSON.'})}
      if(!await verifyPayPalWebhook(event,req.headers))return send(res,401,{error:'PayPal webhook signature could not be verified.'});
      if(event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
        const capture=event.resource||{},orderId=capture.supplementary_data&&capture.supplementary_data.related_ids&&capture.supplementary_data.related_ids.order_id,saved=orderInfo.get(orderId);
        recordCaptureSignal(capture.custom_id||(saved&&saved.projectId),capture.id,(capture.amount&&capture.amount.value)||(saved&&saved.amount));
      }
      if(event.event_type&&event.event_type.indexOf('PAYMENT.PAYOUTSBATCH.')===0)emitEvent({type:'payout_status',eventType:event.event_type,batchId:event.resource&&event.resource.payout_batch_id});
      else if(event.event_type&&event.event_type.indexOf('PAYMENT.PAYOUTS-ITEM.')===0)emitEvent({type:'payout_status',eventType:event.event_type,batchId:event.resource&&event.resource.payout_batch_id});
      else emitEvent({type:'paypal_webhook',eventType:event.event_type,eventId:event.id});
      return send(res,200,{received:true});
    }
    const requested = url.pathname === '/' ? 'index.html' : (url.pathname === '/world' || url.pathname === '/world/') ? 'world.html' : path.normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    const file = path.resolve(root, requested);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error:'Not found' });
    res.writeHead(200, { 'content-type':mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 500, { error:e.message || 'Server error' }); }
});
server.listen(port, host, () => console.log(`VentureQuest AI running at http://${host}:${port}`));
