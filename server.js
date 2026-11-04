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
      { role:'system', content:'You are a cautious startup coach for a fictional venture simulator. Evaluate only idea clarity, user need, delivery plan, and risks. Do not give investment advice or predict financial returns. Return a JSON object with score (integer 1-100), verdict (one sentence), strengths (2 short strings), risks (2 short strings), and nextSteps (2 short strings).' },
      { role:'user', content:JSON.stringify(project) }
    ] })
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const data = await response.json();
  const parsed = JSON.parse(data.message?.content || '{}');
  const list = (value, fallback) => Array.isArray(value) ? value.slice(0,3).map(x => String(x).slice(0,240)) : fallback;
  return {
    score:Math.max(1,Math.min(100,Math.round(Number(parsed.score) || 50))),
    verdict:String(parsed.verdict || 'A useful starting point; test the riskiest assumption with real users.').slice(0,300),
    strengths:list(parsed.strengths, ['The idea can be shaped through user feedback.']),
    risks:list(parsed.risks, ['Validate the need before building.']),
    nextSteps:list(parsed.nextSteps, ['Talk with five potential users.', 'Test one small prototype.'])
  };
}

function localEvaluation(p) {
  const words = String(p.problem || '').trim().split(/\s+/).filter(Boolean).length;
  const audience = String(p.audience || '').trim().length;
  const solution = String(p.solution || '').trim().length;
  const model = String(p.model || '').trim().length;
  const score = Math.max(28, Math.min(91, 34 + Math.min(words, 20) + (audience ? 12 : 0) + Math.min(solution, 90) / 8 + Math.min(model, 70) / 10));
  return { score: Math.round(score), verdict: score > 72 ? 'A promising simulation candidate; validate demand with a small user test.' : 'A useful starting point; sharpen the target user and test the riskiest assumption.', strengths: [audience ? `Clear audience: ${p.audience}` : 'An early idea is ready to explore', solution ? 'A solution direction is defined' : 'Room to shape a distinctive solution'], risks: [audience ? 'Confirm that this audience feels the problem often.' : 'The target user is still unclear.', 'Market response in this simulator is illustrative, not predictive.'], nextSteps: ['Interview five target users and record what they do today.', 'Build the smallest prototype that tests one key assumption.'] };
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
      return send(res, 200, { status:data.status, id:data.id, projectId });
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
    const requested = url.pathname === '/' ? 'index.html' : path.normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    const file = path.resolve(root, requested);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error:'Not found' });
    res.writeHead(200, { 'content-type':mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 500, { error:e.message || 'Server error' }); }
});
server.listen(port, host, () => console.log(`VentureQuest AI running at http://${host}:${port}`));
