
/* FAW registration clearance. Independent of Hub account and playing squad status. */
const avfcClearanceOldPlayers=players;
players=async function(){
 await avfcClearanceOldPlayers();
 if(!profile?.approved||isPlayerView())return;
 const root=$('#content');if(!root||!root.isConnected)return;
 const {data,error}=await sb.from('players').select('id,name,status,registration_clearance,comet_confirmed_at')
  .order('name');
 if(error){console.warn('Could not display COMET clearance',error.message);return}
 const list=data||[];
 const pending=list.filter(p=>p.status!=='left'&&p.registration_clearance==='pending_comet');
 const canMark=profile.role==='chair';
 // Small roster tags are always visible to club officials; no huge extra columns.
 const rows=[...root.querySelectorAll('table tbody tr')];
 const byId=new Map(list.map(p=>[Number(p.id),p]));
 rows.forEach((tr,i)=>{
   const button=tr.querySelector('[data-edit-player]');
   const player=(button&&byId.get(Number(button.dataset.editPlayer)))||list[i];
   const first=tr.querySelector('td strong');
   if(!player||!first)return;
   const state=player.registration_clearance;
   if(state==='pending_comet'){
     first.insertAdjacentHTML('afterend','<span class="comet-clearance-tag pending">PENDING COMET</span>');
   }else if(state==='confirmed'){
     first.insertAdjacentHTML('afterend','<span class="comet-clearance-tag cleared">COMET CONFIRMED</span>');
   }
 });
 if(!['chair','manager'].includes(profile.role))return;
 const intro=document.createElement('section');
 intro.className='comet-clearance-panel';
 intro.innerHTML=
  '<div class="comet-clearance-panel-title"><div><span class="eyebrow dark">COMPETITIVE ELIGIBILITY</span>'+
  '<h3>COMET clearance</h3></div>'+
  '<span class="comet-clearance-number">'+pending.length+' pending</span></div>'+
  '<p class="muted">Pending players can use their Hub account, attend training and give availability. They cannot be placed in a competitive match squad until the Chair verifies COMET is CONFIRMED.</p>'+
  (pending.length?'<div class="comet-clearance-pending-list">'+pending.map(p=>
   '<span class="comet-clearance-person">'+esc(p.name)+'</span>').join('')+'</div>':
   '<p class="comet-clearance-empty">No current squad members marked Pending COMET.</p>')+
  (canMark?'<details class="comet-clearance-edit"><summary>Update player COMET clearance</summary>'+
   '<div class="comet-clearance-controls"><label>Player<select id="cometClearancePlayer">'+
   list.filter(p=>p.status!=='left').map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')+
   '</select></label><label>Registration status<select id="cometClearanceStatus">'+
   '<option value="pending_comet">Pending COMET</option>'+
   '<option value="confirmed">COMET CONFIRMED</option></select></label>'+
   '<button class="btn primary" type="button" id="cometClearanceSave">Save status</button></div>'+
   '<p class="muted">Only choose COMET CONFIRMED after checking the official COMET player record. A COMET person ID, application or fee submission alone does not establish match eligibility. Also check disciplinary restrictions.</p>'+
   '</details>':'')+
   '<div class="comet-clearance-foot">New players are set to Pending COMET automatically. Existing squad records have not been reclassified.</div>';
 const parent=root.querySelector('#playerEditor');
 if(parent)parent.insertAdjacentElement('afterend',intro);
 else root.insertAdjacentElement('afterbegin',intro);
 if(!canMark)return;
 const who=intro.querySelector('#cometClearancePlayer');
 const choice=intro.querySelector('#cometClearanceStatus');
 const save=intro.querySelector('#cometClearanceSave');
 if(!who||!choice||!save)return;
 const sync=()=>{
   const player=byId.get(Number(who.value));
   choice.value=player?.registration_clearance==='pending_comet'?'pending_comet':'confirmed';
   if(player?.registration_clearance==='existing')choice.value='pending_comet';
   choice.dataset.actualStatus=player?.registration_clearance||'pending_comet';
 };
 who.onchange=sync;
 sync();
 save.onclick=async()=>{
   const player=byId.get(Number(who.value)),requested=choice.value;
   if(!player)return;
   if(requested===player.registration_clearance)return alert('This player already has that COMET clearance status.');
   const warning=requested==='confirmed'?
     'Have you checked the official FAW COMET record for '+player.name+' and confirmed their player registration status is CONFIRMED? Check any suspensions separately.':
     'Mark '+player.name+' as Pending COMET? This will immediately prevent future competitive line-up selection and remove them from any upcoming published squad.';
   if(!confirm(warning))return;
   save.disabled=true;save.textContent='Saving…';
   const {error:saveError}=await sb.rpc('chair_set_player_comet_clearance',{
     p_player_id:player.id,p_clearance:requested
   });
   if(saveError){save.disabled=false;save.textContent='Save status';return alert(saveError.message)}
   await players();
 };
};
/* Show registered Hub members clearly that they cannot yet be picked for league/cup games. */
const avfcClearanceOldHome=home;
home=async function(){
 await avfcClearanceOldHome();
 if(!profile?.approved||!isPlayerView()||!myPlayer)return;
 const root=$('#content');if(!root||!root.isConnected)return;
 const {data,error}=await sb.from('players').select('registration_clearance')
  .eq('id',myPlayer).maybeSingle();
 if(error||data?.registration_clearance!=='pending_comet'||!root.isConnected)return;
 const banner=document.createElement('div');
 banner.className='comet-clearance-home-banner';
 banner.innerHTML='<strong>COMET registration pending</strong>'+
  '<span>You can use the Hub, confirm availability and attend training. You are not yet eligible for a competitive match squad. The Chair will update this once your COMET registration is confirmed.</span>';
 const setup=root.querySelector('#hubPlayerSetupChecklist');
 if(setup)setup.insertAdjacentElement('afterend',banner);
 else root.insertAdjacentElement('afterbegin',banner);
};
