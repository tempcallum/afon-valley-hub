/* Chair dashboard for COMET Match Events assist import; never expose the report API secret. */
const avfcPreviousStatsForEventStatus=officialStats;
officialStats=async function(){
  await avfcPreviousStatsForEventStatus();
  if(!profile?.approved||isPlayerView()||profile.role!=='chair'||tab!=='stats')return;
  const root=document.querySelector('#content');
  if(!root||!root.isConnected)return;
  const section=document.createElement('section');
  section.className='panel avfc-comet-event-health';
  section.innerHTML='<span class="eyebrow dark">FAW COMET MATCH EVENTS</span>'+
    '<h3>Automatic assists</h3>'+
    '<p class="muted">Assists are imported from goal events. Player appearances and match results are kept separate. Manual assists are retained for missing records or friendlies.</p>'+
    '<div class="avfc-comet-event-status" id="avfcCometEventsHealth" role="status">Checking COMET Match Events…</div>'+
    '<div class="actions"><button type="button" class="btn primary" id="avfcEventsSyncNow">Synchronise assists now</button>'+
    '<button type="button" class="btn" id="avfcEventsRefresh">Check connection</button></div>';
  root.appendChild(section);
  const status=section.querySelector('#avfcCometEventsHealth');
  const sync=section.querySelector('#avfcEventsSyncNow');
  const refresh=section.querySelector('#avfcEventsRefresh');
  async function load(){
    const {data,error}=await sb.functions.invoke('comet-import-events',{body:{action:'status'}});
    if(!section.isConnected)return;
    if(error||data?.error||!data){
      status.textContent='Unable to read the COMET connection status. Please try again.';
      return;
    }
    const record=data.status||{},linked=Number(data.linkedAssists||0);
    const completed=record.last_success_at?new Date(record.last_success_at).toLocaleString('en-GB',{
      timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
    }):'Never';
    const ok=data.configured&&record.status==='success';
    status.innerHTML='<strong>'+(ok?'Connected and synchronising':'Not yet successfully synchronised')+'</strong>'+
      '<div class="avfc-comet-event-facts">'+
        '<div><span>Goal events</span><strong>'+Number(data.goalEvents||0)+'</strong></div>'+
        '<div><span>Assists found</span><strong>'+Number(data.assistsFound||0)+'</strong></div>'+
        '<div><span>Linked assists</span><strong>'+linked+'</strong></div>'+
      '</div>'+
      '<p class="muted">Last successful sync: '+esc(completed)+'</p>'+
      (Number(data.unlinkedAssists||0)>0?'<p class="muted">There '+(Number(data.unlinkedAssists)===1?'is ':'are ')+Number(data.unlinkedAssists)+' assist'+(Number(data.unlinkedAssists)===1?'':'s')+' awaiting a player COMET link. Check Chair Admin → COMET Player Links.</p>':'')+
      (record.status==='error'?'<p class="muted">Last sync failed: '+esc(record.error_message||'Unknown error')+'</p>':'');
  }
  refresh.onclick=load;
  sync.onclick=async()=>{
    if(!confirm('Import the latest COMET Match Events and update linked player assists now?'))return;
    sync.disabled=true;sync.textContent='Synchronising…';
    const {data,error}=await sb.functions.invoke('comet-import-events',{body:{action:'sync_events'}});
    if(!section.isConnected)return;
    if(error||data?.error){
      alert('COMET assists import could not finish: '+(data?.error||error?.message||'Unknown error'));
      sync.disabled=false;sync.textContent='Synchronise assists now';
      await load();return;
    }
    await officialStats();
  };
  await load();
};