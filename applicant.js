
/* Afon Valley applicant onboarding: standalone from the approved-player Hub. */
async function applicantPortal(){
  $('#sub').textContent='Your application and FAW registration';
  $('#nav').innerHTML='';
  $('#content').innerHTML='<div class="panel empty">Checking your application…</div>';
  const claim=await sb.rpc('applicant_claim_application');
  if(claim.error){
    $('#content').innerHTML='<div class="panel"><h3>Confirm your email</h3><p>'+esc(claim.error.message)+'</p><p class="muted">Your email address must be confirmed before we can connect your application securely. Use the resend email option on the login screen if needed.</p><button id="applicantRetry" class="btn">Try again</button><button id="applicantLogout" class="btn">Sign out</button></div>';
    $('#applicantRetry').onclick=applicantPortal;
    $('#applicantLogout').onclick=async()=>{await sb.auth.signOut();location.href=location.pathname};
    return;
  }
  const {data:a,error}=await sb.from('player_applications').select('id,full_name,email,status,submitted_at,faw_status,activated_at').eq('account_user_id',user.id).maybeSingle();
  if(error){$('#content').innerHTML='<div class="panel">Could not load your application: '+esc(error.message)+'</div>';return}
  if(!a){
    $('#content').innerHTML='<div class="panel"><span class="eyebrow dark">JOIN AFON VALLEY</span><h3>Welcome!</h3><p>We have not found an application using your confirmed login email. You can apply below, without being added to the playing squad.</p><a class="btn primary" href="./?join=club">Complete joining application</a><button id="applicantRetry" class="btn">Check again</button><button id="applicantLogout" class="btn">Sign out</button><p class="muted">Already an existing player? Ask the Chair to link your account instead.</p></div>';
    $('#applicantRetry').onclick=applicantPortal;
    $('#applicantLogout').onclick=async()=>{await sb.auth.signOut();location.href=location.pathname};
    return;
  }
  const names={new:'Application received',contacted:'Club reviewing your application',waitlist:'Waiting list',accepted:'Accepted by the club',declined:'Application declined'};
  const faw={not_started:'Not started',transfer_pending:'Transfer pending',submitted:'Submitted to FAW',registered:'FAW registration confirmed',blocked:'Registration on hold'};
  const accepted=a.status==='accepted',locked=a.faw_status==='registered';
  const details=accepted?(await sb.from('applicant_registration_details').select('details,submitted_at,updated_at').eq('application_id',a.id).maybeSingle()).data:null;
  $('#content').innerHTML='<div class="panel"><span class="eyebrow dark">MY JOINING APPLICATION</span><h3>'+esc(a.full_name)+'</h3><p>Applied '+day(a.submitted_at)+'.</p><div class="dashboard-stats"><div class="metric"><span>CLUB DECISION</span><strong style="font-size:17px">'+esc(names[a.status]||a.status)+'</strong></div><div class="metric"><span>FAW REGISTRATION</span><strong style="font-size:17px">'+esc(faw[a.faw_status]||a.faw_status)+'</strong></div></div><p class="muted">A club acceptance is not FAW clearance to play. You will only get full squad access once the club confirms official registration and activates your player account.</p><div class="actions"><button id="applicantRetry" class="btn">Refresh status</button><button id="applicantLogout" class="btn">Sign out</button></div></div>';
  $('#applicantRetry').onclick=applicantPortal;
  $('#applicantLogout').onclick=async()=>{await sb.auth.signOut();location.href=location.pathname};
  if(!accepted)return;
  if(locked){
    $('#content').insertAdjacentHTML('beforeend','<div class="panel"><h3>Registration confirmed</h3><p>Your FAW registration has been recorded by the club. Your full player account is awaiting final activation by the Chair.</p></div>');
    return;
  }
  const existing=details?.details||{},value=(field)=>esc(existing[field]??'');
  const field=(key,title,type='text',required=true)=>'<label>'+esc(title)+'<input name="'+key+'" type="'+type+'" value="'+value(key)+'" maxlength="240" '+(required?'required':'')+'></label>';
  const select=(key,title,opts)=>'<label>'+esc(title)+'<select name="'+key+'" required>'+opts.map(([v,t])=>'<option value="'+esc(v)+'" '+(existing[key]===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
  const sex=[['','Choose…'],['Male','Male'],['Female','Female'],['Other','Other'],['Prefer not to say','Prefer not to say']];
  const history=[['','Choose…'],['first','Never registered with a Welsh club'],['transfer','Previously registered with another Welsh club'],['reregister','Previously registered with Afon Valley'],['unsure','Not sure']];
  const form='<div class="panel"><span class="eyebrow dark">REQUIRED AFTER ACCEPTANCE</span><h3>FAW registration pack</h3><p>'+(details?'Submitted '+day(details.submitted_at)+'. You can update this information until registration is confirmed.':'Complete this form so the club can prepare your COMET registration or transfer.')+'</p><p class="muted">This information is restricted to you and the Chair. It is not sent to FAW automatically.</p><form id="applicantRegistration" class="form">'+
    '<h3>Personal details</h3><div class="form-grid">'+field('given_names','Given names')+field('last_name','Last name')+select('gender','Gender',sex)+field('date_of_birth','Date of birth','date')+field('nationality','Nationality')+field('ethnicity','Ethnicity (FAW registration field)')+field('country_of_birth','Country of birth')+field('place_of_birth','Place of birth')+'</div>'+
    '<h3>Address & contact</h3><div class="form-grid">'+field('phone','Mobile number','tel')+field('postcode','Postcode')+field('address','Address')+field('town','Town / place')+field('country','Country')+'</div>'+
    '<h3>Football registration history</h3><div class="form-grid">'+select('football_history','Previous registration',history)+field('previous_club','Previous club (if applicable)','text',false)+field('comet_id','COMET player ID (if known)','text',false)+'</div>'+
    '<h3>Emergency contact</h3><div class="form-grid">'+field('emergency_name','Contact name')+field('emergency_phone','Contact telephone','tel')+field('emergency_relationship','Relationship to you')+'</div>'+
    '<h3>Declarations</h3><label class="tote-terms"><input name="consent_privacy" type="checkbox" required '+(existing.consent_privacy?'checked':'')+'><span>I understand these details will be used for club onboarding and to prepare my official FAW registration and will be accessible only to authorised club officials.</span></label>'+
    '<label class="tote-terms"><input name="confirm_correct" type="checkbox" required '+(existing.confirm_correct?'checked':'')+'><span>I confirm these registration details are correct.</span></label>'+
    '<label class="tote-terms"><input name="photo_consent" type="checkbox" '+(existing.photo_consent?'checked':'')+'><span>I consent to the club using my photograph in club publicity (optional).</span></label>'+
    '<button class="btn primary" type="submit">'+(details?'Update registration pack':'Submit registration pack')+'</button><p id="applicantFormMsg" class="msg"></p></form></div>';
  $('#content').insertAdjacentHTML('beforeend',form);
  const formElement=$('#applicantRegistration');
  if(existing.gender)formElement.elements.gender.value=existing.gender;
  formElement.onsubmit=async event=>{
    event.preventDefault();
    const f=new FormData(formElement),data={},btn=formElement.querySelector('button[type=submit]'),msg=$('#applicantFormMsg');
    for(const [k,v] of f.entries())data[k]=String(v);
    for(const k of ['consent_privacy','confirm_correct','photo_consent'])data[k]=f.has(k);
    btn.disabled=true;btn.textContent='Saving…';msg.textContent='';
    const {error}=await sb.rpc('applicant_submit_registration',{data});
    if(error){msg.textContent=error.message;btn.disabled=false;btn.textContent='Try again';return}
    await applicantPortal();
  };
}
const originalRenderAdminExtras=renderAdminExtras;
renderAdminExtras=async function(){
  await originalRenderAdminExtras();
  if(profile?.role!=='chair'||isPlayerView())return;
  const [ar,dr]=await Promise.all([
    sb.from('player_applications').select('id,full_name,email,status,account_user_id,faw_status,activated_at').order('submitted_at',{ascending:false}).limit(100),
    sb.from('applicant_registration_details').select('application_id,details,submitted_at,updated_at')
  ]);
  if(ar.error||dr.error){
    $('#content').insertAdjacentHTML('beforeend','<div class="panel"><h3>Registration tracker</h3><p>Could not load applicant registration records.</p></div>');
    return;
  }
  const applications=ar.data||[],info=new Map((dr.data||[]).map(x=>[x.application_id,x]));
  const rows=applications.map(a=>{
    const done=info.has(a.id),ready=a.status==='accepted'&&a.faw_status==='registered'&&done&&a.account_user_id&&!a.activated_at;
    return '<div class="row" style="flex-wrap:wrap;gap:10px"><span><strong>'+esc(a.full_name)+'</strong><br><small class="muted">'+esc(a.email)+'</small><br><small class="muted">'+(a.account_user_id?'Applicant login linked':'No applicant login yet')+' · '+(done?'Registration pack received':'Registration pack outstanding')+'</small></span><div class="actions">'+
      (done?'<button class="btn mini-action" data-read-registration="'+a.id+'">View details</button>':'')+
      '<label style="font-size:12px">FAW status<select data-faw-state="'+a.id+'" '+(a.activated_at?'disabled':'')+'><option value="not_started">Not started</option><option value="transfer_pending">Transfer pending</option><option value="submitted">Submitted to FAW</option><option value="registered">Registered / eligible</option><option value="blocked">On hold</option></select></label>'+
      (ready?'<button class="btn primary" data-activate-applicant="'+a.id+'">Activate player</button>':'')+
      (a.activated_at?'<span class="badge ok">Active player</span>':'')+'</div></div>';
  }).join('');
  $('#content').insertAdjacentHTML('beforeend','<div class="panel"><span class="eyebrow dark">PLAYER ONBOARDING</span><h3>FAW registration tracker</h3><p class="muted">Accept applications using the Applications & waiting list section above. Applicants then complete their forms. Mark FAW registered only after confirmation in COMET; then activate the player.</p><div class="list">'+(rows||'<p class="muted">No applicants yet.</p>')+'</div><div id="applicantDetailsViewer"></div></div>');
  for(const a of applications){
    const selectNode=$('[data-faw-state="'+a.id+'"]');if(selectNode)selectNode.value=a.faw_status;
  }
  $('#content').querySelectorAll('[data-read-registration]').forEach(btn=>btn.onclick=()=>{
    const app=applications.find(a=>a.id===btn.dataset.readRegistration),data=info.get(app.id)?.details||{};
    const headings={given_names:'Given names',last_name:'Surname',gender:'Gender',date_of_birth:'Date of birth',nationality:'Nationality',ethnicity:'Ethnicity',country_of_birth:'Country of birth',place_of_birth:'Place of birth',phone:'Phone',postcode:'Postcode',address:'Address',town:'Town',country:'Country',football_history:'Football history',previous_club:'Previous club',comet_id:'COMET ID',emergency_name:'Emergency contact',emergency_phone:'Emergency telephone',emergency_relationship:'Relationship',photo_consent:'Photo consent'};
    const entries=Object.entries(headings).map(([key,name])=>'<div style="border-bottom:1px solid #e1e7e3;padding:8px 0"><strong>'+esc(name)+'</strong><div>'+esc(data[key]===true?'Yes':data[key]===false?'No':data[key]||'—')+'</div></div>').join('');
    $('#applicantDetailsViewer').innerHTML='<div class="panel"><div class="head"><h3>Private registration: '+esc(app.full_name)+'</h3><button class="btn" id="closeApplicantDetails">Close</button></div><p class="muted">Chair-only. Store and share these details only for club and FAW registration purposes.</p>'+entries+'</div>';
    $('#closeApplicantDetails').onclick=()=>$('#applicantDetailsViewer').innerHTML='';
    $('#applicantDetailsViewer').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#content').querySelectorAll('[data-faw-state]').forEach(selectNode=>selectNode.onchange=async()=>{
    const a=applications.find(a=>a.id===selectNode.dataset.fawState),next=selectNode.value;
    if(next==='registered'&&!info.has(a.id)){alert('Ask the applicant to submit the FAW registration pack first.');selectNode.value=a.faw_status;return}
    if(next==='registered'&&!confirm('Have you verified this player is registered and eligible in FAW COMET? This does NOT activate them yet.')){selectNode.value=a.faw_status;return}
    const {error}=await sb.from('player_applications').update({faw_status:next,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq('id',a.id);
    if(error){selectNode.value=a.faw_status;return alert(error.message)}
    admin();
  });
  $('#content').querySelectorAll('[data-activate-applicant]').forEach(btn=>btn.onclick=async()=>{
    const a=applications.find(a=>a.id===btn.dataset.activateApplicant);
    if(!confirm('Activate '+a.full_name+' as an Afon Valley player? Confirm that FAW COMET shows their registration is complete and they are eligible.'))return;
    btn.disabled=true;
    const {error}=await sb.rpc('chair_activate_applicant',{application:a.id});
    if(error){btn.disabled=false;alert(error.message);return}
    alert('Player activated and their applicant account upgraded to a full Hub player account.');admin();
  });
};
