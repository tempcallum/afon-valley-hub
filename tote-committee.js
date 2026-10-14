/* Afon Valley FC - committee-only Tote access.
   All eligibility and payment controls are enforced again by Supabase functions.
   Public payments stay disabled. No buyer can activate this feature here. */
async function showCommitteeTote(){
  $('#login').classList.add('hidden');
  $('#shell').classList.add('hidden');
  $('#joinPublic').classList.add('hidden');
  $('#totePublic').classList.remove('hidden');
  $('#toteBack').onclick=()=>location.href=location.pathname;
  const panel=$('#totePublicContent');
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token){
    panel.innerHTML='<div class="tote-public-card"><span class="eyebrow dark">PRIVATE COMMITTEE PREVIEW</span>'+
      '<h2>Committee Tote access</h2><p>This page is for approved Afon Valley FC committee members only. '+
      'Please use the same email and password as the Club Hub.</p>'+
      '<p class="tote-pending"><strong>Ticket purchases are not open yet.</strong> '+
      'The Chair will confirm when the restricted soft launch begins. The public Tote remains closed.</p>'+
      '<form id="committeeToteLogin" class="form">'+
      '<label>Hub email<input type="email" name="email" autocomplete="email" required maxlength="200"></label>'+
      '<label>Hub password<input type="password" name="password" autocomplete="current-password" required></label>'+
      '<button type="submit" class="btn primary tote-enter-btn">Sign in to committee preview</button>'+
      '<p id="committeeToteLoginMessage" class="muted" role="status" aria-live="polite"></p></form>'+
      '<p class="muted">If you do not yet have an approved Hub account, contact the Chair. '+
      'Signing up does not automatically grant committee access.</p></div>';
    panel.querySelector('#committeeToteLogin').onsubmit=async event=>{
      event.preventDefault();
      const f=event.currentTarget,button=f.querySelector('button[type="submit"]');
      const message=f.querySelector('#committeeToteLoginMessage');
      button.disabled=true;button.textContent='Checking login…';message.textContent='';
      try{
        const form=new FormData(f);
        const {error}=await sb.auth.signInWithPassword({
          email:String(form.get('email')||'').trim(),
          password:String(form.get('password')||'')
        });
        if(error)throw new Error('Unable to sign in. Check your Hub login details.');
        await showCommitteeTote();
      }catch(err){
        message.textContent=err?.message||'Could not sign in.';
        button.disabled=false;button.textContent='Sign in to committee preview';
      }
    };
    return;
  }
  panel.innerHTML='<div class="tote-public-card">Checking committee access…</div>';
  let access;
  try{access=await toteApi('tote-public?ref=club&mode=committee')}
  catch(err){
    panel.innerHTML='<div class="tote-public-card"><h2>Committee access not available</h2>'+
      '<p>'+esc(err?.message||'Could not verify this committee account.')+'</p>'+
      '<p class="muted">Only approved committee Hub accounts can use the restricted Tote. '+
      'Contact the Chair if you believe your access should be included.</p>'+
      '<button type="button" id="committeeToteSignout" class="btn">Sign out / use another account</button></div>';
    panel.querySelector('#committeeToteSignout').onclick=async()=>{
      await sb.auth.signOut();await showCommitteeTote();
    };
    return;
  }
  if(!access?.soft_launch_eligible){
    panel.innerHTML='<div class="tote-public-card"><h2>Committee access not verified</h2>'+
      '<p>Ask the Chair to check your committee Hub permissions.</p>'+
      '<button type="button" id="committeeToteSignout" class="btn">Sign out</button></div>';
    panel.querySelector('#committeeToteSignout').onclick=async()=>{await sb.auth.signOut();await showCommitteeTote()};
    return;
  }
  await showPublicTote();
  if(!panel.isConnected)return;
  const banner=document.createElement('div');
  banner.className='tote-committee-banner';
  banner.innerHTML='<div><strong>COMMITTEE-ONLY '+(access.soft_launch_active?'SOFT LAUNCH':'PREVIEW')+'</strong>'+
    '<small>'+(access.soft_launch_active
       ?'Restricted purchases are open to eligible signed-in committee members. Public sales are still closed.'
       :'Restricted access is ready. Purchases remain disabled until the Chair explicitly authorises the launch.')+
    '</small></div><button type="button" id="committeeToteSignout" class="btn">Sign out</button>';
  panel.insertAdjacentElement('afterbegin',banner);
  banner.querySelector('#committeeToteSignout').onclick=async()=>{
    await sb.auth.signOut();await showCommitteeTote();
  };
}

const avfcCommitteePreviousChairTote=tote;
tote=async function(){
  await avfcCommitteePreviousChairTote();
  if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
  const area=$('#content');
  if(!area||!area.isConnected||area.querySelector('#committeeToteChairStatus'))return;
  let status;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)return;
    status=await toteApi('tote-public?ref=club&mode=committee',{
      headers:{Authorization:'Bearer '+session.access_token}
    });
  }catch(err){console.warn('Committee soft-launch status unavailable',err);return}
  if(!area.isConnected)return;
  const active=Boolean(status.soft_launch_active);
  const panel=document.createElement('section');
  panel.id='committeeToteChairStatus';
  panel.className='tote-committee-admin';
  panel.innerHTML='<div><span class="eyebrow dark">RESTRICTED SALES</span>'+
    '<strong>Committee soft launch</strong>'+
    '<small>'+(active
      ?'Committee-only ticket orders enabled. Public checkout remains off.'
      :'Prepared but not activated. Committee members can sign in and preview; nobody can purchase yet.')+
    '</small></div><div class="tote-committee-admin-actions">'+
    '<span class="tote-committee-status '+(active?'is-live':'')+'">'+(active?'ACTIVE':'OFF')+'</span>'+
    '<button type="button" class="btn" id="copyCommitteeToteLink">Copy committee link</button></div>';
  const emailStatus=area.querySelector('#toteGmailStatus');
  const registration=area.querySelector('#toteRegistrationChair');
  const hero=area.querySelector('.tote-internal-hero');
  const anchor=emailStatus||registration||hero;
  if(anchor)anchor.insertAdjacentElement('afterend',panel);
  else area.insertAdjacentElement('afterbegin',panel);
  panel.querySelector('#copyCommitteeToteLink').onclick=e=>copyText(toteLink('committee'),e.currentTarget);
};