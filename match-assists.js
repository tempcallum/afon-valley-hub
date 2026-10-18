/* COMET Match Events assists with manual club corrections and friendly-match fallback. */
let avfcAssistsLastMatch=null;
function avfcAssistsMaps(entries){
  const comet=new Map(),players=new Map();
  for(const row of entries||[]){
    const season=String(row.season||'');
    const n=Number(row.assists_count);
    if(!Number.isFinite(n))continue;
    players.set(String(row.player_id)+'|'+season,n);
    if(row.comet_person_id!==null && row.comet_person_id!==undefined){
      comet.set(String(row.comet_person_id)+'|'+season,n);
    }
  }
  return {comet,players};
}
function avfcAssistsValue(count){
  return count===undefined?'—':String(count);
}
function avfcAssistsEnhanceSquad(entries,loadError){
  const root=document.querySelector('#cometStatsBody');
  const table=root?.querySelector('.table table');
  const season=document.querySelector('#cometSeason')?.value;
  if(!table||!season||table.querySelector('.avfc-assists-col'))return;
  const heading=table.querySelector('thead tr');
  const goalHeading=[...heading?.children||[]].find(th=>th.textContent.trim()==='Goals');
  if(!goalHeading)return;
  const map=avfcAssistsMaps(entries).comet;
  const th=document.createElement('th');
  th.className='avfc-assists-col';th.textContent='Assists';
  th.title='Assists from COMET Match Events, with club-entered corrections when needed';
  goalHeading.insertAdjacentElement('afterend',th);
  table.querySelectorAll('tbody tr[data-comet-person]').forEach(tr=>{
    const cell=document.createElement('td');
    cell.className='avfc-assists-stat-cell';
    const count=map.get(tr.dataset.cometPerson+'|'+season);
    cell.textContent=avfcAssistsValue(count);
    cell.title=count===undefined?'No assists recorded yet for this player':'COMET assists and club-entered corrections';
    if(tr.children[4])tr.insertBefore(cell,tr.children[4]);
    else tr.appendChild(cell);
  });
  const metrics=root.querySelector('.dashboard-stats');
  const goals=[...metrics?.querySelectorAll('.metric')||[]].find(x=>x.querySelector('span')?.textContent.trim()==='PLAYER GOALS');
  if(goals&&!metrics.querySelector('.avfc-assists-metric')){
    const matched=(entries||[]).filter(x=>x.season===season);
    const metric=document.createElement('div');metric.className='metric avfc-assists-metric';
    const label=document.createElement('span');label.textContent='CLUB ASSISTS';
    const strong=document.createElement('strong');
    strong.textContent=matched.length?matched.reduce((n,x)=>n+Number(x.assists_count||0),0).toLocaleString('en-GB'):'—';
    metric.append(label,strong);
    goals.insertAdjacentElement('afterend',metric);
  }
  root.querySelector('.avfc-assists-note')?.remove();
  const note=document.createElement('p');note.className='muted avfc-assists-note';
  note.textContent=loadError?'Club assists are temporarily unavailable. Official COMET statistics are unaffected.':
    'Assists come from FAW COMET Match Events where available, with club-entered assists for missing records. A dash means no assist data is recorded yet.';
  table.closest('.table')?.insertAdjacentElement('afterend',note);
}
function avfcAssistsPlayerOptions(players){
  return '<option value="">Choose player…</option>'+players.map(p=>
    '<option value="'+Number(p.id)+'">'+esc(p.name+(p.status==='left'?' (former player)':''))+'</option>').join('');
}
async function avfcAssistsEditor(){
  if(isPlayerView()||!profile?.approved||!['chair','manager'].includes(profile.role))return;
  const node=document.querySelector('#content');
  if(!node||tab!=='stats')return;
  const [mRes,pRes,aRes]=await Promise.all([
    sb.from('matches').select('id,match_date,opponent').order('match_date',{ascending:false}).limit(250),
    sb.from('players').select('id,name,status').order('name'),
    sb.from('match_player_assists').select('match_id,player_id,assists').limit(5000)
  ]);
  if(!node.isConnected||tab!=='stats')return;
  const panel=document.createElement('section');panel.className='panel avfc-assists-panel';
  if(mRes.error||pRes.error||aRes.error){
    panel.innerHTML='<h3>Record match assists</h3><p class="muted">Assist records are currently unavailable. Please try again.</p>';
    node.appendChild(panel);return;
  }
  const matches=(mRes.data||[]).filter(m=>Date.parse(m.match_date)<=Date.now());
  const players=pRes.data||[],records=aRes.data||[];
  panel.innerHTML='<details class="avfc-assists-editor"><summary>Record match assists</summary>'+
    '<p class="muted">Record manual assists for friendlies or missing COMET records. These count on the player home screen and squad statistics. If you enter a manual value for the same player and fixture, it replaces that player’s COMET assists for that fixture to avoid duplicates.</p>'+
    (!matches.length?'<p class="muted">No completed matches to record yet.</p>':
     '<form id="avfcAssistsForm" class="form">'+
       '<label>Match<select id="avfcAssistMatch">'+matches.map(m=>
         '<option value="'+Number(m.id)+'">'+esc(new Date(m.match_date).toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'})+' · '+m.opponent)+'</option>').join('')+'</select></label>'+
       '<div class="avfc-assists-fields">'+
         '<label>Player<select id="avfcAssistPlayer">'+avfcAssistsPlayerOptions(players)+'</select></label>'+
         '<label>Number of assists<input id="avfcAssistCount" type="number" min="0" max="50" step="1" value="0" required></label>'+
       '</div>'+
       '<p class="muted">Select a player to edit any previous entry. Enter 0 to remove an existing assist record.</p>'+
       '<button type="submit" class="btn primary">Save assists</button>'+
       '</form><div id="avfcAssistMatchRecords" class="avfc-assists-match-records"></div>')+
    '</details>';
  node.appendChild(panel);
  const form=panel.querySelector('#avfcAssistsForm');
  if(!form)return;
  const matchSelect=panel.querySelector('#avfcAssistMatch');
  const playerSelect=panel.querySelector('#avfcAssistPlayer');
  const countInput=panel.querySelector('#avfcAssistCount');
  const existing=panel.querySelector('#avfcAssistMatchRecords');
  const nameById=new Map(players.map(x=>[Number(x.id),x.name]));
  if(avfcAssistsLastMatch&&matches.some(m=>Number(m.id)===avfcAssistsLastMatch))matchSelect.value=String(avfcAssistsLastMatch);
  const lookup=()=>records.find(r=>Number(r.match_id)===Number(matchSelect.value)&&Number(r.player_id)===Number(playerSelect.value));
  const showPlayer=()=>{countInput.value=String(lookup()?.assists||0)};
  function showMatch(){
    avfcAssistsLastMatch=Number(matchSelect.value);
    playerSelect.value='';
    countInput.value='0';
    const selected=records.filter(r=>Number(r.match_id)===Number(matchSelect.value)).sort((a,b)=>nameById.get(Number(a.player_id))?.localeCompare(nameById.get(Number(b.player_id))||'')||0);
    existing.innerHTML=selected.length?
      '<strong>Already recorded for this match</strong><div class="list">'+selected.map(r=>
        '<div class="row"><span>'+esc(nameById.get(Number(r.player_id))||'Former player')+'</span><strong>'+Number(r.assists)+' assist'+(Number(r.assists)===1?'':'s')+'</strong></div>').join('')+'</div>':
      '<p class="muted">No assists recorded for this fixture yet.</p>';
  }
  matchSelect.onchange=showMatch;
  playerSelect.onchange=showPlayer;
  showMatch();
  form.onsubmit=async e=>{
    e.preventDefault();
    const match_id=Number(matchSelect.value),player_id=Number(playerSelect.value),assists=Number(countInput.value);
    if(!match_id||!player_id)return alert('Please select a match and player.');
    if(!Number.isInteger(assists)||assists<0||assists>50)return alert('Enter a whole number of assists between 0 and 50.');
    const button=form.querySelector('[type="submit"]');
    button.disabled=true;button.textContent='Saving…';
    let error;
    if(assists===0){
      ({error}=await sb.from('match_player_assists').delete().eq('match_id',match_id).eq('player_id',player_id));
    }else{
      ({error}=await sb.from('match_player_assists').upsert({
        match_id,player_id,assists,updated_by:user.id,updated_at:new Date().toISOString()
      },{onConflict:'match_id,player_id'}));
    }
    if(error){button.disabled=false;button.textContent='Save assists';return alert(error.message)}
    avfcAssistsLastMatch=match_id;
    await officialStats();
  };
}
const avfcOfficialBeforeAssists=officialStats;
officialStats=async function(){
  await avfcOfficialBeforeAssists();
  if(!profile?.approved||tab!=='stats'||!document.querySelector('#cometStatsBody'))return;
  const result=await sb.rpc('club_match_assists_summary');
  if(tab!=='stats')return;
  const totals=result.error?[]:result.data||[];
  avfcAssistsEnhanceSquad(totals,result.error);
  const season=document.querySelector('#cometSeason');
  if(season)season.addEventListener('change',()=>{
    requestAnimationFrame(()=>avfcAssistsEnhanceSquad(totals,result.error));
  });
  await avfcAssistsEditor();
};
const avfcHomeBeforeAssists=home;
home=async function(){
  await avfcHomeBeforeAssists();
  if(!profile?.approved||!isPlayerView()||!myPlayer)return;
  const card=document.querySelector('#cometPersonalCard');
  const grid=card?.querySelector('.comet-home-stats');
  if(!card?.isConnected||!grid||grid.querySelector('.avfc-assists-home-tile'))return;
  const result=await sb.rpc('club_match_assists_summary');
  if(!card.isConnected||!grid.isConnected)return;
  const seasonText=card.querySelector('.comet-home-season')?.textContent?.split('·').pop()?.trim()||'';
  const season=/^\d{4}\/\d{4}$/.test(seasonText)?seasonText:avfcAwardsSeason(new Date());
  const count=result.error?undefined:avfcAssistsMaps(result.data).players.get(String(myPlayer)+'|'+season);
  const goals=[...grid.querySelectorAll('.comet-home-tile')].find(x=>x.querySelector('span')?.textContent.trim()==='Goals');
  if(!goals)return;
  const tile=document.createElement('div');
  tile.className='comet-home-tile avfc-assists-home-tile';
  tile.innerHTML='<span>Assists</span><strong>'+avfcAssistsValue(count)+'</strong>';
  tile.title=count===undefined?'No club assists recorded yet':'Club-recorded assists';
  goals.insertAdjacentElement('afterend',tile);
  const footer=card.querySelector('.comet-home-footer p');
  if(footer)footer.textContent='Official COMET stats and Match Events assists · Club awards recorded separately';
};