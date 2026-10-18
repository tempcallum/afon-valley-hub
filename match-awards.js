
/* Club match awards: separate from official FAW COMET statistics and the fines ledger. */
function avfcAwardsSeason(date){
 const d=new Date(date);
 const year=d.getUTCFullYear()-(d.getUTCMonth()<6?1:0);
 return String(year)+'/'+String(year+1);
}
function avfcAwardsLocalDate(date){
 return new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
}
function avfcAwardsTotalsByComet(entries){
 const map=new Map();
 for(const a of entries||[]){
  if(a.comet_person_id===null||a.comet_person_id===undefined)continue;
  map.set(String(a.comet_person_id)+'|'+String(a.season),a);
 }
 return map;
}
function avfcAwardsAddCometColumns(entries){
 const table=$('#cometStatsBody .table table');
 const selector=$('#cometSeason');
 if(!table||!selector)return;
 const season=selector.value;
 const map=avfcAwardsTotalsByComet(entries);
 const heading=table.querySelector('thead tr');
 if(!heading)return;
 for(const label of ['MOTM','DOTD']){
  const th=document.createElement('th');th.className='avfc-award-col';
  th.textContent=label;th.title=label==='MOTM'?'Man of the Match (club-selected)':'Dick of the Day (club-selected)';
  heading.appendChild(th);
 }
 table.querySelectorAll('tbody tr[data-comet-person]').forEach(tr=>{
  const award=map.get(tr.dataset.cometPerson+'|'+season);
  for(const count of [award?.motm_count||0,award?.dotd_count||0]){
   const td=document.createElement('td');td.className='avfc-award-stat-cell';
   td.textContent=String(Number(count)||0);tr.appendChild(td);
  }
 });
 const note=$('#cometStatsBody>.avfc-award-stats-note');
 if(note)note.remove();
 const info=document.createElement('p');info.className='muted avfc-award-stats-note';
 info.textContent='MOTM and DOTD are club-selected awards, not official FAW COMET statistics.';
 table.parentNode.insertAdjacentElement('afterend',info);
}
function avfcAwardsPlayerOptions(players){
 const counts=new Map();
 for(const p of players)counts.set(String(p.name).trim().toLowerCase(),(counts.get(String(p.name).trim().toLowerCase())||0)+1);
 return '<option value="">Not selected</option>'+players.map(p=>{
  const duplicate=counts.get(String(p.name).trim().toLowerCase())>1;
  const suffix=(p.shirt_no?' · #'+p.shirt_no:'')+(duplicate?' · ID '+p.id:'')+(p.status==='left'?' · former player':'');
  return '<option value="'+p.id+'">'+esc(p.name+suffix)+'</option>';
 }).join('');
}
async function avfcRenderClubAwards(){
 const target=$('#content'),stats=$('#cometStatsBody'),chooser=$('#cometSeason');
 if(!target||!stats)return;
 const response=await Promise.all([
  sb.rpc('club_match_awards_summary'),
  sb.from('matches').select('id,opponent,match_date,home_away').order('match_date',{ascending:false}).limit(250),
  sb.from('players').select('id,name,status,shirt_no').order('name'),
  sb.from('match_player_awards').select('match_id,award_type,player_id').limit(500)
 ]);
 if(!target.isConnected||!stats.isConnected)return;
 const [totalsResult,matchesResult,playersResult,awardResult]=response;
 if(totalsResult.error||matchesResult.error||playersResult.error||awardResult.error){
  const panel=document.createElement('div');panel.className='panel avfc-awards-panel';
  panel.textContent='Match awards are temporarily unavailable. Please try again later.';
  target.appendChild(panel);return;
 }
 const totals=totalsResult.data||[],matches=matchesResult.data||[],players=playersResult.data||[],awards=awardResult.data||[];
 const byPlayer=new Map(players.map(p=>[Number(p.id),p]));
 const byMatch=new Map();
 for(const a of awards){
  let record=byMatch.get(Number(a.match_id));
  if(!record){record={};byMatch.set(Number(a.match_id),record)}
  record[a.award_type]=Number(a.player_id);
 }
 avfcAwardsAddCometColumns(totals);
 if(chooser)chooser.addEventListener('change',()=>{
  if(!target.isConnected)return;
  // The original COMET view replaces its table on every season change.
  requestAnimationFrame(()=>avfcAwardsAddCometColumns(totals));
 });
 const canManage=!isPlayerView()&&['chair','manager'].includes(profile.role);
 const finished=matches.filter(m=>new Date(m.match_date).getTime()<=Date.now());
 const panel=document.createElement('section');
 panel.className='panel avfc-awards-panel';
 panel.innerHTML='<div class="avfc-awards-heading">'+
  '<div><span class="eyebrow dark">CLUB MATCH AWARDS</span>'+
  '<h3>Man of the Match & Dick of the Day</h3>'+
  '<p class="muted">Chosen by the club after each match. Separate from COMET records and fines.</p></div>'+
  '<span class="avfc-awards-fixture-count">'+awards.length+' awards</span></div>'+
  (canManage?'<details class="avfc-awards-editor" '+(finished.length?'open':'')+'>'+
   '<summary>Record or change match awards</summary>'+
   (finished.length?
   '<form id="avfcAwardsForm" class="avfc-awards-form">'+
   '<label>Match<select name="match" id="avfcAwardsMatch">'+finished.map(m=>
    '<option value="'+m.id+'">'+esc(avfcAwardsLocalDate(m.match_date)+' · '+m.opponent)+'</option>').join('')+
   '</select></label>'+
   '<div class="avfc-awards-fields"><label>Man of the Match<select name="motm" id="avfcAwardsMotm">'+avfcAwardsPlayerOptions(players)+'</select></label>'+
   '<label>Dick of the Day<select name="dotd" id="avfcAwardsDotd">'+avfcAwardsPlayerOptions(players)+'</select></label></div>'+
   '<div class="avfc-awards-actions"><button type="submit" class="btn primary">Save awards</button>'+
   '<span class="muted">Both selections are optional. You can change them later.</span></div>'+
   '</form>':'<p class="muted">Once a fixture has started, it can be selected here to record the awards.</p>')+
   '</details>':'')+
  '<div class="avfc-awards-history"><h4>Recent match awards</h4>'+
  (finished.filter(m=>byMatch.has(Number(m.id))).length?
    finished.filter(m=>byMatch.has(Number(m.id))).slice(0,8).map(m=>{
     const a=byMatch.get(Number(m.id));
     const motm=byPlayer.get(a?.motm)?.name||'Not selected';
     const dotd=byPlayer.get(a?.dotd)?.name||'Not selected';
     return '<div class="avfc-awards-history-row"><div><strong>'+esc(m.opponent)+'</strong>'+
       '<small>'+esc(avfcAwardsLocalDate(m.match_date))+'</small></div>'+
       '<span><b>MOTM</b> '+esc(motm)+'</span><span><b>DOTD</b> '+esc(dotd)+'</span></div>';
    }).join(''):
    '<p class="muted">No awards recorded yet. After a match, the Chair or Manager can select the winners above.</p>')+
  '</div>'+
  (totals.length?'<details class="avfc-awards-leaderboard"><summary>View season award totals</summary>'+
   '<div id="avfcAwardLeaderBody"></div></details>':'')+
  '<p class="avfc-awards-disclaimer">Awards are manual club records. Selecting Dick of the Day does not create a fine or payment charge.</p>';
 target.appendChild(panel);
 const leaderboard=panel.querySelector('#avfcAwardLeaderBody');
 if(leaderboard){
  function leaderView(){
   const season=chooser?.value||avfcAwardsSeason(new Date()),playersForSeason=totals.filter(t=>t.season===season)
    .sort((a,b)=>Number(b.motm_count)-Number(a.motm_count)||Number(b.dotd_count)-Number(a.dotd_count)||a.player_name.localeCompare(b.player_name));
   leaderboard.innerHTML=playersForSeason.length?
    '<div class="avfc-awards-leader-row header"><span>Player</span><span>MOTM</span><span>DOTD</span></div>'+
    playersForSeason.map(a=>'<div class="avfc-awards-leader-row"><span>'+esc(a.player_name)+'</span>'+
      '<strong>'+Number(a.motm_count)+'</strong><strong>'+Number(a.dotd_count)+'</strong></div>').join(''):
    '<p class="muted">No awards for this season yet.</p>';
  }
  if(chooser)chooser.addEventListener('change',leaderView);leaderView();
 }
 const form=panel.querySelector('#avfcAwardsForm');
 if(!form)return;
 const fixture=panel.querySelector('#avfcAwardsMatch');
 const motm=panel.querySelector('#avfcAwardsMotm');
 const dotd=panel.querySelector('#avfcAwardsDotd');
 function sync(){
  const record=byMatch.get(Number(fixture.value))||{};
  motm.value=record.motm?String(record.motm):'';
  dotd.value=record.dotd?String(record.dotd):'';
 }
 fixture.onchange=sync;sync();
 form.onsubmit=async e=>{
  e.preventDefault();
  const id=Number(fixture.value),m=motm.value?Number(motm.value):null,d=dotd.value?Number(dotd.value):null;
  if(!id)return;
  const originalButton=form.querySelector('button[type=submit]');
  originalButton.disabled=true;originalButton.textContent='Saving…';
  const {error}=await sb.rpc('set_match_player_awards',{
   p_match_id:id,p_motm_player_id:m,p_dotd_player_id:d
  });
  if(error){originalButton.disabled=false;originalButton.textContent='Save awards';return alert(error.message)}
  await officialStats();
 };
}
const avfcPriorOfficialStats=officialStats;
officialStats=async function(){
 await avfcPriorOfficialStats();
 if(!profile?.approved)return;
 await avfcRenderClubAwards();
};
const avfcPriorHomeForAwards=home;
home=async function(){
 await avfcPriorHomeForAwards();
 if(!profile?.approved||!isPlayerView()||!myPlayer)return;
 const card=$('#cometPersonalCard'),grid=card?.querySelector('.comet-home-stats');
 if(!grid||!card.isConnected)return;
 const {data,error}=await sb.rpc('club_match_awards_summary');
 if(error||!card.isConnected)return;
 const current=avfcAwardsSeason(new Date());
 const seasonFromCard=card.querySelector('.comet-home-season')?.textContent?.split('·').pop()?.trim()||'';
 const season=/^\d{4}\/\d{4}$/.test(seasonFromCard)?seasonFromCard:current;
 const totals=(data||[]).find(r=>Number(r.player_id)===Number(myPlayer)&&r.season===season);
 for(const [label,count,style] of [
  ['Man of the Match',totals?.motm_count||0,'avfc-award-home-motm'],
  ['Dick of the Day',totals?.dotd_count||0,'avfc-award-home-dotd']
 ]){
  const tile=document.createElement('div');
  tile.className='comet-home-tile '+style;
  tile.innerHTML='<span>'+label+'</span><strong>'+Number(count)+'</strong>';
  grid.appendChild(tile);
 }
 const foot=card.querySelector('.comet-home-footer p');
 if(foot)foot.textContent='Club totals based on COMET with documented adjustments · Awards recorded separately';
};
