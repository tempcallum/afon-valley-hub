
/* Afon Valley compact club navigation, read-only policies and matchday centre. */
const avfcPreviousAllowed=allowed;
allowed=function(){
 const original=avfcPreviousAllowed();
 if(!profile?.approved)return original;
 const out=[...original];
 if(original.includes('availability')&&!out.includes('matchday'))out.push('matchday');
 if(!out.includes('policies'))out.push('policies');
 return out;
};
labels.matchday='Matchday HQ';
labels.policies='Club policies';

function avfcCompactGroups(){
 const items=new Set(allowed());
 const player=isPlayerView();
 const source=[
   {id:'home',label:'Home',tabs:['home','notifications']},
   {id:'football',label:'Football',tabs:['matchday','availability','players','stats','attendance']},
   {id:'club',label:'Club',tabs:['events','kit','shop','committee','policies']},
   {id:'money',label:'Money',tabs:['money','fines','tote']},
   ...(player?[{id:'account',label:'Account',tabs:['account','details','emergency','calendar']}]:
     [{id:'manage',label:'Manage',tabs:['admin','documents','equipment','emergency','calendar','account','details']}])
 ];
 return source.map(g=>({...g,tabs:g.tabs.filter(x=>items.has(x))})).filter(g=>g.tabs.length);
}
const avfcOriginalRender=render;
render=async function(which){
 if(which==='policies')return avfcPlayerPolicies();
 if(which==='matchday')return avfcMatchdayHQ();
 return avfcOriginalRender(which);
};
const avfcOriginalDrawNav=drawNav;
drawNav=function(){
 if(!profile?.approved)return avfcOriginalDrawNav();
 const all=allowed();
 if(!all.includes(tab))tab='home';
 const groups=avfcCompactGroups();
 const activeGroup=groups.find(g=>g.tabs.includes(tab))||groups[0];
 const nav=$('#nav');
 if(!nav)return;
 nav.classList.add('hub-main-nav');
 nav.innerHTML=groups.map(g=>'<button type="button" data-hub-group="'+g.id+'" class="'+(g.id===activeGroup.id?'active':'')+'">'+g.label+'</button>').join('');
 if(!document.getElementById('hub-subnav'))nav.insertAdjacentHTML('afterend','<nav class="hub-subnav" id="hub-subnav" aria-label="Page sections"></nav>');
 const sub=document.getElementById('hub-subnav');
 sub.innerHTML=activeGroup.tabs.length>1?activeGroup.tabs.map(id=>
 '<button type="button" data-hub-tab="'+id+'" class="'+(tab===id?'active':'')+'">'+
 esc(labels[id]||id)+'</button>').join(''):'';
 sub.classList.toggle('hidden',activeGroup.tabs.length<2);
 nav.querySelectorAll('[data-hub-group]').forEach(button=>button.onclick=()=>{
  const selected=groups.find(g=>g.id===button.dataset.hubGroup);
  if(!selected)return;
  const dest=selected.tabs.includes(tab)?tab:selected.tabs[0];
  tab=dest;drawNav();render(dest);
 });
 sub.querySelectorAll('[data-hub-tab]').forEach(button=>button.onclick=()=>{
  tab=button.dataset.hubTab;drawNav();render(tab);
 });
};

