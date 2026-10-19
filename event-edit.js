/* Afon Valley Hub — edit existing club events.
   Wraps the established event screens; preserves RSVPs, finance, tasks and attachments.
   The underlying club_events UPDATE RLS remains the source of permission enforcement. */
(function(){
  const editableRoles=new Set(['chair','manager','social']);
  const canEdit=()=>Boolean(profile?.approved&&!isPlayerView()&&editableRoles.has(profile.role));
  const pound=p=>Number(Number(p||0)/100).toFixed(2);
  const asLocal=val=>{
    if(!val)return '';
    const d=new Date(val);
    if(!Number.isFinite(d.getTime()))return '';
    const pad=x=>String(x).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  };
  const present=val=>val==null?'':String(val);
  const showError=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','alert')}};
  const previousEventDetails=eventDetails;

  async function editEvent(id){
    if(!canEdit())return;
    const body=$('#eventBody');
    if(!body||tab!=='events')return;
    let result=await sb.from('club_events').select('*').eq('id',id).maybeSingle();
    if(result.error||!result.data){alert('Could not load this event. Please refresh and try again.');return;}
    const current=result.data;
    const prev=body.querySelector('#avfcEventEditPanel');
    if(prev)prev.remove();
    const panel=document.createElement('section');
    panel.className='panel avfc-event-edit-panel';
    panel.id='avfcEventEditPanel';
    panel.dataset.eventId=String(id);
    panel.innerHTML=
      '<div class="head"><div><span class="eyebrow dark">EVENT MANAGEMENT</span>'+
      '<h3>Edit event</h3><p class="muted">Changes update this event only. Existing replies, payments, files and tasks remain attached.</p></div>'+
      '<button type="button" class="btn" id="avfcCancelEventEditTop">Cancel</button></div>'+
      '<form id="avfcEventEditForm" class="form">'+
        '<label>Event name<input type="text" name="title" maxlength="160" required></label>'+
        '<div class="form-grid">'+
          '<label>Date and time<input type="datetime-local" name="event_date" required></label>'+
          '<label>RSVP deadline (optional)<input type="datetime-local" name="rsvp_deadline"></label>'+
          '<label>Price per person (£)<input type="number" name="price" min="0" max="25000" step="0.01" required></label>'+
          '<label>Maximum places (optional)<input type="number" name="capacity" min="1" step="1" placeholder="No limit"></label>'+
          '<label>Event status<select name="status"><option value="open">Open for RSVPs</option><option value="closed">Closed to RSVPs</option><option value="cancelled">Cancelled</option></select></label>'+
        '</div>'+
        '<label>Venue or location<input type="text" name="venue" maxlength="300"></label>'+
        '<label>Event details<textarea name="description" rows="4" maxlength="6000" placeholder="What everyone should know about the event"></textarea></label>'+
        '<label class="tote-terms"><input type="checkbox" name="waitlist"><span>Allow a waiting list if places are full</span></label>'+
        ((current.recurrence_parent_id||current.recurrence_rule)?
          '<p class="avfc-event-edit-tip"><strong>Recurring event:</strong> this edits the selected occurrence only; other dates in the series will not change.</p>':'')+
        '<p class="avfc-event-edit-tip">Changing the date or venue does not automatically modify calendars already downloaded by members. Let attendees know about important changes.</p>'+
        '<p id="avfcEventEditMessage" class="muted" role="status" aria-live="polite"></p>'+
        '<div class="actions"><button type="submit" class="btn primary" id="avfcEventEditSave">Save event changes</button>'+
        '<button type="button" class="btn" id="avfcCancelEventEdit">Cancel</button></div>'+
      '</form>';
    body.insertAdjacentElement('afterbegin',panel);
    const f=panel.querySelector('#avfcEventEditForm'),message=panel.querySelector('#avfcEventEditMessage');
    f.elements.title.value=present(current.title);
    f.elements.event_date.value=asLocal(current.event_date);
    f.elements.rsvp_deadline.value=asLocal(current.rsvp_deadline);
    f.elements.price.value=pound(current.price_pence);
    f.elements.capacity.value=present(current.capacity);
    f.elements.status.value=current.status||'open';
    f.elements.venue.value=present(current.venue);
    f.elements.description.value=present(current.description);
    f.elements.waitlist.checked=current.waitlist_enabled!==false;
    const close=()=>panel.remove();
    panel.querySelector('#avfcCancelEventEdit').onclick=close;
    panel.querySelector('#avfcCancelEventEditTop').onclick=close;
    panel.scrollIntoView({behavior:'smooth',block:'start'});

    f.onsubmit=async e=>{
      e.preventDefault();
      if(!canEdit()){showError(message,'You no longer have event editing permission.');return}
      const data=new FormData(f);
      const title=String(data.get('title')||'').trim().replace(/\s+/g,' ');
      const rawDate=String(data.get('event_date')||''),rawDeadline=String(data.get('rsvp_deadline')||'');
      const date=new Date(rawDate),deadline=rawDeadline?new Date(rawDeadline):null;
      const priceText=String(data.get('price')||'').trim();
      const price=Number(priceText);
      const capacityText=String(data.get('capacity')||'').trim();
      const capacity=capacityText===''?null:Number(capacityText);
      const status=String(data.get('status')||'');
      if(title.length<2||title.length>160){showError(message,'Enter an event name between 2 and 160 characters.');return}
      if(!Number.isFinite(date.getTime())||!rawDate){showError(message,'Choose a valid event date and time.');return}
      if(deadline&&(!Number.isFinite(deadline.getTime())||deadline.getTime()>date.getTime())){
        showError(message,'RSVP deadline must be a valid date no later than the event.');return;
      }
      if(!/^\d+(?:\.\d{1,2})?$/.test(priceText)||!Number.isFinite(price)||price>25000){
        showError(message,'Enter a valid non-negative price in pounds, up to 2 decimal places.');return;
      }
      if(capacity!==null&&(!Number.isSafeInteger(capacity)||capacity<1||capacity>100000)){
        showError(message,'Capacity must be a positive whole number, or leave it blank.');return;
      }
      if(!['open','closed','cancelled'].includes(status)){showError(message,'Choose a valid event status.');return}
      const btn=panel.querySelector('#avfcEventEditSave');
      btn.disabled=true;btn.textContent='Checking changes…';message.textContent='';
      try{
        const [{data:counts,error:countError},{count:paymentCount,error:paymentError}]=await Promise.all([
          sb.rpc('get_event_counts',{p_event_id:id}),
          sb.from('event_payments').select('id',{count:'exact',head:true}).eq('event_id',id).eq('status','paid')
        ]);
        if(countError||paymentError)throw Error('Could not check RSVPs and payments. Try again before saving.');
        const r=counts?.[0]||{},yes=Number(r.yes_count||0);
        if(capacity!==null&&capacity<yes)throw Error('This event already has '+yes+' confirmed attendees. Capacity cannot be lower than that.');
        const newPrice=Math.round(price*100);
        if(newPrice!==Number(current.price_pence||0)&&Number(paymentCount||0)>0)
          throw Error('Payments have already been collected. Price changes need a separate refund or adjustment process; other event details can still be edited.');
        if(status==='cancelled'&&Number(paymentCount||0)>0&&!confirm(
          'Payments have already been collected. Cancelling this event will NOT refund anyone automatically. Do you still want to mark the event cancelled?'))return;
        const payload={
          title,event_date:date.toISOString(),
          rsvp_deadline:deadline?deadline.toISOString():null,
          venue:String(data.get('venue')||'').trim()||null,
          description:String(data.get('description')||'').trim()||null,
          price_pence:newPrice,capacity,
          waitlist_enabled:data.get('waitlist')==='on',
          status
        };
        btn.textContent='Saving…';
        const {data:saved,error:saveError}=await sb.rpc('update_club_event_details',{
          p_event_id:id,p_expected_updated_at:current.updated_at,
          p_title:payload.title,p_event_date:payload.event_date,
          p_rsvp_deadline:payload.rsvp_deadline,p_venue:payload.venue,
          p_description:payload.description,p_price_pence:payload.price_pence,
          p_capacity:payload.capacity,p_waitlist_enabled:payload.waitlist_enabled,
          p_status:payload.status
        });
        if(saveError)throw Error(saveError.message);
        if(!saved||!['updated','unchanged'].includes(saved.status))throw Error('Could not confirm that the event was saved.');
        await events();
        if($('#eventBody'))await eventDetails(id);
        const confirmation=$('#eventBody');
        if(confirmation){
          const note=document.createElement('div');
          note.className='success-note avfc-event-edit-success';
          note.setAttribute('role','status');
          note.textContent=saved.status==='unchanged'?
            'No event details needed changing. Existing records are unchanged.':
            'Event updated. Existing RSVPs, payments, attachments and tasks were preserved.';
          confirmation.insertAdjacentElement('afterbegin',note);
        }
      }catch(error){
        showError(message,error?.message||'Could not save event. Try again.');
      }finally{
        if(btn.isConnected){btn.disabled=false;btn.textContent='Save event changes'}
      }
    };
  }

  eventDetails=async function(id){
    await previousEventDetails(id);
    if(!canEdit()||tab!=='events')return;
    const body=$('#eventBody'),actions=body?.querySelector('.event-head-actions');
    if(!actions||body.querySelector('#avfcEventEditButton'))return;
    const button=document.createElement('button');
    button.type='button';button.id='avfcEventEditButton';
    button.className='btn primary';button.textContent='Edit event';
    actions.insertAdjacentElement('afterbegin',button);
    button.onclick=()=>editEvent(id);
  };

  // Earlier and cancelled events must remain accessible to authorised editors.
  const previousEvents=events;
  events=async function(){
    await previousEvents();
    if(!canEdit()||tab!=='events')return;
    const list=$('#content'),body=$('#eventBody');
    if(!list||!body)return;
    const {data:old,error}=await sb.from('club_events')
      .select('id,title,event_date,venue,status')
      .order('event_date',{ascending:false}).limit(150);
    if(error||!body.isConnected)return;
    const archive=(old||[]).filter(e=>e.status==='cancelled'||
      new Date(e.event_date).getTime()<Date.now()-86400000);
    if(!archive.length)return;
    const section=document.createElement('details');
    section.className='panel avfc-past-events';
    section.innerHTML='<summary>Previous or cancelled events ('+archive.length+')</summary>'+
      '<p class="muted">Open an event to edit its details without removing its original RSVP or payment history.</p>'+
      '<div class="list">'+archive.map(e=>
        '<button type="button" class="row avfc-event-past-entry" data-past-event="'+Number(e.id)+'">'+
        '<span><strong>'+esc(e.title)+'</strong><br><small>'+new Date(e.event_date).toLocaleDateString('en-GB')+
        (e.venue?' · '+esc(e.venue):'')+'</small></span>'+
        '<span class="badge">'+esc(e.status==='cancelled'?'CANCELLED':'PAST')+'</span></button>'
      ).join('')+'</div>';
    body.insertAdjacentElement('beforebegin',section);
    section.querySelectorAll('[data-past-event]').forEach(b=>b.onclick=()=>{
      const id=Number(b.dataset.pastEvent);
      eventDetails(id).then(()=>body.scrollIntoView({behavior:'smooth',block:'start'}));
    });
  };
})();