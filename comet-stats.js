
/* Afon Valley official COMET statistics. Report credentials never enter browser code. */
const originalHubAllowed=allowed;
allowed=function(){
 const a=originalHubAllowed();
 if(profile?.approved&&!a.includes('stats'))a.push('stats');
 return a;
};
labels.stats='Player Stats';

async function officialStats(){
 const node=$('#content');
 node.innerHTML='<div class="panel"><span class="eyebrow dark">OFFICIAL FAW COMET</span><h3>Player statistics</h3><p class="muted">Appearances, goals, minutes and disciplinary totals from COMET reports. Data refreshes when the club synchronises the report.</p><div id="cometSeasonChooser"></div><div id="cometStatsBody" class="empty">Loading official stats…</div></div>';
 const {data,error}=await sb.from('comet_player_stats').select('person_id,person_name,season,appearances,starts,goals,yellows,second_yellows,reds,minutes_played,last_match').order('goals',{ascending:false}).limit(500);
 const target=$('#cometStatsBody'),chooser=$('#cometSeasonChooser');
 if(!target)return;
 if(error){target.textContent='Unable to load statistics. Please try again later.';return;}
 const rows=data||[];
 if(!rows.length){
   target.innerHTML='<div class="empty"><h3>No COMET statistics imported yet</h3><p>The secure importer is ready. The Chair still needs to store the COMET API key in Supabase and complete the first synchronisation.</p></div>';
   return;
 }
 const seasons=[...new Set(rows.map(x=>x.season||'Unspecified'))].sort().reverse();
 chooser.innerHTML='<label>Season<select id="cometSeason">'+seasons.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('')+'</select></label>';
 function display(){
   const season=$('#cometSeason').value,selected=rows.filter(x=>(x.season||'Unspecified')===season);
   const appearances=selected.reduce((a,x)=>a+Number(x.appearances||0),0);
   const goals=selected.reduce((a,x)=>a+Number(x.goals||0),0);
   const yellows=selected.reduce((a,x)=>a+Number(x.yellows||0),0);
   const reds=selected.reduce((a,x)=>a+Number(x.reds||0),0);
   target.classList.remove('empty');
   target.innerHTML='<div class="dashboard-stats"><div class="metric"><span>PLAYERS</span><strong>'+selected.length+'</strong></div><div class="metric"><span>PLAYER APPEARANCES</span><strong>'+appearances+'</strong></div><div class="metric"><span>PLAYER GOALS</span><strong>'+goals+'</strong></div><div class="metric"><span>YELLOW / RED</span><strong>'+yellows+' / '+reds+'</strong></div></div>'+
     '<div class="table"><table><thead><tr><th>Player</th><th>Apps</th><th>Starts</th><th>Goals</th><th>Yellows</th><th>Reds</th><th>Minutes</th></tr></thead><tbody>'+
     selected.map(x=>'<tr><td><strong>'+esc(x.person_name)+'</strong></td><td>'+Number(x.appearances||0)+'</td><td>'+Number(x.starts||0)+'</td><td>'+Number(x.goals||0)+'</td><td>'+Number(x.yellows||0)+'</td><td>'+Number(x.reds||0)+'</td><td>'+Number(x.minutes_played||0)+'</td></tr>').join('')+
     '</tbody></table></div><p class="muted">Official appearance-record totals only. League standings and match-event statistics will follow when those COMET report formats have been checked.</p>';
 }
 $('#cometSeason').onchange=display;display();
}
const originalHubRender=render;
render=async function(next){if(next==='stats')return officialStats();return originalHubRender(next)};

const previousAdminExtrasForComet=renderAdminExtras;
renderAdminExtras=async function(){
 await previousAdminExtrasForComet();
 if(profile?.role!=='chair'||isPlayerView())return;
 $('#content').insertAdjacentHTML('beforeend',
  '<div class="panel"><span class="eyebrow dark">FAW COMET DATA</span><h3>Official statistics import</h3><p class="muted">Keep each COMET report code in Supabase Edge Function Secrets. Never enter your API codes on this screen or share them in WhatsApp.</p>'+
  '<p id="cometAdminStatus" class="muted">Checking secure importer…</p><div class="actions"><button class="btn primary" id="cometSyncButton" disabled>Synchronise Player Appearances</button><button class="btn" id="cometRefreshStatus">Refresh status</button></div>'+
  '<p class="muted">Saved-report API codes for Matches, Match Events and Competition Standings can be added after their report fields have been verified. Only Player Appearances is connected so far.</p></div>');
 const statusNode=$('#cometAdminStatus'),btn=$('#cometSyncButton');
 async function status(){
   if(!statusNode)return;
   const {data,error}=await sb.functions.invoke('comet-import-appearances',{body:{action:'status'}});
   if(error||!data||data.error){statusNode.textContent='Could not check COMET importer. Sign in again or try later.';btn.disabled=true;return}
   const a=(data.reports||[]).find(x=>x.report_key==='appearances');
   const configured=Boolean(data.appearanceConfigured);
   statusNode.innerHTML=(configured?'<strong>API secret configured</strong>':'<strong>API secret not configured</strong>')+' · Last successful sync: '+(a?.last_success_at?esc(new Date(a.last_success_at).toLocaleString('en-GB')):'Never')+' · Records: '+Number(a?.synced_rows||0)+
     (a?.status==='error'?'<p class="muted">Last error: '+esc(a.error_message||'Unknown')+'</p>':'');
   btn.disabled=!configured;
 }
 btn.onclick=async()=>{
   if(!confirm('Import the saved Afon Valley Player Appearances report from COMET now?'))return;
   btn.disabled=true;btn.textContent='Importing…';
   const {data,error}=await sb.functions.invoke('comet-import-appearances',{body:{action:'sync_appearances'}});
   if(error||data?.error)alert('COMET import could not complete: '+(data?.error||error.message));
   else alert('Player Appearances imported: '+Number(data.imported||0)+' club records.');
   btn.textContent='Synchronise Player Appearances';await status();
 };
 $('#cometRefreshStatus').onclick=status;
 await status();
};
