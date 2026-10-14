/* Chair-only, optional phone-notification registration tracker.
   All member/device information is returned by a server-side Chair-verified RPC.
   Registration is not proof that phone-level notification permission remains enabled. */
const avfcNotificationsBeforeTracker=notifications;
notifications=async function(){
  await avfcNotificationsBeforeTracker();
  if(!profile?.approved||profile.role!=='chair'||isPlayerView()||tab!=='notifications')return;

  const content=$('#content'),base=content?.querySelector('.notifications-panel');
  if(!base||!base.isConnected)return;
  const host=document.createElement('section');
  host.id='avfcNotificationTracker';
  host.className='panel avfc-notification-tracker';
  host.innerHTML='<div class="avfc-tracker-loading" role="status">Checking phone notification registrations…</div>';
  base.insertAdjacentElement('beforebegin',host);

  let rows=[],hidden=false,filter='missing';
  const alive=()=>host.isConnected&&tab==='notifications'&&
    profile?.role==='chair'&&!isPlayerView();

  async function load(initial=false){
    if(!alive())return;
    if(initial){
      const [{data:visibility,error:visError},{data:result,error:statusError}]=await Promise.all([
        sb.rpc('chair_notification_tracker_visibility'),
        sb.rpc('chair_notification_registration_status')
      ]);
      if(!alive())return;
      if(visError||statusError){
        return renderError(visError||statusError);
      }
      hidden=visibility===true;
      rows=Array.isArray(result)?result:[];
    }else{
      const {data,error}=await sb.rpc('chair_notification_registration_status');
      if(!alive())return;
      if(error)return renderError(error);
      rows=Array.isArray(data)?data:[];
    }
    render();
  }

  function renderError(error){
    host.className='panel avfc-notification-tracker';
    host.innerHTML='<h3>Notification registration tracker</h3>'+
      '<p class="muted">Could not load the registration list. This does not affect anyone’s notifications.</p>'+
      '<button type="button" class="btn" id="avfcTrackerRetry">Try again</button>';
    host.querySelector('#avfcTrackerRetry').onclick=()=>load(true);
    if(error)console.warn('Notification registration list unavailable',error.message||error);
  }

  async function setHidden(next){
    const button=host.querySelector('#avfcTrackerHide')||host.querySelector('#avfcTrackerShow');
    if(button)button.disabled=true;
    const {data,error}=await sb.rpc('chair_notification_tracker_visibility',{p_hidden:next});
    if(!alive())return;
    if(error){if(button)button.disabled=false;return alert('Could not save the tracker preference. Please try again.');}
    hidden=data===true;render();
  }

  function render(){
    if(!alive())return;
    if(hidden){
      host.className='avfc-tracker-hidden';
      host.innerHTML='<button class="btn" type="button" id="avfcTrackerShow">Show notification registration tracker</button>';
      host.querySelector('#avfcTrackerShow').onclick=()=>setHidden(false);
      return;
    }
    host.className='panel avfc-notification-tracker';
    const total=rows.length,registered=rows.filter(r=>Number(r.registered_devices)>0).length;
    const outstanding=total-registered,percent=total?Math.round(100*registered/total):0;
    host.innerHTML=
      '<div class="avfc-tracker-head"><div><span class="eyebrow dark">CHAIR ONLY</span>'+
      '<h3>Phone notification registration</h3>'+
      '<p class="muted">Check who has registered a phone for Hub push alerts. A registered phone may still have notifications turned off in its settings.</p></div>'+
      '<button type="button" class="btn" id="avfcTrackerHide">Hide tracker</button></div>'+
      '<div class="avfc-tracker-numbers">'+
      '<div><small>Registered</small><strong>'+registered+' / '+total+'</strong></div>'+
      '<div><small>To register</small><strong>'+outstanding+'</strong></div>'+
      '<div><small>Coverage</small><strong>'+percent+'%</strong></div></div>'+
      '<div class="avfc-tracker-track" role="progressbar" aria-label="Registered accounts" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
      (outstanding===0&&total>0?'<div class="success-note"><strong>All approved accounts have a registered phone.</strong> You can hide this tracker whenever you are ready.</div>':'')+
      '<div class="avfc-tracker-controls"><label for="avfcTrackerFilter">Show members<select id="avfcTrackerFilter">'+
      '<option value="missing">Not registered ('+outstanding+')</option>'+
      '<option value="registered">Registered ('+registered+')</option>'+
      '<option value="all">Everyone ('+total+')</option></select></label>'+
      '<button type="button" class="btn" id="avfcTrackerRefresh">Refresh status</button>'+
      '<button type="button" class="btn" id="avfcTrackerCopy">Copy names to chase</button></div>'+
      '<div id="avfcTrackerMembers" class="avfc-tracker-members"></div>'+
      '<p class="avfc-tracker-footnote">Based on approved Hub accounts, not the number of players on the squad. A phone is marked registered when the Hub has saved a push subscription for that account. Use the Notifications tab on the member’s own phone to enable or check permission.</p>';

    host.querySelector('#avfcTrackerFilter').value=filter;
    host.querySelector('#avfcTrackerFilter').onchange=e=>{filter=e.currentTarget.value;renderMembers();};
    host.querySelector('#avfcTrackerHide').onclick=()=>setHidden(true);
    host.querySelector('#avfcTrackerRefresh').onclick=async e=>{
      const button=e.currentTarget;
      button.disabled=true;button.textContent='Checking…';
      await load(false);
      if(button.isConnected){button.disabled=false;button.textContent='Refresh status';}
    };
    host.querySelector('#avfcTrackerCopy').onclick=e=>{
      const missing=rows.filter(r=>Number(r.registered_devices)===0);
      if(!missing.length)return alert('Everybody with an approved account already has a registered device.');
      const list=missing.map(r=>String(r.member_name||'Unnamed member')+' ('+roleLabel(r.member_role)+')');
      copyText('Afon Valley FC — phone notifications still to set up:\n'+list.join('\n'),e.currentTarget);
    };
    renderMembers();
  }

  function roleLabel(role){
    return role==='player'?'Player':roleNames[role]||'Committee';
  }
  function renderMembers(){
    const target=host.querySelector('#avfcTrackerMembers');
    if(!target)return;
    const subset=rows.filter(r=>filter==='all'||(filter==='registered'
      ?Number(r.registered_devices)>0:Number(r.registered_devices)===0))
      .sort((a,b)=>{
        if(filter==='all'){
          const statusDiff=(Number(a.registered_devices)>0)-(Number(b.registered_devices)>0);
          if(statusDiff)return statusDiff;
        }
        return String(a.member_name||'').localeCompare(String(b.member_name||''),'en');
      });
    target.innerHTML=subset.length?subset.map(r=>
      '<div class="avfc-tracker-person"><div><strong>'+esc(r.member_name||'Unnamed member')+'</strong>'+
      '<small>'+esc(roleLabel(r.member_role))+'</small></div>'+
      '<span class="avfc-tracker-pill '+(Number(r.registered_devices)>0?'is-registered':'is-missing')+'">'+
      (Number(r.registered_devices)>0?'Registered':'Not registered')+'</span></div>').join(''):
      '<p class="muted avfc-tracker-empty">'+(filter==='missing'?'Nobody left to chase.':
        filter==='registered'?'Nobody has registered a phone yet.':'No approved accounts found.')+'</p>';
  }

  await load(true);
};
