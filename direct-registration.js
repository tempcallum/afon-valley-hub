
/* No-login form for adult-football players aged 16+, with a Chair-only registration inbox. */
const DIRECT_PLAYER_REG_LINK="https://tempcallum.github.io/afon-valley-hub/?register=player";
function showDirectPlayerRegistration(){
 for(const id of ['login','shell','totePublic','joinPublic'])document.getElementById(id)?.classList.add('hidden');
 const groups=[
  {label:"Personal information",fields:[
   ['given_names','Given names','text',true],['last_name','Surname','text',true],
   ['gender','Gender','gender',true],['date_of_birth','Date of birth','date',true],
   ['nationality','Nationality','text',true],['ethnicity','Ethnicity (optional)','text',false],
   ['country_of_birth','Country of birth','text',true],['place_of_birth','Place of birth','text',true]]},
  {label:"Contact & address",fields:[
   ['email','Email address','email',true],['phone','Mobile number','tel',true],
   ['address','Address','text',true],['town','Town / city','text',true],
   ['postcode','Postcode','text',true],['country','Country','text',true]]},
  {label:"Football registration history",fields:[
   ['football_history','Previous Welsh football registration','history',true],
   ['previous_club','Previous club (if applicable)','text',false],
   ['comet_id','COMET player ID (if known)','text',false]]},
  {label:"Emergency contact",fields:[
   ['emergency_name','Full name','text',true],
   ['emergency_phone','Contact number','tel',true],
   ['emergency_relationship','Relationship','text',true]]}
 ];
 function field([key,title,type,required]){
  let input;
  if(type==='gender')input='<select name="'+key+'" required><option value="">Select…</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select>';
  else if(type==='history')input='<select name="'+key+'" required id="directHistory"><option value="">Select…</option><option value="first">Never registered with a Welsh club</option><option value="transfer">Previously registered with another Welsh club</option><option value="reregister">Previously registered with Afon Valley</option><option value="unsure">Not sure</option></select>';
  else input='<input name="'+key+'" type="'+type+'" '+(required?'required ':'')+'maxlength="220" '+(key==='previous_club'?'id="directPreviousClub"':'')+'>';
  return '<label>'+title+input+'</label>';
 }
 const fields=groups.map((g,i)=>'<section class="direct-reg-section"><h2><span>'+
   String(i+1).padStart(2,'0')+'</span> '+g.label+'</h2><div class="direct-reg-fields">'+g.fields.map(field).join('')+'</div></section>').join('');
 document.body.insertAdjacentHTML('beforeend',
   '<section id="directRegPage" class="direct-reg-page"><div class="direct-reg-wrap">'+
   '<header class="direct-reg-top"><img src="./avfc-logo.jpg" alt="Afon Valley FC crest">'+
   '<div><strong>AFON VALLEY FC</strong><span>PLAYER REGISTRATION</span></div></header>'+
   '<div class="direct-reg-paper"><div class="direct-reg-hero"><span>2026/27 SEASON</span><h1>Player registration</h1>'+
   '<p>Complete this form so the club can prepare your FAW COMET registration. You do not need a Hub login yet.</p>'+
   '<div class="direct-reg-notice">Sending this form does not confirm your FAW eligibility or automatically enrol you in the Hub.</div></div>'+
   '<form id="directRegForm" class="direct-reg-form">'+fields+
   '<section id="directGuardianSection" class="direct-reg-section direct-reg-under18 hidden"><h2><span>!</span> Parent or guardian (under 18)</h2>'+
   '<p class="direct-reg-privacy">Players aged 16 or 17 must provide parent or guardian contact details. Afon Valley will verify safeguarding and any required permissions separately before registration or play. These details are only for club registration and safeguarding.</p>'+
   '<div class="direct-reg-fields"><label>Parent / guardian name<input type="text" name="guardian_name" maxlength="120"></label>'+
   '<label>Relationship to player<input type="text" name="guardian_relationship" maxlength="90"></label>'+
   '<label>Parent / guardian telephone<input type="tel" name="guardian_phone" maxlength="45"></label>'+
   '<label>Parent / guardian email<input type="email" name="guardian_email" maxlength="200"></label></div>'+
   '<label class="direct-reg-check"><input type="checkbox" name="guardian_aware"><span>I confirm my parent or guardian is aware I am submitting this registration form and can be contacted by the club.</span></label>'+
   '<p class="direct-reg-privacy">For under-18s, the club will seek separate parental permission for photographs and relevant communications. This online form is not the official COMET registration or a parental signature.</p></section>'+
   '<section class="direct-reg-section"><h2><span>05</span> Declarations</h2>'+
   '<p class="direct-reg-privacy">Afon Valley FC uses this information to prepare FAW COMET registration and manage club membership. This form is available to the club Chair, and it is not automatically submitted to COMET. Once you become a member, other authorised officials may access relevant club contact and emergency information. For corrections or questions, email <a href="mailto:afonvalleyafc@gmail.com">afonvalleyafc@gmail.com</a>.</p>'+
   '<label class="direct-reg-check"><input type="checkbox" name="consent_privacy" required><span>I understand how my details will be used.</span></label>'+
   '<label class="direct-reg-check"><input type="checkbox" name="confirm_correct" required><span>I confirm my details are accurate.</span></label>'+
   '<label class="direct-reg-check"><input type="checkbox" name="photo_consent"><span>I consent to club publicity photographs (optional).</span></label></section>'+
   '<div class="direct-reg-honeypot"><label>Website<input tabindex="-1" autocomplete="off" name="website"></label></div>'+
   '<button class="direct-reg-send" type="submit" id="directRegSubmit">Send registration to the club</button>'+
   '<p id="directRegMessage" role="status" aria-live="polite"></p></form>'+
   '<div id="directRegSuccess" class="hidden direct-reg-success"><h2>Registration details received</h2>'+
   '<p>Thank you. Afon Valley FC now has your registration details. The Chair will arrange your COMET registration separately, and will explain how to set up your Hub login when you are ready.</p>'+
   '<p>You do not need to create a Hub account yet.</p></div></div>'+
   '<p class="direct-reg-foot">Afon Valley FC · Rogerstone, Newport · Est. 2024</p></div></section>');
 const form=document.getElementById('directRegForm'),prev=document.getElementById('directPreviousClub');
 const dateField=form.elements.date_of_birth,guardian=document.getElementById('directGuardianSection');
 function yearsOld(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const dob=new Date(value+'T12:00:00Z');
  if(Number.isNaN(dob.valueOf())||dob.toISOString().slice(0,10)!==value)return null;
  const today=new Date();let years=today.getUTCFullYear()-dob.getUTCFullYear();
  if(today.getUTCMonth()<dob.getUTCMonth()||(today.getUTCMonth()===dob.getUTCMonth()&&today.getUTCDate()<dob.getUTCDate()))years--;
  return years>=0?years:null;
 }
 function guardianToggle(){
  const age=yearsOld(dateField.value),under18=age!==null&&age>=16&&age<18;
  guardian.classList.toggle('hidden',!under18);
  for(const name of ['guardian_name','guardian_phone','guardian_email','guardian_relationship','guardian_aware'])form.elements[name].required=under18;
  const photo=form.elements.photo_consent;
  if(under18)photo.checked=false;
  photo.disabled=under18;
  const photoLabel=photo.closest('label');
  if(photoLabel)photoLabel.classList.toggle('hidden',under18);
 }
 dateField.addEventListener('change',guardianToggle);
 dateField.addEventListener('input',guardianToggle);
 guardianToggle();
 document.getElementById('directHistory').onchange=e=>prev.required=e.target.value==='transfer';
 form.onsubmit=async(e)=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const btn=document.getElementById('directRegSubmit'),msg=document.getElementById('directRegMessage');
  btn.disabled=true;btn.textContent='Sending…';msg.textContent='';
  const fd=new FormData(form),body={};
  for(const [k,v] of fd.entries())body[k]=String(v);
  for(const k of ['consent_privacy','confirm_correct','photo_consent','guardian_aware'])body[k]=fd.has(k);
  const age=yearsOld(String(body.date_of_birth||''));
  if(age===null||age<16){msg.textContent='This form is for players aged 16 or over. Please contact the club.';btn.disabled=false;btn.textContent='Send registration to the club';return}
  try{
   const response=await fetch('https://isljjtspkqsyhkjmmhiq.supabase.co/functions/v1/public-direct-player-registration',{
    method:'POST',
    headers:{apikey:'sb_publishable_j7WOkbvabstVJEmfh5zWbQ_NgE0jhjJ','Content-Type':'application/json'},
    body:JSON.stringify(body)
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.ok)throw Error(data.error||'Could not send the form.');
   form.classList.add('hidden');
   document.getElementById('directRegSuccess').classList.remove('hidden');
   document.getElementById('directRegSuccess').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){msg.textContent=err.message||'Could not send the form.';btn.disabled=false;btn.textContent='Send registration to the club'}
 };
}

