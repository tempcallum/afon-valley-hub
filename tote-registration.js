
/* Council small-society lottery details; the club brand remains Afon Valley FC. */
const avfcRegNumber="26/02939/LOTTER";
const avfcSocietyLegalName="Afon Valley AFC";
const avfcCouncilRegistrationDate="13 October 2026";
const avfcCouncilDocumentFolder="Tote/";
const avfcRegPreviousPublicTote=showPublicTote;
showPublicTote=async function(){
 await avfcRegPreviousPublicTote();
 if(publicTote==='return'||publicTote==='preview')return;
 const area=$('#totePublicContent');
 if(!area||!area.isConnected||area.querySelector('.tote-registration-public'))return;
 let info=null;
 try{info=await toteApi('tote-public?ref=club')}catch{return}
 if(!area.isConnected||!info?.registration_number)return;
 const box=document.createElement('div');
 box.className='tote-registration-public';
 box.innerHTML=
  '<div class="tote-registration-verified"><strong>Registered Small Society Lottery</strong>'+
  '<span>Newport City Council</span></div>'+
  '<div class="tote-registration-public-details"><span>Promoting society: <strong>'+esc(info.society_name||avfcSocietyLegalName)+'</strong></span>'+
  '<span>Registration: <strong>'+esc(info.registration_number)+'</strong></span>'+
  '<span>Effective: <strong>'+esc(avfcCouncilRegistrationDate)+'</strong></span></div>'+
  '<p>Entry age 16+. All tickets are issued only after verified payment. At least 20% of lottery proceeds supports the club. Ticket receipts show the legally required organiser details and draw date.</p>'+
  '<p><a href="https://www.gambleaware.org/" target="_blank" rel="noopener noreferrer">Safer gambling information</a></p>';
 const heading=area.querySelector('.tote-jackpot');
 if(heading)heading.insertAdjacentElement('afterend',box);
 else area.insertAdjacentElement('afterbegin',box);
};
const avfcRegPreviousChairTote=tote;
tote=async function(){
 await avfcRegPreviousChairTote();
 if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
 const area=$('#content');
 if(!area||!area.isConnected||area.querySelector('#toteRegistrationChair'))return;
 const {data:s,error}=await sb.from('tote_settings')
   .select('society_registered_name,society_registration_number,registration_effective_date,registration_authority,registration_certificate_path,enabled,payments_enabled,payment_method,bank_account_name,bank_sort_code,bank_account_number,responsible_person_name,responsible_person_address')
   .eq('id',1).maybeSingle();
 if(error||!s||!area.isConnected)return;
 const info=await toteApi('tote-public?ref=club').catch(()=>null);
 if(!area.isConnected)return;
 const registration=s.society_registered_name===avfcSocietyLegalName&&s.society_registration_number===avfcRegNumber;
 const bank=Boolean(s.bank_account_name&&/^\d{6}$/.test(String(s.bank_sort_code||'').replace(/\D/g,''))&&/^\d{8}$/.test(String(s.bank_account_number||'').replace(/\D/g,'')));
 const promoter=Boolean(s.responsible_person_name?.trim()&&s.responsible_person_address?.trim());
 const email=Boolean(info?.email_ready);
 const certificate=Boolean(s.registration_certificate_path);
 const checks=[
  {label:'Council registration',done:registration},
  {label:'Promoter name and address',done:promoter},
  {label:'Lloyds payment account',done:bank},
  {label:'Ticket email service',done:email},
  {label:'Certificate filed privately',done:certificate}
 ];
 const checked=checks.filter(c=>c.done).length;
 const panel=document.createElement('section');
 panel.className='panel tote-reg-chair';
 panel.id='toteRegistrationChair';
 panel.innerHTML='<div class="tote-reg-heading"><div><span class="eyebrow dark">NEWPORT CITY COUNCIL</span>'+
   '<h3>Small Society Lottery registration</h3>'+
   '<p>Official society: <strong>'+esc(s.society_registered_name||avfcSocietyLegalName)+
   '</strong> · Effective '+esc(avfcCouncilRegistrationDate)+'</p></div>'+
   '<span class="badge ok">REGISTERED</span></div>'+
   '<div class="tote-reg-id"><div><small>Registration reference</small><strong>'+esc(s.society_registration_number||avfcRegNumber)+'</strong></div>'+
   '<button class="btn" type="button" id="toteCopyRegistration">Copy</button></div>'+
   '<div class="tote-reg-file-row">'+
   (certificate?'<button class="btn" type="button" id="toteOpenCertificate">View private certificate</button>':'<span>Certificate not yet saved in private library</span>')+
   '<button class="btn" type="button" id="totePickCertificate">'+(certificate?'Replace certificate':'Upload certificate')+'</button>'+
   '<input id="toteCertificateFile" type="file" accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" hidden>'+
   '</div><div role="status" aria-live="polite" id="toteRegMessage" class="muted"></div>'+
   '<details class="tote-reg-checklist"><summary>Launch checks · '+checked+' of '+checks.length+' complete</summary>'+
   '<div>'+checks.map(c=>'<div class="tote-reg-check"><span class="'+(c.done?'passed':'missing')+'">'+(c.done?'Done':'To do')+'</span><span>'+esc(c.label)+'</span></div>').join('')+
   '</div><p>Before accepting entries, confirm the draw rules, under-16 protection, ticket/receipt details and two appointed signatories for council returns. Draw returns are due within three months.</p>'+
   '<p>Public ticket sales are controlled separately by the Chair. A registration certificate alone never starts sales.</p></details>'+
   '<p class="tote-reg-hold">'+(s.payments_enabled?
     'Live ticket sales are enabled in settings. Verify all checks immediately.':
     'Public checkout is currently closed; the registration certificate alone does not activate sales.')+'</p>';
 // Keep the Council record accessible without filling the operational screen.
 const details=document.createElement('details');
 details.className='tote-reg-disclosure';
 const summary=document.createElement('summary');
 summary.textContent='Registration details & launch checks';
 details.appendChild(summary);
 panel.querySelector('.tote-reg-heading').insertAdjacentElement('afterend',details);
 for(const selector of ['.tote-reg-id','.tote-reg-file-row','#toteRegMessage','.tote-reg-checklist','.tote-reg-hold']){
   const item=panel.querySelector(selector);
   if(item)details.appendChild(item);
 }
 panel.classList.add('tote-reg-chair-compact');
 // Administrative registration remains accessible at the very bottom of the Tote dashboard.
 area.appendChild(panel);
 panel.querySelector('#toteCopyRegistration').onclick=e=>copyText(s.society_registration_number||avfcRegNumber,e.currentTarget);
 const input=panel.querySelector('#toteCertificateFile');
 const status=panel.querySelector('#toteRegMessage');
 panel.querySelector('#totePickCertificate').onclick=()=>input.click();
 input.onchange=async()=>{
  const file=input.files?.[0];
  if(!file)return;
  if(!/\.(docx|pdf)$/i.test(file.name))return status.textContent='Choose the original DOCX certificate or a PDF.';
  if(file.size>5*1024*1024)return status.textContent='The certificate must be smaller than 5 MB.';
  const name=file.name.toLowerCase().endsWith('.pdf')?'Afon_Valley_AFC_Council_Registration_Certificate_2026.pdf':'Afon_Valley_AFC_Council_Registration_Certificate_2026.docx';
  const path=avfcCouncilDocumentFolder+name;
  const button=panel.querySelector('#totePickCertificate');
  button.disabled=true;status.textContent='Uploading to the private Chair document library…';
  const {error:uploadError}=await sb.storage.from('club-documents').upload(path,file,{upsert:true,contentType:file.type||undefined});
  if(uploadError){button.disabled=false;status.textContent='Upload failed: '+uploadError.message;return}
  const {error:saveError}=await sb.from('tote_settings').update({
    registration_certificate_path:path,updated_at:new Date().toISOString(),updated_by:user.id
  }).eq('id',1);
  if(saveError){button.disabled=false;status.textContent='File stored, but could not link it: '+saveError.message;return}
  status.textContent='Certificate saved privately.';
  await tote();
 };
 const view=panel.querySelector('#toteOpenCertificate');
 if(view)view.onclick=async()=>{
  const win=window.open('about:blank','_blank');
  const {data,error:linkError}=await sb.storage.from('club-documents').createSignedUrl(s.registration_certificate_path,90);
  if(linkError){win?.close();return alert(linkError.message)}
  if(win)win.location.replace(data.signedUrl);
  else location.assign(data.signedUrl);
 };
};
