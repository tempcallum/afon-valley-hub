/* Compact Chair-only operational email health. No test form on production Tote page. */
const avfcGmailPriorTote=tote;
tote=async function(){
  await avfcGmailPriorTote();
  if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
  const area=$('#content');
  if(!area||!area.isConnected||area.querySelector('#toteGmailStatus'))return;
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token||!area.isConnected)return;
  const request=action=>toteApi('tote-gmail-bridge',{
    method:'POST',headers:{Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({action})
  });
  let status=null;
  try{status=await request('chair_status')}
  catch(e){console.warn('Tote email status could not be checked',e);}
  if(!area.isConnected)return;
  const ready=Boolean(status?.ready);
  const waiting=Number(status?.waiting||0);
  const failed=Number(status?.failed||0);
  const remaining=status?.quota_remaining;
  const capacityLow=typeof remaining==='number'&&remaining<3;
  const needsAttention=!ready||failed>0||capacityLow;
  const label=ready?(failed>0?'EMAIL NEEDS ATTENTION':capacityLow?'EMAIL LIMIT LOW':'EMAIL ACTIVE'):'EMAIL OFFLINE';
  const message=!ready?'Automatic email delivery is not connected. Please review the connection before opening sales.':
    failed>0?'There are '+failed+' failed email(s) requiring attention.':
    capacityLow?'Remaining Gmail allowance is low; new customer sales will pause to protect winner emails.':
    'Gmail is sending ticket and winner notifications.';
  const panel=document.createElement('section');
  panel.id='toteGmailStatus';
  panel.className='tote-email-strip'+(needsAttention?' needs-attention':'');
  panel.innerHTML=
    '<div class="tote-email-strip-main"><span class="tote-email-dot" aria-hidden="true"></span>'+
    '<div class="tote-email-copy"><strong>'+label+'</strong><small>'+message+'</small></div>'+
    '<span class="tote-email-count" title="Approximate daily Gmail recipients left">'+
    (remaining==null?'—':Number(remaining))+' <span>left</span></span></div>'+
    (waiting||failed?'<p class="tote-email-extra">'+waiting+' awaiting delivery'+(failed?' · '+failed+' failed':'')+'</p>':'')+
    (status?.last_error?'<p class="tote-email-error">'+esc(status.last_error)+'</p>':'')+
    '<details class="tote-email-tools"><summary>Email connection details</summary>'+
    '<p>Club sender: <strong>afonvalleyafc@gmail.com</strong>. The Gmail worker checks automatically. Two daily recipients are reserved for potential prize winners.</p>'+
    '<div class="tote-email-tool-actions">'+
    '<button type="button" class="btn" id="toteGmailRefresh">Refresh email status</button>'+
    '<button type="button" class="btn" id="toteGmailCopyCode">Copy private reconnect code</button></div>'+
    '<p id="toteGmailToolMessage" class="muted" role="status" aria-live="polite"></p>'+
    '<p>If reconnecting is ever required, paste the copied private code into the club’s own Google Apps Script project. Never share that code publicly. <a href="https://script.google.com/home" target="_blank" rel="noopener noreferrer">Open Google Apps Script</a>.</p></details>';
  const registration=area.querySelector('#toteRegistrationChair');
  const hero=area.querySelector('.tote-internal-hero');
  if(registration)registration.insertAdjacentElement('afterend',panel);
  else if(hero)hero.insertAdjacentElement('afterend',panel);
  else area.insertAdjacentElement('afterbegin',panel);
  panel.querySelector('#toteGmailRefresh').onclick=()=>tote();
  panel.querySelector('#toteGmailCopyCode').onclick=async e=>{
    const button=e.currentTarget;
    const msg=panel.querySelector('#toteGmailToolMessage');
    button.disabled=true;
    button.textContent='Preparing…';
    try{
      const [cfg,raw]=await Promise.all([
        request('chair_setup'),
        fetch('./tote-gmail-appsscript.txt?v=1',{cache:'no-store'})
      ]);
      if(!cfg?.token||!(/^[a-f0-9]{64}$/i.test(cfg.token)))throw new Error('Private connection key unavailable.');
      if(!raw.ok)throw new Error('Reconnect template unavailable.');
      const template=await raw.text();
      const anchor='PASTE_PRIVATE_KEY_FROM_HUB';
      if(template.split(anchor).length!==2)throw new Error('Reconnect template is invalid.');
      const script=template.replace(anchor,cfg.token);
      try{await navigator.clipboard.writeText(script)}
      catch{
        const el=document.createElement('textarea');
        el.value=script;el.style.position='fixed';el.style.left='-9999px';
        document.body.appendChild(el);el.select();
        if(!document.execCommand('copy'))throw new Error('Cannot copy on this device.');
        el.remove();
      }
      msg.textContent='Private code copied. Paste into the club’s existing Google Apps Script project if reconnecting.';
      button.textContent='Copied';
    }catch(err){
      msg.textContent=err?.message||'Could not copy the reconnect code.';
      button.textContent='Copy private reconnect code';
    }finally{button.disabled=false;}
  };
};