const avfcPlayerDocuments=[
 {name:'Code of Conduct',cat:'Playing at Afon Valley',path:'Club Admin/Afon_Valley_FC_Codes_of_Conduct.pdf'},
 {name:'Safeguarding Policy',cat:'Player welfare',path:'Safeguarding/Afon_Valley_FC_Safeguarding_Policy.pdf'},
 {name:'Anti-Bullying Policy',cat:'Player welfare',path:'Safeguarding/Afon_Valley_FC_Anti_Bullying_Policy.pdf'},
 {name:'Equality & Anti-Discrimination',cat:'Player welfare',path:'Club Admin/Afon_Valley_FC_Equality_Diversity_and_Anti_Discrimination_Policy.pdf'},
 {name:'Complaints, Discipline & Appeals',cat:'Club rules',path:'Club Admin/Afon_Valley_FC_Complaints_Discipline_and_Appeals_Procedure.pdf'},
 {name:'Privacy Notice for Members',cat:'Your information',path:'Club Admin/Afon_Valley_FC_Player_Member_and_Volunteer_Privacy_Notice.pdf'},
 {name:'Photography & Video Policy',cat:'Your information',path:'Club Admin/Afon_Valley_FC_Photography_Video_and_Image_Use_Policy.pdf'},
 {name:'Health & Safety Policy',cat:'Player welfare',path:'Health & Safety/Afon_Valley_FC_Health_Safety_and_Emergency_Action_Policy.pdf'}
];
async function avfcPlayerPolicies(){
 if(!profile?.approved)return;
 const target=$('#content');
 target.innerHTML='<section class="hub-policy-page">'+
 '<div class="hub-section-header"><span class="eyebrow dark">PLAYER LIBRARY</span><h3>Club policies</h3>'+
 '<p class="muted">Only the policies you may need as an Afon Valley player. Open a document to read it. The private committee library stays restricted.</p></div>'+
 '<div class="hub-policy-list">'+avfcPlayerDocuments.map((d,i)=>
 '<div class="hub-policy-row"><div><span class="hub-policy-index">'+String(i+1).padStart(2,'0')+'</span>'+
 '<span class="hub-policy-name"><strong>'+esc(d.name)+'</strong><small>'+esc(d.cat)+' · PDF</small></span></div>'+
 '<button type="button" class="btn hub-policy-open" data-hub-policy="'+i+'">Read</button></div>').join('')+
 '</div></section>';
 target.querySelectorAll('[data-hub-policy]').forEach(button=>button.onclick=async()=>{
  const item=avfcPlayerDocuments[Number(button.dataset.hubPolicy)];
  if(!item)return;
  button.disabled=true;button.textContent='Opening…';
  const {data,error}=await sb.storage.from('club-documents').createSignedUrl(item.path,90);
  button.disabled=false;button.textContent='Read';
  if(error||!data?.signedUrl)return alert('This policy could not be opened. Please try again or ask the Chair.');
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 });
}