const originalDirectRegAdminExtras=renderAdminExtras;
renderAdminExtras=async function(){
 await originalDirectRegAdminExtras();
 if(profile?.role!=='chair'||isPlayerView())return;
 const area=$('#content');if(!area)return;
 area.insertAdjacentHTML('afterbegin','<div class="panel direct-reg-admin-share">'+
  '<span class="eyebrow dark">NEW PLAYER REGISTRATION</span><h3>Send a registration form</h3>'+
  '<p class="muted">Copy the link and send it to the player. No Hub login needed. When they return the form, register them in COMET, then add and approve their Hub account yourself.</p>'+
  '<div class="direct-reg-share"><input id="directRegLinkInput" readonly value="'+DIRECT_PLAYER_REG_LINK+'" aria-label="Registration link">'+
  '<button class="btn primary" type="button" id="directRegCopyLink">Copy link</button>'+
  '<a class="btn" href="'+DIRECT_PLAYER_REG_LINK+'" target="_blank" rel="noopener">Open form</a></div></div>');
 const copy=$('#directRegCopyLink');
 copy.onclick=async()=>{
  try{await navigator.clipboard.writeText(DIRECT_PLAYER_REG_LINK)}
  catch{const input=$('#directRegLinkInput');input.focus();input.select();if(!document.execCommand('copy'))return alert('Please copy the link from the box.')}
  copy.textContent='Link copied';
  setTimeout(()=>copy.textContent='Copy link',2200);
 };
 const {data:items,error}=await sb.from('direct_player_registrations')
  .select('id,full_name,email,phone,details,status,submitted_at').order('submitted_at',{ascending:false}).limit(100);
 if(error){area.querySelector('.direct-reg-admin-share').insertAdjacentHTML('afterend','<div class="panel">Could not load registration submissions.</div>');return;}
 const rows=items||[];
 const newCount=rows.filter(r=>r.status==='received').length;
 const html='<div class="panel direct-reg-admin-inbox"><div class="head"><div>'+
 '<span class="eyebrow dark">CHAIR ONLY · PRIVATE</span><h3>Completed registration forms</h3></div>'+
 '<span class="badge '+(newCount?'warn':'ok')+'">'+newCount+' awaiting COMET</span></div>'+
 '<p class="muted">Review the submitted form, register the player in FAW COMET manually and update the status. These records do not automatically create Hub accounts.</p>'+
 (rows.length?'<div class="list">'+rows.map(r=>'<div class="direct-reg-inbox-row"><div><strong>'+esc(r.full_name)+'</strong>'+
 '<small>'+esc(r.email)+' · '+esc(new Date(r.submitted_at).toLocaleDateString('en-GB'))+'</small></div>'+
 '<div class="actions"><button class="btn" data-direct-reg-open="'+r.id+'">View details</button>'+
 '<select data-direct-reg-status="'+r.id+'" aria-label="Registration status for '+esc(r.full_name)+'">'+
 '<option value="received">Form received</option><option value="comet_registered">Registered on COMET</option>'+
 '<option value="hub_added">Added to Hub</option></select></div></div>').join('')+'</div>':
 '<p class="muted">No registration forms have been received yet.</p>')+
 '<div id="directRegDetailsViewer"></div></div>';
 area.querySelector('.direct-reg-admin-share').insertAdjacentHTML('afterend',html);
 area.querySelectorAll('[data-direct-reg-status]').forEach(sel=>{
  const r=rows.find(x=>x.id===sel.dataset.directRegStatus);sel.value=r.status;
  sel.onchange=async()=>{
   const to=sel.value;
   if(to==='comet_registered'&&!confirm('Have you verified registration on FAW COMET? This action does not register the player automatically.')){sel.value=r.status;return}
   if(to==='hub_added'&&!confirm('Have you already added this player to the Hub and approved their login? This action does not do that automatically.')){sel.value=r.status;return}
   sel.disabled=true;
   const {error}=await sb.from('direct_player_registrations').update({
    status:to,reviewed_by:user.id,reviewed_at:new Date().toISOString()
   }).eq('id',r.id);
   if(error){sel.value=r.status;sel.disabled=false;alert(error.message)}
   else admin();
  };
 });
 area.querySelectorAll('[data-direct-reg-open]').forEach(button=>button.onclick=()=>{
  const r=rows.find(x=>x.id===button.dataset.directRegOpen);if(!r)return;
  const labels={
   given_names:'Given names',last_name:'Surname',gender:'Gender',date_of_birth:'Date of birth',
   nationality:'Nationality',ethnicity:'Ethnicity',country_of_birth:'Country of birth',
   place_of_birth:'Place of birth',email:'Email',phone:'Phone',address:'Address',
   town:'Town / city',postcode:'Postcode',country:'Country',football_history:'Previous FAW registration',
   previous_club:'Previous club',comet_id:'COMET player ID',emergency_name:'Emergency contact',
   emergency_phone:'Emergency telephone',emergency_relationship:'Relationship',
   photo_consent:'Photo consent',guardian_name:'Parent / guardian',guardian_relationship:'Guardian relationship',guardian_phone:'Guardian telephone',guardian_email:'Guardian email',guardian_aware:'Parent / guardian informed',under_18:'Player is under 18',guardian_review_required:'Safeguarding review required'
  };
  const entries=Object.entries(labels);
  const value=k=>r.details?.[k]===true?'Yes':r.details?.[k]===false?'No':String(r.details?.[k]||'—');
  const viewer=$('#directRegDetailsViewer');
  viewer.innerHTML='<div class="direct-reg-private-view"><div class="head"><h3>'+esc(r.full_name)+'</h3>'+
    '<button class="btn" id="directRegCloseViewer">Close</button></div>'+
    '<p class="muted">Private details for registration. Only transfer them to authorised club and FAW systems.</p>'+
    entries.map(([k,label])=>'<div class="direct-reg-value"><strong>'+esc(label)+'</strong><span>'+
      esc(value(k))+'</span></div>').join('')+
    '<div class="actions"><button class="btn primary" id="directRegCopyDetails">Copy COMET details</button></div></div>';
  viewer.querySelector('#directRegCloseViewer').onclick=()=>viewer.innerHTML='';
  viewer.querySelector('#directRegCopyDetails').onclick=async()=>{
   const data=r.full_name+'\n'+entries.map(([k,label])=>label+': '+value(k)).join('\n');
   try{await navigator.clipboard.writeText(data);alert('Player details copied. Only paste them into an authorised registration system.')}
   catch{alert('Could not copy. Please select the fields from the form.')}
  };
  viewer.scrollIntoView({behavior:'smooth',block:'start'});
 });
};
