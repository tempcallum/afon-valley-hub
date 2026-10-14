/* Event RSVP access for committee officers, including non-playing officials.
   Player RSVPs use the established player RPC; non-playing officials use a
   separate profile-linked response and are never added as football players. */
const avfcEventsOriginalDetails=eventDetails;
eventDetails=async function(id){
  const officialRole=profile?.approved&&profile.role!=='player';
  const needsPersonalLayout=officialRole&&!!myPlayer&&
    !['chair','manager','social','treasurer'].includes(profile.role)&&!isPlayerView();
  if(needsPersonalLayout){
    const previous=viewMode;
    viewMode='player';
    try{
      await avfcEventsOriginalDetails(id);
      if($('#eventBody'))$('#eventBody').dataset.eventId=String(id);
    }finally{viewMode=previous;}
    return;
  }
  await avfcEventsOriginalDetails(id);
  const body=$('#eventBody');
  if(!body||tab!=='events')return;
  body.dataset.eventId=String(id);
  // Existing player personal view already has its proper RSVP and payment form.
  if(isPlayerView()&&myPlayer)return;
  if(!profile?.approved)return;

  const requestList=[
    sb.from('club_events').select('id,title,status,event_date,rsvp_deadline,price_pence').eq('id',id).maybeSingle(),
    myPlayer
      ?sb.from('event_responses').select('response,note').eq('event_id',id).eq('player_id',myPlayer).maybeSingle()
      :sb.from('event_official_responses').select('response,note').eq('event_id',id).eq('user_id',user.id).maybeSingle(),
    sb.rpc('get_event_counts',{p_event_id:id})
  ];
  if(['chair','manager','social','treasurer'].includes(profile.role)){
    requestList.push(sb.from('event_official_responses')
      .select('user_id,response,note,profiles(display_name)')
      .eq('event_id',id).order('responded_at'));
  }
  const [eventResult,myResult,countResult,allOfficialsResult]=await Promise.all(requestList);
  if(!body.isConnected||body.dataset.eventId!==String(id))return;
  const event=eventResult?.data, mine=myResult?.data;
  if(eventResult?.error||!event)return;
  const rows=countResult?.data||[];
  const stats=body.querySelector('.event-stats');
  if(stats&&rows.length){
    const labels=stats.querySelectorAll('strong');
    if(labels[0])labels[0].textContent=rows[0].yes_count+
      (event.capacity?'/'+event.capacity:'');
    if(labels[1])labels[1].textContent=rows[0].waitlist_count;
  }

  const deadlinePassed=event.rsvp_deadline&&Date.now()>new Date(event.rsvp_deadline).getTime();
  const open=event.status==='open'&&!deadlinePassed;
  const personal=document.createElement('section');
  personal.className='panel avfc-event-personal';
  personal.innerHTML='<div class="avfc-event-personal-top"><div><span class="eyebrow dark">MY ATTENDANCE</span>'+
    '<h3>Your RSVP</h3><p class="muted">'+esc(event.title)+'</p></div>'+
    '<span class="badge '+(mine?.response==='yes'?'ok':'')+'">'+esc(
      mine?.response==='yes'?'GOING':mine?.response==='maybe'?'MAYBE':
      mine?.response==='no'?'NOT GOING':mine?.response==='waitlist'?'WAITING LIST':'NOT ANSWERED')+'</span></div>'+
    (open?'<form class="avfc-event-personal-form" id="avfcPersonalRsvpForm">'+
      '<label>Can you attend?<select name="response">'+
      '<option value="yes">Yes, I am coming</option><option value="maybe">Maybe</option>'+
      '<option value="no">No, I cannot make it</option></select></label>'+
      '<label>Note (optional)<input name="note" placeholder="Anything the club should know" maxlength="500"></label>'+
      '<button type="submit" class="btn primary">Save my RSVP</button></form>':
      '<p class="muted">This event is no longer accepting new RSVP changes.</p>')+
    (!myPlayer?'<p class="avfc-event-official-note">Your RSVP is recorded as a club official, not as a football player. Event payments, if applicable, are arranged separately through the club.</p>':'')+
    '<p class="muted" id="avfcPersonalRsvpStatus" role="status" aria-live="polite"></p>';

  body.insertAdjacentElement('afterbegin',personal);
  const form=personal.querySelector('#avfcPersonalRsvpForm');
  if(form){
    form.elements.response.value=mine?.response==='waitlist'?'yes':mine?.response||'yes';
    form.elements.note.value=mine?.note||'';
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form),btn=form.querySelector('button[type="submit"]');
      const status=personal.querySelector('#avfcPersonalRsvpStatus');
      btn.disabled=true;btn.textContent='Saving…';status.textContent='';
      const {data:final,error}=await sb.rpc('respond_to_club_event',{
        p_event_id:id,p_response:String(fd.get('response')),
        p_note:String(fd.get('note')||'')
      });
      if(error){btn.disabled=false;btn.textContent='Save my RSVP';status.textContent=error.message;return;}
      await eventDetails(id);
      if(final==='waitlist'){
        const msg=$('#avfcPersonalRsvpStatus');
        if(msg)msg.textContent='This event is full. You are on the waiting list.';
      }
    };
  }

  // The management view should show officials who are not linked to a player.
  if(allOfficialsResult?.data?.length){
    const officialRows=allOfficialsResult.data;
    const panel=document.createElement('section');
    panel.className='panel avfc-event-official-list';
    panel.innerHTML='<h3>Non-playing officials</h3>'+
      '<p class="muted">These responses count towards attendance and capacity without creating false player records.</p>'+
      '<div class="list">'+officialRows.map(r=>
        '<div class="row"><span>'+esc(r.profiles?.display_name||'Club official')+'</span>'+
        '<strong>'+esc(r.response==='yes'?'Going':r.response==='no'?'Not going':r.response==='maybe'?'Maybe':'Waiting list')+
        '</strong></div>').join('')+'</div>'+
      (event.price_pence>0?'<p class="muted">Payment for non-playing officials must be reconciled separately by the Treasurer.</p>':'');
    body.insertAdjacentElement('beforeend',panel);
  }
};