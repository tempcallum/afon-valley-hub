
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
   {id:'club',label:'Club',tabs:player?['events','tote','kit','shop','committee','policies']:['events','kit','shop','committee','policies']},
   {id:'money',label:'Money',tabs:player?['money','fines']:['money','fines','tote']},
   ...(player?[{id:'account',label:'Account',tabs:['account','details','emergency','calendar']}]:
     [{id:'manage',label:'Manage',tabs:['admin','documents','equipment','emergency','calendar','account','details']}])
 ];
 return source.map(g=>({...g,tabs:g.tabs.filter(x=>items.has(x))})).filter(g=>g.tabs.length);
}
const avfcOriginalRender=render;
render=async function(which){
 if(which==='policies')return avfcPlayerPolicies();
 if(which==='matchday')return avfcMatchdayHQ();
 if(which==='tote'&&isPlayerView())return avfcPlayerTote();
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
 nav.style.gridTemplateColumns='repeat('+groups.length+',minmax(0,1fr))';
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


/* Personal Tote view: public information only, with no financial admin methods. */
/* Public entry page is separate: player home shows share/QR + members-only referral rankings. */
async function avfcPlayerTote(){
 const el=$('#content');
 if(!el||!profile?.approved||!isPlayerView())return;
 el.innerHTML='<div class="panel"><h3>Afon Valley Tote</h3><p>Loading the draw, your personal QR and leaderboard…</p></div>';
 let data,referral=null,leaderboard=[],leaderboardError=null;
 try{
   const [publicData,refResult,boardResult]=await Promise.all([
     toteApi('tote-public?ref=club'),
     myPlayer?sb.from('tote_player_referrals').select('code,active')
       .eq('player_id',myPlayer).eq('active',true).maybeSingle():Promise.resolve({data:null,error:null}),
     sb.rpc('get_tote_leaderboard')
   ]);
   data=publicData;
   referral=refResult?.error?null:refResult?.data;
   leaderboard=Array.isArray(boardResult?.data)?boardResult.data:[];
   leaderboardError=boardResult?.error||null;
 }catch(err){
   if(tab==='tote'&&el.isConnected)el.innerHTML='<div class="panel">'+
     '<h3>Afon Valley Tote</h3><p class="muted">Live draw information is temporarily unavailable.</p>'+
     '<a class="btn primary" href="'+esc(toteLink('club'))+'">Open the public Tote</a></div>';
   return;
 }
 if(tab!=='tote'||!el.isConnected||!isPlayerView())return;
 const draw=data.current_draw;
 const live=Boolean(data.payments_live&&draw&&Date.now()<Date.parse(draw.sales_close_at));
 const formatted=draw?new Date(draw.draw_at).toLocaleString('en-GB',{
    timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',
    hour:'2-digit',minute:'2-digit'}):'Next draw to be confirmed';
 const cutoff=draw?new Date(draw.sales_close_at).toLocaleTimeString('en-GB',{
    timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}):'';
 // A personal code is looked up under the player's RLS-protected own-record policy.
 // Never label a generic club link as someone's referral QR.
 const personalCode=referral?.active&&/^[a-z0-9]{6,60}$/i.test(String(referral.code||''))
   ?String(referral.code):null;
 const personalLink=personalCode?toteLink(personalCode):null;
 el.innerHTML='<section class="hub-player-tote">'+
    '<div class="hub-player-tote-heading"><span class="eyebrow dark">AFON VALLEY FC</span>'+
    '<h2>Weekly Tote</h2><p>Support the club for £'+esc(Number(data.ticket_price||1).toFixed(2))+
    ' per entry, with a chance to win each Friday.</p></div>'+
    '<div class="hub-player-tote-prizes">'+
      '<div><span>CURRENT JACKPOT</span><strong>'+esc(pounds(draw?.current_jackpot||0))+
      '</strong><small>Rolls over if the winning number is not held</small></div>'+
      '<div><span>WEEKLY PRIZE</span><strong>'+esc(pounds(draw?.weekly_prize||0))+
      '</strong><small>Chosen from paid tickets</small></div>'+
    '</div>'+
    '<div class="panel hub-player-tote-draw">'+
    '<div><span class="eyebrow dark">NEXT DRAW</span><h3>'+esc(formatted)+'</h3>'+
    '<p class="muted">'+(draw?'Draw '+esc(String(draw.draw_number))+
      ' · '+esc(String(draw.sold_tickets||0))+' entries confirmed'+
      (cutoff?' · Sales close '+esc(cutoff):''):'Awaiting the next draw')+'</p></div>'+
    '<span class="badge '+(live?'ok':'')+'">'+(live?'ENTRIES OPEN':'ENTRIES CLOSED')+'</span></div>'+
    '<div class="hub-player-tote-actions">'+
      '<a class="btn primary" href="'+esc(toteLink('club'))+'">'+
      (live?'Buy £1 tickets':'View the public Tote')+'</a>'+
      '<a class="btn" href="./tote-rules.html" target="_blank" rel="noopener noreferrer">Rules & eligibility</a>'+
    '</div>'+
    '<section class="panel hub-player-tote-personal"><div class="hub-player-tote-panel-head">'+
      '<span class="eyebrow dark">YOUR PERSONAL QR</span><h3>Bring in entries for Afon Valley</h3>'+
      '<p class="muted">Share your own QR code or link. Tickets bought through it count towards your referral total only after Lloyds payment is verified.</p></div>'+
      (personalLink?
        '<div class="hub-player-tote-share"><div class="hub-player-tote-qr" id="avfcMyToteQr" aria-label="QR code linking to your personal Afon Valley Tote page"></div>'+
        '<div class="hub-player-tote-share-details"><strong>Your own Tote link</strong>'+
        '<div class="hub-player-tote-url">'+esc(personalLink)+'</div>'+
        '<div class="hub-player-tote-share-buttons"><button type="button" class="btn primary" id="avfcToteCopy">Copy link</button>'+
        '<button type="button" class="btn" id="avfcToteShare">Share my link</button></div>'+
        '<small>Anyone can scan this QR to reach the public ticket page with your referral recorded. You do not need to collect their money or bank details.</small></div></div>'
        :'<p class="muted">Your personal referral code is not available yet. Please ask the Chair to check that your player record is linked and active.</p>')+
    '</section>'+
    '<section class="panel hub-player-tote-leaderboard" id="avfcToteLeaderboard">'+
      '<div class="hub-player-tote-panel-head"><span class="eyebrow dark">FRIENDLY COMPETITION</span>'+
      '<h3>Tote referral leaderboard</h3><p class="muted">Rankings count confirmed, paid tickets attributed to each player. No buyer or bank details are shown.</p></div>'+
      '<div class="hub-tote-board-scopes" role="group" aria-label="Leaderboard period">'+
        '<button type="button" data-hub-tote-scope="current_draw_tickets" aria-pressed="false">This draw</button>'+
        '<button type="button" data-hub-tote-scope="month_tickets" aria-pressed="false">This month</button>'+
        '<button type="button" data-hub-tote-scope="season_tickets" aria-pressed="true">Season</button></div>'+
      '<div id="avfcToteLeaderboardRows" aria-live="polite"></div>'+
      '<button type="button" class="btn hub-tote-board-more" id="avfcToteBoardMore" hidden>Show all players</button>'+
    '</section>'+
    '<p class="hub-player-tote-note">Ages 16+. Tickets are issued after a verified bank transfer. '+
    'Bank payments and prize administration remain restricted to the Chair and Treasurer. '+
    'Registration '+esc(data.registration_number||'details in rules')+'.</p></section>';

 if(personalLink){
   const qr=el.querySelector('#avfcMyToteQr');
   try{renderQr(qr,personalLink)}catch(err){console.warn('Could not render personal Tote QR',err);}
   if(qr&&!qr.querySelector('canvas,img'))qr.textContent='QR temporarily unavailable — use your link below.';
   el.querySelector('#avfcToteCopy').onclick=e=>copyText(personalLink,e.currentTarget);
   el.querySelector('#avfcToteShare').onclick=async e=>{
     if(typeof navigator.share!=='function')return copyText(personalLink,e.currentTarget);
     try{await navigator.share({title:'Afon Valley Tote',text:'Support Afon Valley FC in our weekly Tote!',url:personalLink})}
     catch(err){if(err?.name!=='AbortError')copyText(personalLink,e.currentTarget)}
   };
 }
 const boardRoot=el.querySelector('#avfcToteLeaderboardRows');
 const more=el.querySelector('#avfcToteBoardMore');
 const scopes=[...el.querySelectorAll('[data-hub-tote-scope]')];
 let scope='season_tickets',showAll=false;
 const safeBoard=leaderboard.filter(x=>x&&Number.isFinite(Number(x.player_id)));
 function updateBoard(){
   if(!boardRoot?.isConnected||tab!=='tote')return;
   scopes.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.hubToteScope===scope)));
   if(leaderboardError){
     boardRoot.innerHTML='<p class="muted">The leaderboard is temporarily unavailable. Try reopening the Tote tab.</p>';
     more.hidden=true;return;
   }
   const ranked=safeBoard.slice().sort((a,b)=>
     (Number(b[scope])||0)-(Number(a[scope])||0)||
     (Number(b.season_tickets)||0)-(Number(a.season_tickets)||0)||
     String(a.player_name||'').localeCompare(String(b.player_name||''),'en'));
   const confirmed=ranked.reduce((sum,x)=>sum+Math.max(0,Number(x[scope])||0),0);
   const me=ranked.findIndex(x=>Number(x.player_id)===Number(myPlayer));
   const visible=showAll?ranked:ranked.slice(0,10);
   boardRoot.innerHTML=(confirmed===0?'<p class="hub-tote-board-empty">Everyone starts level — no confirmed referral tickets for this period yet.</p>':'')+
     (me>=0?'<div class="hub-tote-board-myrank">Your place: <strong>#'+(me+1)+'</strong> of '+ranked.length+
       ' · <strong>'+Math.max(0,Number(ranked[me][scope])||0)+'</strong> verified tickets</div>':'')+
     (visible.length?'<div class="hub-tote-board-header"><span>#</span><span>Player</span><span>Paid tickets</span></div>'+
       visible.map((item,i)=>'<div class="hub-tote-board-row '+(Number(item.player_id)===Number(myPlayer)?'is-me':'')+'">'+
         '<span class="hub-tote-board-rank">'+(i+1)+'</span>'+
         '<span>'+esc(item.player_name||'Player')+(Number(item.player_id)===Number(myPlayer)?' <small>(you)</small>':'')+'</span>'+
         '<strong>'+Math.max(0,Number(item[scope])||0)+'</strong></div>').join(''):
       '<p class="muted">No active players on the leaderboard yet.</p>');
   more.hidden=ranked.length<=10;
   if(!more.hidden)more.textContent=showAll?'Show top 10':'Show all '+ranked.length+' players';
 }
 scopes.forEach(btn=>btn.onclick=()=>{scope=btn.dataset.hubToteScope;showAll=false;updateBoard();});
 more.onclick=()=>{showAll=!showAll;updateBoard();};
 updateBoard();
}

