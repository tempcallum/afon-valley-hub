/* Afon Valley Tote - shared Chair/Treasurer live refresh.
   Read-only revision checks never alter payments, ticket numbers or lottery settings.
   Changes to an open financial form are protected from automatic replacement. */
(function(){
  const previousTote=tote;
  const SYNC_MS=15000;
  const state={
    lastRevision:null,checking:false,rendering:false,queuedRevision:null,
    lastGoodAt:null,timer:null,mode:'starting',nextCheckAt:0
  };

  function active(){
    return Boolean(profile?.approved&&['chair','treasurer'].includes(profile.role)
      &&!isPlayerView()&&tab==='tote'
      &&document.visibilityState!=='hidden'
      &&$('#content')?.querySelector('.tote-internal-hero'));
  }

  function changedControl(el){
    if(el.disabled||el.type==='hidden'||el.type==='file')return false;
    if(el.type==='checkbox'||el.type==='radio')return el.checked!==el.defaultChecked;
    if(el.tagName==='SELECT'){
      const defaults=[...el.options].filter(o=>o.defaultSelected);
      const defaultValues=defaults.length?defaults.map(o=>o.value):el.options.length?[el.options[0].value]:[];
      if(el.multiple){
        const chosen=[...el.selectedOptions].map(o=>o.value);
        return JSON.stringify(chosen)!==JSON.stringify(defaultValues);
      }
      return el.value!==(defaultValues[0]||'');
    }
    return el.value!==el.defaultValue;
  }

  function isEditing(){
    const root=$('#content');
    if(!root)return false;
    const controls=[...root.querySelectorAll('input,textarea,select')];
    return controls.some(el=>
      el===document.activeElement || changedControl(el));
  }

  function indicator(){
    return document.getElementById('toteLiveIndicator');
  }
  function timeLabel(date){
    return date?date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
  }
  function showState(){
    const root=indicator();
    if(!root)return;
    const detail=root.querySelector('#toteLiveDetail');
    const title=root.querySelector('#toteLiveTitle');
    if(!detail||!title)return;
    root.dataset.status=state.mode;
    if(state.mode==='waiting'){
      title.textContent='New Tote activity waiting';
      detail.textContent='Finish or save your current edits. Your screen will then catch up automatically.';
    }else if(state.mode==='updated'){
      title.textContent='Tote updated automatically';
      detail.textContent='Latest bank checks, tickets, payouts and draw figures loaded at '+timeLabel(state.lastGoodAt)+'.';
    }else if(state.mode==='healthy'){
      title.textContent='Live sync active';
      detail.textContent='Checks for updates every 15 seconds while the Tote is open. Checked '+timeLabel(state.lastGoodAt)+'.';
    }else if(state.mode==='error'){
      title.textContent='Live sync unavailable';
      detail.textContent='Saved records are safe. You can still refresh manually or revisit this screen.';
    }else{
      title.textContent='Connecting live updates…';
      detail.textContent='Checking shared Tote activity.';
    }
  }

  function ensureIndicator(){
    if(!active())return;
    const area=$('#content');
    if(!area||indicator())return;
    const el=document.createElement('section');
    el.className='tote-live-indicator';
    el.id='toteLiveIndicator';
    el.setAttribute('aria-label','Tote live update status');
    el.innerHTML='<span class="tote-live-light" aria-hidden="true"></span>'+
      '<div class="tote-live-copy"><strong id="toteLiveTitle">Connecting live updates…</strong>'+
      '<small id="toteLiveDetail" role="status" aria-live="polite">Checking shared Tote activity.</small></div>'+
      '<button type="button" class="btn" id="toteLiveRefresh">Refresh now</button>';
    const hero=area.querySelector('.tote-internal-hero');
    hero?.insertAdjacentElement('afterend',el);
    el.querySelector('#toteLiveRefresh').onclick=async e=>{
      if(!active()||state.rendering)return;
      if(isEditing()&&!window.confirm('You have unsaved Tote details. Refreshing now will discard those entries. Continue?'))return;
      const button=e.currentTarget;
      button.disabled=true;button.textContent='Refreshing…';
      try{
        await tote();
        state.mode='updated';state.lastGoodAt=new Date();showState();
      }finally{
        if(button.isConnected){button.disabled=false;button.textContent='Refresh now';}
      }
    };
    showState();
  }

  async function getRevision(){
    const {data,error}=await sb.rpc('tote_finance_live_revision');
    if(error||typeof data!=='string'||!data)throw new Error(error?.message||'Unable to check shared activity');
    return data;
  }

  async function checkChanges(){
    if(!active()||state.rendering||state.checking)return;
    state.checking=true;
    try{
      const latest=await getRevision();
      if(!active())return;
      state.lastGoodAt=new Date();
      if(state.lastRevision===null){
        state.lastRevision=latest;
        state.mode='healthy';showState();return;
      }
      if(latest===state.lastRevision&&state.queuedRevision===null){
        state.mode='healthy';showState();return;
      }
      if(latest===state.lastRevision){
        state.queuedRevision=null;
        state.mode='healthy';showState();return;
      }
      state.queuedRevision=latest;
      if(isEditing()){
        state.mode='waiting';showState();return;
      }
      // The render wrapper will fetch a fresh revision after reloading.
      await tote();
      if(active()){
        state.mode='updated';state.lastGoodAt=new Date();showState();
      }
    }catch(err){
      console.warn('Afon Valley Tote live refresh check unavailable',err);
      state.mode='error';showState();
    }finally{state.checking=false;}
  }

  function schedule(){
    if(state.timer)return;
    state.timer=setInterval(()=>{if(active())checkChanges();},SYNC_MS);
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden&&active())checkChanges();
    });
    window.addEventListener('focus',()=>{
      if(active()&&!state.rendering)checkChanges();
    });
  }

  tote=async function(){
    if(state.rendering)return;
    state.rendering=true;
    try{
      await previousTote();
      if(!active())return;
      ensureIndicator();
      try{
        const revision=await getRevision();
        if(!active())return;
        state.lastRevision=revision;
        state.queuedRevision=null;
        state.lastGoodAt=new Date();
        state.mode='healthy';
      }catch(err){
        console.warn('Tote initial live revision unavailable',err);
        state.mode='error';
      }
      showState();
      schedule();
    }finally{state.rendering=false;}
  };
})();