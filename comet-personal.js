
/* Personal Afon Valley COMET stats and Chair-verified identity matching. */
const originalHomeForComet=home;
home=async function(){
  await originalHomeForComet();
  if(!isPlayerView()||!myPlayer)return;
  const root=$('#content'),feature=root?.querySelector('.match-feature');
  if(!root||!feature)return;
  feature.insertAdjacentHTML('afterend',
    '<section class="panel" id="cometPersonalCard" style="margin-top:12px">'+
    '<div class="head"><div><span class="eyebrow dark">OFFICIAL FAW COMET · 2026/27</span><h3>My football stats</h3></div>'+
    '<span class="badge">COMET</span></div><div id="cometPersonalContent" class="empty">Loading your match statistics…</div></section>');
  const element=$('#cometPersonalContent');
  const {data,error}=await sb.from('comet_my_player_stats')
    .select('season,appearances,starts,goals,own_goals,yellows,second_yellows,reds,minutes_played,last_match,person_name')
    .eq('player_id',myPlayer).order('season',{ascending:false}).limit(10);
  if(!element||!element.isConnected)return;
  if(error){
    element.innerHTML='<p>Could not load your COMET stats right now. Please try again later.</p>';return;
  }
  const values=(data||[]).filter(x=>x.season);
  const stats=values[0]||(data||[])[0];
  if(!stats){
    element.innerHTML='<p class="muted">Your official COMET record has not been matched to your Hub player account yet. The Chair can connect it in Admin → COMET Player Links.</p>';
    return;
  }
  const vals=[
   ['Appearances',stats.appearances],['Starts',stats.starts],['Goals',stats.goals],
   ['Minutes',stats.minutes_played],['Yellow cards',stats.yellows],['Red cards',stats.reds]
  ];
  const prettySeason=String(stats.season||'Current season').replace(/^(\d{4})\/(\d{4})$/,'$1/$2');
  $('#cometPersonalCard .eyebrow').textContent='OFFICIAL FAW COMET · '+prettySeason;
  element.classList.remove('empty');
  element.innerHTML='<div class="dashboard-stats comet-personal-grid" style="margin-bottom:12px">'+
   vals.map(([label,v])=>'<div class="metric"><span>'+esc(label)+'</span><strong>'+Number(v||0).toLocaleString('en-GB')+'</strong></div>').join('')+
   '</div><div class="actions"><button class="btn" id="cometViewSquadStats">View full player stats</button></div>'+
   '<p class="muted" style="margin-top:10px">Official FAW appearance records. Updated when COMET syncs with the club. Not all competitions record assists or every match event.</p>';
  const btn=$('#cometViewSquadStats');
  if(btn)btn.onclick=()=>{tab='stats';drawNav();render(tab)};
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