function avfcHqGo(where,mid){
 tab=where;drawNav();render(where).then(()=>{
  if(where==='availability'&&mid&&typeof matchAv==='function')matchAv(mid);
 });
}
async function avfcMatchdayHQ(){
 if(!allowed().includes('matchday'))return;
 const target=$('#content');
 target.innerHTML='<div class="panel hub-match-loading">Loading Matchday HQ…</div>';
 const now=new Date(Date.now()-3*3600000).toISOString();
 const [{data:fixtures,error:fxError},{data:settings}]=await Promise.all([
  sb.from('matches').select('*').gte('match_date',now).order('match_date',{ascending:true}).limit(1),
  sb.from('club_settings').select('home_colour,away_colour').eq('id',1).maybeSingle()
 ]);
 if(!target.isConnected)return;
 if(fxError){target.innerHTML='<div class="panel empty">Could not load the match information. Please retry.</div>';return}
 const match=fixtures?.[0];
 if(!match){
  target.innerHTML='<div class="panel hub-match-loading"><span class="eyebrow dark">MATCHDAY HQ</span><h3>No upcoming fixture</h3><p class="muted">Once the next fixture is added it will appear here, with the meeting details, kit, availability and team selection.</p></div>';
  return;
 }
 const admin=!isPlayerView()&&['chair','manager','facilities'].includes(profile.role);
 const canPick=!isPlayerView()&&['chair','manager'].includes(profile.role);
 const [lineup,players,selection]=await Promise.all([
  sb.from('fixture_lineups').select('formation,published_at').eq('match_id',match.id).maybeSingle(),
  sb.from('fixture_lineup_players').select('player_id,slot_key,squad_role,players(name)').eq('match_id',match.id),
  myPlayer?sb.from('availability').select('status').eq('match_id',match.id).eq('player_id',myPlayer).maybeSingle():Promise.resolve({data:null})
 ]);
 const kitMap={green:'Green',yellow:'Yellow',other:'Alternative kit',tbc:'To be confirmed'};
 const defaultKit=String(match.home_away||'home').toLowerCase()==='home'?(settings?.home_colour||'Green'):(settings?.away_colour||'Yellow');
 const kitName=match.matchday_kit?kitMap[match.matchday_kit]:defaultKit+' (expected)';
 const formattedDate=new Date(match.match_date).toLocaleDateString('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'long'});
 const kickoff=new Date(match.match_date).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'});
 const place=String(match.venue||'').trim();
 const meet=String(match.matchday_meeting_time||'').trim();
 const meetPoint=String(match.matchday_meeting_point||'').trim();
 const team=lineup.data;
 const visibleTeam=Boolean(team?.published_at)||canPick;
 const starters=(players.data||[]).filter(x=>x.squad_role==='starter');
 const subs=(players.data||[]).filter(x=>x.squad_role==='sub');
 const current=(players.data||[]).find(x=>x.player_id===myPlayer);
 const statusMap={available:'Available',maybe:'Maybe',unavailable:'Unavailable'};
 const mapLink=place?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place):'';
 target.innerHTML='<section class="hub-matchday">'+
 '<div class="hub-md-header"><span>MATCHDAY HQ</span><div class="hub-md-fixture"><h2>Afon Valley FC <small>vs</small> '+esc(match.opponent)+'</h2>'+
 '<p>'+esc(formattedDate)+' · '+esc(kickoff)+' kick-off · '+esc(match.home_away==='away'?'Away':'Home')+'</p></div></div>'+
 '<div class="hub-md-summary">'+
 '<div class="hub-md-item"><span>Kit colour</span><strong>'+esc(kitName)+'</strong></div>'+
 '<div class="hub-md-item"><span>Meeting time</span><strong>'+esc(meet||'To be confirmed')+'</strong></div>'+
 '<div class="hub-md-item"><span>Meeting point</span><strong>'+esc(meetPoint||'To be confirmed')+'</strong></div>'+
 '<div class="hub-md-item"><span>Venue</span><strong>'+esc(place||'To be confirmed')+'</strong></div></div>'+
 '<div class="hub-md-actions">'+(mapLink?'<a class="btn" href="'+esc(mapLink)+'" rel="noopener noreferrer" target="_blank">Open directions</a>':'')+
 '<button class="btn" id="hubMdAvailability">Availability</button>'+
 (canPick?'<button class="btn primary" id="hubMdTeamPicker">Pick / edit team</button>':'')+
 '</div>'+
 '<div class="hub-md-team">'+
 '<div class="hub-md-team-top"><div><span class="eyebrow dark">TEAM SELECTION</span><h3>'+
 (team?.published_at?'Line-up published':canPick?'Line-up not published':'Awaiting team announcement')+
 '</h3></div>'+(team?.published_at?'<span class="badge ok">Published</span>':'<span class="badge">Pending</span>')+'</div>'+
 (team?.published_at&&isPlayerView()?
 '<p class="hub-md-my-role">'+(current?(current.squad_role==='starter'?'You are starting':'You are a substitute'):'Not selected for this match')+'</p>':'')+
 (team?.published_at||canPick?
 '<details class="hub-md-lineup"><summary>View squad'+(team?.formation?' · '+esc(team.formation):'')+'</summary>'+
 '<div class="hub-md-roster"><div><h4>Starting XI</h4>'+(
 starters.length?starters.map(p=>'<p><b>'+esc(p.slot_key||'—')+'</b> '+esc(p.players?.name||'Player')+'</p>').join(''):'<p>Not selected yet</p>')+
 '</div><div><h4>Substitutes</h4>'+(
 subs.length?subs.map(p=>'<p>'+esc(p.players?.name||'Player')+'</p>').join(''):'<p>Not selected yet</p>')+
 '</div></div></details>':'<p class="muted">Your manager will publish the team when it is ready.</p>')+
 '</div>'+
 (admin?'<details class="hub-md-settings"><summary>Matchday details · Edit kit and meeting arrangements</summary>'+
 '<form id="hubMdSettingsForm" class="hub-md-settings-grid">'+
 '<label>Kit colour<select name="kit"><option value="">Use default home / away kit</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="other">Alternative kit</option><option value="tbc">To be confirmed</option></select></label>'+
 '<label>Meet at<input name="meet_time" type="time" value="'+esc(meet)+'"></label>'+
 '<label>Meeting point<input name="meeting_point" maxlength="200" value="'+esc(meetPoint)+'" placeholder="e.g. Risca Leisure Centre"></label>'+
 '<button type="submit" class="btn primary">Save details</button></form>'+
 '<p class="muted">Venue and kick-off are managed in the Fixtures / Availability screen. Players will see these details as soon as you save.</p></details>':'')+
 '</section>';
 const a=target.querySelector('#hubMdAvailability');
 if(a)a.onclick=()=>avfcHqGo('availability',match.id);
 const pick=target.querySelector('#hubMdTeamPicker');
 if(pick)pick.onclick=()=>avfcHqGo('availability',match.id);
 const form=target.querySelector('#hubMdSettingsForm');
 if(form){
  form.elements.kit.value=match.matchday_kit||'';
  form.onsubmit=async e=>{
   e.preventDefault();
   const fd=new FormData(form);
   const kit=String(fd.get('kit')||'');
   const meetAt=String(fd.get('meet_time')||'');
   const meetLocation=String(fd.get('meeting_point')||'').trim().slice(0,200);
   const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='Saving…';
   const {error}=await sb.from('matches').update({
    matchday_kit:kit||null,matchday_meeting_time:meetAt||null,
    matchday_meeting_point:meetLocation||null
   }).eq('id',match.id);
   if(error){button.disabled=false;button.textContent='Save details';return alert(error.message)}
   await avfcMatchdayHQ();
  };
 }
}
