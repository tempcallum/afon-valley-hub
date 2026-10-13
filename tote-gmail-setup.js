
/* Chair-only Gmail connection wizard for the free Tote transactional email worker. */
const avfcGmailPriorTote=tote;
tote=async function(){
 await avfcGmailPriorTote();
 if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
 const area=$('#content');
 if(!area||!area.isConnected||area.querySelector('#toteGmailSetup'))return;
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.access_token)return;
 const req=(action)=>toteApi('tote-gmail-bridge',{
  method:'POST',headers:{Authorization:'Bearer '+session.access_token},
  body:JSON.stringify({action})
 });
 let status=null;
 try{status=await req('chair_status')}catch(e){
  if(!area.isConnected)return;
  console.warn('Gmail Tote connection status unavailable',e);
 }
 if(!area.isConnected)return;
 const panel=document.createElement('section');
 panel.id='toteGmailSetup';
 panel.className='panel tote-gmail-setup';
 const ready=Boolean(status?.ready);
 const date=timestamp=>timestamp?new Date(timestamp).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not yet';
 panel.innerHTML='<div class="tote-gmail-head"><div>'+
  '<span class="eyebrow dark">FREE TOTE TICKET & WINNER EMAILS</span><h3>Connect club Gmail</h3>'+
  '<p>Send ticket receipts and prize-winner messages from <strong>afonvalleyafc@gmail.com</strong>, without buying a domain.</p></div>'+
  '<span class="badge '+(ready?'ok':'warn')+'">'+(ready?'GMAIL READY':'SETUP REQUIRED')+'</span></div>'+
  '<div class="tote-gmail-metrics">'+
  '<div><span>Connection</span><strong>'+(status?.connected?'Online':'Not connected')+'</strong></div>'+
  '<div><span>Test email</span><strong>'+(status?.tested?'Passed':'Not sent')+'</strong></div>'+
  '<div><span>Recipients left today</span><strong>'+(status?.quota_remaining??'—')+'</strong></div>'+
  '</div>'+
  '<p class="tote-gmail-last">Last check: '+esc(date(status?.last_poll_at))+
  ' · Pending emails: '+Number(status?.waiting||0)+' · Failed: '+Number(status?.failed||0)+'</p>'+
  (status?.last_error?'<p class="tote-gmail-error">'+esc(status.last_error)+'</p>':'')+
  '<details class="tote-gmail-steps" '+(!ready?'open':'')+'>'+
  '<summary>Free Gmail setup (one time)</summary>'+
  '<ol>'+
  '<li>On a computer, sign in to <strong>afonvalleyafc@gmail.com</strong>.</li>'+
  '<li>Tap <strong>Copy Gmail setup code</strong> below, then open Google Apps Script.</li>'+
  '<li>Create a new project, replace everything in <strong>Code.gs</strong> with the copied code and save it.</li>'+
  '<li>At the top choose the <strong>connectAfonValleyTote</strong> function, press <strong>Run</strong>, and approve Google permissions.</li>'+
  '<li>Check the test message arrives in the club Gmail inbox, then return here and tap <strong>Check connection</strong>.</li>'+
  '</ol>'+
  '<div class="tote-gmail-actions"><button type="button" class="btn primary" id="toteGmailCopyCode">Copy Gmail setup code</button>'+
  '<a class="btn" target="_blank" rel="noopener noreferrer" href="https://script.google.com/home/projects/create">Open Google Apps Script</a>'+
  '<button type="button" class="btn" id="toteGmailRefresh">Check connection</button></div>'+
  '<p class="tote-gmail-private">Keep the copied script private — it contains the club\'s email-connection key. Do not publish or share that code.</p>'+
  '</details>'+
  '<p class="tote-gmail-safety">Google personal Gmail: normally up to 100 recipients per day. Two recipients are reserved for potential prize winners. The Hub pauses new orders when the remaining allowance is low or Gmail disconnects. The final launch checks still apply.</p>';
 const reg=area.querySelector('#toteRegistrationChair');
 if(reg)reg.insertAdjacentElement('afterend',panel);
 else area.insertAdjacentElement('afterbegin',panel);
 const copy=panel.querySelector('#toteGmailCopyCode');
 const refresher=panel.querySelector('#toteGmailRefresh');
 const msg=document.createElement('p');
 msg.className='muted tote-gmail-action-message';
 msg.setAttribute('aria-live','polite');
 panel.querySelector('.tote-gmail-actions')?.insertAdjacentElement('afterend',msg);
 copy.onclick=async()=>{
  copy.disabled=true;copy.textContent='Preparing code…';
  try{
   const [cfg,raw]=await Promise.all([
     req('chair_setup'),fetch('./tote-gmail-appsscript.txt?v=1',{cache:'no-store'})
   ]);
   if(!cfg?.token||!(/^[a-f0-9]{64}$/i.test(cfg.token)))throw new Error('Club setup key is unavailable.');
   if(!raw.ok)throw new Error('Could not load setup code.');
   const base=await raw.text(),needle='PASTE_PRIVATE_KEY_FROM_HUB';
   if(base.split(needle).length!==2)throw new Error('Gmail code template is unavailable.');
   const script=base.replace(needle,cfg.token);
   try{await navigator.clipboard.writeText(script)}
   catch{
     const element=document.createElement('textarea');element.value=script;
     element.style.position='fixed';element.style.left='-9999px';
     document.body.appendChild(element);element.select();
     if(!document.execCommand('copy'))throw new Error('Clipboard is blocked on this device.');
     element.remove();
   }
   copy.textContent='Code copied';msg.textContent='Code copied. Paste it into your PRIVATE Apps Script project, save and run connectAfonValleyTote.';
  }catch(e){
   copy.textContent='Copy Gmail setup code';
   msg.textContent=e.message||'Could not copy setup code.';
  }finally{copy.disabled=false}
 };
 refresher.onclick=()=>tote();
};
