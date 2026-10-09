
/* Personal COMET statistics, always placed immediately below match availability. */
const originalHomeForComet=home;
home=async function(){
  await originalHomeForComet();
  if(!isPlayerView()||!myPlayer)return;
  const root=$('#content');
  if(!root)return;
  const availability=root.querySelector('.player-status-card');
  const dash=root.querySelector('.dashboard-stats');
  const fixture=root.querySelector('.match-feature');
  const card=document.createElement('section');
  card.className='comet-home-card';
  card.id='cometPersonalCard';
  card.setAttribute('aria-labelledby','cometPersonalTitle');
  card.innerHTML='<div class="comet-home-heading">'+
    '<div><span class="comet-home-eyebrow comet-home-season">OFFICIAL FAW COMET · 2026/27</span>'+
    '<h3 id="cometPersonalTitle">My season stats</h3><p>Your competitive football, all in one place.</p></div>'+
    '<span class="comet-home-mark" aria-label="FAW statistics">FAW<br>STATS</span>'+
    '</div><div class="comet-home-body comet-loading" id="cometPersonalContent" aria-live="polite">Loading your statistics…</div>';
  if(availability)availability.insertAdjacentElement('afterend',card);
  else if(dash)dash.insertAdjacentElement('beforebegin',card);
  else if(fixture)fixture.insertAdjacentElement('afterend',card);
  else root.appendChild(card);
  const element=card.querySelector('#cometPersonalContent');
  const {data,error}=await sb.from('comet_my_player_stats')
    .select('season,appearances,starts,goals,yellows,reds,minutes_played')
    .eq('player_id',myPlayer).order('season',{ascending:false}).limit(10);
  if(!card.isConnected||!element)return;
  if(error){
    element.textContent='Official COMET statistics are temporarily unavailable. Please try again shortly.';
    return;
  }
  const rows=(data||[]).filter(x=>x.season);
  const stats=rows[0]||(data||[])[0]||null;
  if(stats){
    const season=String(stats.season||'Current season');
    card.querySelector('.comet-home-season').textContent='OFFICIAL FAW COMET · '+season;
  }
  const tiles=[
    ['Appearances',stats?.appearances||0,'is-primary'],
    ['Goals',stats?.goals||0,'is-primary is-goals'],
    ['Starts',stats?.starts||0,''],
    ['Minutes',stats?.minutes_played||0,''],
    ['Yellow cards',stats?.yellows||0,''],
    ['Red cards',stats?.reds||0,'']
  ];
  element.classList.remove('comet-loading');
  element.innerHTML='<div class="comet-home-stats">'+
    tiles.map(([label,value,styling])=>
      '<div class="comet-home-tile '+styling+'"><span>'+esc(label)+'</span><strong>'+
      Number(value).toLocaleString('en-GB')+'</strong></div>').join('')+
    '</div>'+
    (!stats?'<p class="comet-home-empty-note">No competitive appearances are currently linked to your account. If you have not made your debut yet, these zeroes are expected. Already played? Ask the Chair to check your COMET link.</p>':'')+
    '<div class="comet-home-footer"><p>Official FAW records · Updated after the club COMET sync</p>'+
    '<button type="button" class="comet-home-view" id="cometViewSquadStats">View full stats</button></div>';
  const button=card.querySelector('#cometViewSquadStats');
  if(button)button.onclick=()=>{tab='stats';drawNav();render(tab)};
};