/* Keep payments near the top and the personal statistics immediately below availability. */
const avfcPriorHome=home;
home=async function(){
 await avfcPriorHome();
 if(!isPlayerView())return;
 const area=$('#content'),feature=area?.querySelector('.match-feature'),tiles=area?.querySelector('.dashboard-stats');
 if(!feature||!tiles)return;
 area.classList.add('hub-home-compact');
 feature.insertAdjacentElement('afterend',tiles);
 const quick=document.createElement('button');
 quick.type='button';quick.className='hub-home-match-link';quick.textContent='Matchday details, team & directions';
 feature.appendChild(quick);
 quick.onclick=()=>{tab='matchday';drawNav();render('matchday')};
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
  const windowForPolicy=window.open('','_blank');
  if(windowForPolicy){windowForPolicy.opener=null;windowForPolicy.document.title='Opening Afon Valley policy';}
  button.disabled=true;button.textContent='Opening…';
  const {data,error}=await sb.storage.from('club-documents').createSignedUrl(item.path,90);
  button.disabled=false;button.textContent='Read';
  if(error||!data?.signedUrl){
    if(windowForPolicy)windowForPolicy.close();
    return alert('This policy could not be opened. Please try again or ask the Chair.');
  }
  if(item.name==='Code of Conduct'&&typeof avfcPlayerSetupStep==='function'){
    await avfcPlayerSetupStep('policies');
  }
  if(windowForPolicy)windowForPolicy.location.replace(data.signedUrl);
  else window.location.assign(data.signedUrl);
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
 if(pick)pick.onclick=()=>{tab='availability';drawNav();render('availability').then(()=>teamPicker(match.id))};
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