const chairCometPrevious=renderAdminExtras;
renderAdminExtras=async function(){
  await chairCometPrevious();
  if(profile?.role!=='chair'||isPlayerView())return;
  const [pr,lr,sr]=await Promise.all([
    sb.from('players').select('id,name,status,user_id').order('name'),
    sb.from('player_comet_links').select('player_id,comet_person_id,match_method,linked_at'),
    sb.from('comet_player_stats').select('person_id,person_name,season,appearances,goals').order('season',{ascending:false}).limit(500)
  ]);
  if(pr.error||lr.error||sr.error){
    $('#content').insertAdjacentHTML('beforeend','<div class="panel"><h3>COMET Player Links</h3><p>Could not load the matching panel. Please try again later.</p></div>');
    return;
  }
  const clubPlayers=pr.data||[],links=lr.data||[],latestById=new Map();
  for(const entry of sr.data||[]){if(!latestById.has(entry.person_id))latestById.set(entry.person_id,entry)}
  const cometPeople=[...latestById.values()].sort((a,b)=>a.person_name.localeCompare(b.person_name,'en'));
  const linkedByPlayer=new Map(links.map(x=>[x.player_id,x]));
  const linkedByComet=new Map(links.map(x=>[x.comet_person_id,x.player_id]));
  const matched=links.length,unmatched=clubPlayers.length-matched;
  const box='<div class="panel"><span class="eyebrow dark">OFFICIAL FAW RECORDS</span>'+
    '<div class="head"><div><h3>COMET Player Links</h3><p class="muted">'+matched+' linked Hub players · '+unmatched+' awaiting matching. Exact unique names were linked automatically, but please check them against official COMET IDs.</p></div></div>'+
    '<details id="cometPlayerLinkDetails"><summary style="cursor:pointer;font-weight:bold;padding:12px 0">Review / match individual players</summary>'+
    '<p class="muted">Select the right COMET player for each Hub player, then press Save link. A COMET ID cannot be linked to more than one Hub player. Unmatched players will see a message rather than another person’s statistics.</p>'+
    '<label>Show players<select id="cometLinkFilter"><option value="unmatched">Unmatched players</option><option value="all">All players</option><option value="matched">Matched players</option></select></label>'+
    '<div id="cometLinkRows" class="list"></div></details></div>';
  $('#content').insertAdjacentHTML('beforeend',box);
  const list=$('#cometLinkRows'),filter=$('#cometLinkFilter');
  const draw=()=>{
    const subset=clubPlayers.filter(player=>{
      const has=linkedByPlayer.has(player.id);
      return filter.value==='all'||(filter.value==='matched'?has:!has);
    });
    if(!subset.length){list.innerHTML='<div class="empty">No players in this group.</div>';return}
    list.innerHTML=subset.map(player=>{
      const current=linkedByPlayer.get(player.id);
      const info=current?latestById.get(current.comet_person_id):null;
      const choices=cometPeople.map(person=>{
        const used=linkedByComet.get(person.person_id);
        const disabled=used!==undefined&&used!==player.id;
        return '<option value="'+person.person_id+'" '+(current?.comet_person_id===person.person_id?'selected ':'')+
          (disabled?'disabled ':'')+'>'+esc(person.person_name)+' · COMET #'+person.person_id+
          (disabled?' (linked)':'')+'</option>';
      }).join('');
      return '<div class="row" style="display:block;padding:12px 0"><strong>'+esc(player.name)+'</strong>'+
        '<p class="muted" style="margin:3px 0 8px">'+(current?'Linked to '+esc(info?.person_name||'#'+current.comet_person_id)+' · '+(current.match_method==='unique_exact_name'?'Exact-name match':'Chair confirmed'):'Not linked — no personal stats yet')+'</p>'+
        '<div class="actions" style="align-items:end"><label style="flex:1;min-width:180px">COMET player<select data-comet-player="'+player.id+'"><option value="">Choose COMET player…</option>'+choices+'</select></label>'+
        '<button class="btn primary" data-comet-save="'+player.id+'">Save link</button>'+
        (current?'<button class="btn" data-comet-unlink="'+player.id+'">Unlink</button>':'')+'</div></div>';
    }).join('');
    list.querySelectorAll('[data-comet-save]').forEach(button=>button.onclick=async()=>{
      const player=clubPlayers.find(p=>p.id===Number(button.dataset.cometSave));
      const id=Number(list.querySelector('[data-comet-player="'+player.id+'"]')?.value||0);
      if(!id)return alert('Choose the correct COMET player first.');
      const chosen=latestById.get(id);
      if(!confirm('Link '+player.name+' to COMET player '+chosen.person_name+' (ID '+id+')? Please verify they are the same person.'))return;
      button.disabled=true;
      const {error}=await sb.rpc('chair_link_comet_player',{p_player_id:player.id,p_comet_person_id:id});
      if(error){button.disabled=false;return alert(error.message)}
      admin();
    });
    list.querySelectorAll('[data-comet-unlink]').forEach(button=>button.onclick=async()=>{
      const player=clubPlayers.find(p=>p.id===Number(button.dataset.cometUnlink));
      if(!confirm('Disconnect COMET statistics from '+player.name+'? No official statistics will be deleted.'))return;
      button.disabled=true;
      const {error}=await sb.rpc('chair_unlink_comet_player',{p_player_id:player.id});
      if(error){button.disabled=false;return alert(error.message)}
      admin();
    });
  };
  filter.onchange=draw;draw();
};
