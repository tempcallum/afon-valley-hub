/* Afon Valley Tote - permanent-reference standing orders.
   One-off purchases remain unchanged. Incoming Lloyds payments are never assumed. */
(function(){
 const api=(payload,headers={})=>toteApi('tote-standing-orders',{
   method:'POST',headers,body:JSON.stringify(payload)
 });
 const gbp=pence=>'£'+(Number(pence||0)/100).toFixed(2);
 const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const safe=s=>esc(String(s??''));
 const dateText=v=>v?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not yet';
 const makeLink=token=>location.origin+location.pathname+'?tote=standing&token='+encodeURIComponent(token);
 async function accountToken(){
   const session=(await sb.auth.getSession()).data?.session;
   if(!session?.access_token)throw Error('Please sign in again to manage weekly Tote payments.');
   return session.access_token;
 }
 function mountManagement(message,action){
   $('#login').classList.add('hidden');
   $('#shell').classList.add('hidden');
   $('#totePublic').classList.remove('hidden');
   $('#toteBack').onclick=()=>location.href=location.pathname+'?tote=club';
   $('#totePublicContent').innerHTML='<div class="tote-public-card"><h2>'+message+'</h2>'+
     '<p id="toteStandingInfo" class="muted">Checking weekly standing order…</p>'+
     '<div class="actions"><button id="toteStandingManageBack" type="button" class="btn">Back to Tote</button></div></div>';
   $('#toteStandingManageBack').onclick=()=>location.href=location.pathname+'?tote=club';
   if(action)action();
 }
 function paymentInstructions(data,{demo=false}={}){
   const bank=data.bank||{},token=data.subscription_token;
   const link=makeLink(token);
   const text=['Afon Valley Weekly Tote standing order',
     'Bank account name: '+(bank.account_name||''),
     'Sort code: '+formatSortCode(bank.sort_code||''),
     'Account number: '+(bank.account_number||''),
     'Weekly payment: '+gbp(data.amount_pence),
     'Reference: '+(data.reference||''),
     'Repeat: every Monday',
     'Your private manage link: '+link].join('\n');
   if(!demo)history.replaceState(null,'',link);
   $('#totePublicContent').innerHTML='<div class="tote-public-card">'+
     (demo?'<div class="tote-pending" role="status"><strong>DEMO PREVIEW ONLY</strong> — these are example details, not a real bank account or subscription. No payment can be made using them.</div>':'')+
     '<h2>Your weekly Tote standing order</h2>'+
     '<div class="success-note">'+(demo?'<strong>Example reference.</strong> No subscription has been created and no payment is possible from this preview.':'<strong>Reference reserved.</strong> No payment has been taken and no tickets have been issued yet.')+'</div>'+
     (demo?'<p>This is the instruction screen a buyer sees after registering. They would set up a <strong>weekly Monday standing order</strong> with the permanent reference shown.</p>':'<p>Open your bank app and create a <strong>weekly standing order for Monday</strong>. Make sure the recipient bank reference is copied exactly. Keep these instructions.</p>')+
     '<div class="tote-bank-reference"><div class="tote-bank-reference-title">PERMANENT BANK REFERENCE — NEVER CHANGE</div>'+
       '<strong class="tote-bank-reference-code">'+safe(data.reference)+'</strong>'+
       '<p>This identifies you every week. Your individual ticket numbers will be different for each draw.</p>'+
       '<button type="button" class="btn primary" id="standingCopyReference">Copy bank reference</button></div>'+
     '<div class="list">'+
       '<div class="row"><span>Account name</span><strong>'+safe(bank.account_name)+'</strong></div>'+
       '<div class="row"><span>Sort code</span><strong>'+safe(formatSortCode(bank.sort_code))+'</strong></div>'+
       '<div class="row"><span>Account number</span><strong>'+safe(bank.account_number)+'</strong></div>'+
       '<div class="row"><span>Weekly payment</span><strong>'+gbp(data.amount_pence)+'</strong></div>'+
       '<div class="row"><span>Tickets per paid week</span><strong>'+Number(data.tickets)+'</strong></div>'+
     '</div>'+
     '<div class="actions"><button type="button" id="standingCopyAll" class="btn primary">Copy all standing-order details</button>'+
       '<button type="button" id="standingCopyLink" class="btn">Copy private management link</button></div>'+
     '<p class="muted">We only issue tickets after checking the Lloyds payment. Payments received after sales close are held for review, not backdated into a completed draw. The club emails fresh ticket numbers after verification.</p>'+
     '<p class="muted"><strong>Stopping:</strong> You must cancel the standing order in your bank as well as notifying the club. Your private link lets you stop future ticket entries.</p>'+
     '<p><a href="./tote-rules.html" target="_blank" rel="noopener">Full Tote rules</a> · <a href="./?tote=club">'+(demo?'Go to live Tote':'Back to Tote')+'</a></p></div>';
   if(demo){
     for(const id of ['standingCopyReference','standingCopyAll','standingCopyLink']){
       const button=$('#'+id);
       if(button){button.disabled=true;button.title='Example only — real bank details appear after registration';}
     }
   }else{
     $('#standingCopyReference').onclick=e=>copyText(data.reference,e.currentTarget);
     $('#standingCopyAll').onclick=e=>copyText(text,e.currentTarget);
     $('#standingCopyLink').onclick=e=>copyText(link,e.currentTarget);
   }
 }
 async function manage(token){
   mountManagement('Your weekly Tote standing order');
   const el=$('#toteStandingInfo');
   try{
     const {subscription:s}=await api({action:'lookup',subscription_token:token});
     if(!el)return;
     el.innerHTML='<strong>'+safe(s.name)+'</strong><br>'+
       '<strong>Permanent bank reference: '+safe(s.reference)+'</strong><br>'+
       'Weekly amount: '+gbp(s.amount_pence)+' · '+Number(s.ticket_count)+' tickets<br>'+
       'Status: <strong>'+safe(s.status==='active'?'Active':'Stopped')+'</strong><br>'+
       '<small>This confirms registration, not receipt of any future payment.</small>'+
       '<p class="muted">Payee: '+safe(s.bank?.account_name||'')+' · Sort code: '+safe(formatSortCode(s.bank?.sort_code))+' · Account: '+safe(s.bank?.account_number||'')+'</p>'+
       ((s.payments||[]).length?'<h3>Verified payments</h3>'+s.payments.map(p=>
         '<div class="row"><span>'+safe(dateText(p.bank_received_at))+'</span><strong>'+gbp(p.amount_pence)+'</strong></div>').join(''):
         '<p>No payments have been verified yet.</p>')+
       (s.status==='active'?'<p><button type="button" class="btn" id="standingStop">Stop future Tote entries</button></p>':'')+
       '<p class="muted">To stop money leaving your account, cancel the standing order with your bank too. This screen cannot cancel a bank instruction.</p>';
     const b=$('#standingStop');
     if(b)b.onclick=async()=>{
       if(!confirm('Stop future Tote entries for '+s.name+'? You must also cancel the standing order in your bank. Already issued tickets stay valid.'))return;
       b.disabled=true;
       try{await api({action:'cancel',subscription_token:token});await manage(token)}
       catch(e){b.disabled=false;alert(e.message)}
     };
   }catch(e){if(el)el.textContent=e.message}
 }
 const previousPublic=showPublicTote;
 showPublicTote=async function(){
   const params=new URLSearchParams(location.search);
   const token=params.get('token');
   if(publicTote==='standing-preview'){
     $('#login').classList.add('hidden');
     $('#shell').classList.add('hidden');
     $('#totePublic').classList.remove('hidden');
     $('#toteBack').onclick=()=>location.href=location.pathname+'?tote=club';
     paymentInstructions({
       subscription_token:null,
       reference:'AVS-DEMO-ONLY',
       amount_pence:500,
       tickets:5,
       bank:{account_name:'Example only — not for payment',sort_code:'XX-XX-XX',account_number:'XXXXXXXX'}
     },{demo:true});
     return;
   }
   if(publicTote==='standing'&&token){await manage(token);return}
   await previousPublic();
   if(publicTote==='return'||publicTote==='preview')return;
   const target=$('#totePublicContent');
   if(!target||!target.querySelector('#publicToteForm'))return;
   const ref=publicTote==='committee'?'club':(publicTote&&publicTote!=='standing'?publicTote:'club');
   let info;
   try{info=await toteApi('tote-public?ref='+encodeURIComponent(ref)+(publicTote==='committee'?'&mode=committee':''))}
   catch{return}
   const entryCard=target.querySelector('#publicToteForm')?.closest('.tote-public-card');
   if(!entryCard||!info.payments_live||publicTote==='committee')return;
   const card2=document.createElement('section');
   card2.className='tote-public-card tote-standing-card';
   card2.innerHTML='<h3>Play every week without buying again</h3>'+
     '<p>Set up a weekly standing order using one permanent bank reference. After each payment is confirmed, we allocate fresh ticket numbers and email your tickets. No card subscription required.</p>'+
     '<button type="button" class="btn primary" id="standingOpenForm">Set up a weekly standing order</button>'+
     '<div id="standingSignupArea" hidden><form id="standingSignup" class="form">'+
       '<label>Tickets each week<select name="count" required>'+
         '<option value="1">1 ticket — £1 every week</option><option value="5">5 tickets — £5 every week</option>'+
         '<option value="10">10 tickets — £10 every week</option><option value="20">20 tickets — £20 every week</option>'+
       '</select></label>'+
       '<div class="tote-form-grid"><label>Full name<input name="name" autocomplete="name" required></label>'+
         '<label>Email<input name="email" type="email" autocomplete="email" maxlength="200" required></label>'+
         '<label>Confirm email<input name="repeat" type="email" autocomplete="off" maxlength="200" required></label></div>'+
       '<label>Mobile (optional)<input name="mobile" autocomplete="tel" inputmode="tel"></label>'+
       '<label class="tote-terms"><input type="checkbox" name="age" required><span>I am aged 16 or over and agree to the <a href="./tote-rules.html" target="_blank" rel="noopener">Tote rules and standing-order conditions</a>.</span></label>'+
       '<p class="muted">Standing orders are set up and cancelled in your own banking app. You will not be entered into a draw unless the club verifies your payment before the relevant cutoff.</p>'+
       '<button class="btn primary" type="submit">Get my permanent bank reference</button>'+
       '</form></div>';
   entryCard.insertAdjacentElement('afterend',card2);
   const area=card2.querySelector('#standingSignupArea');
   card2.querySelector('#standingOpenForm').onclick=e=>{area.hidden=!area.hidden;e.currentTarget.textContent=area.hidden?'Set up a weekly standing order':'Hide standing-order form'};
   // Choose the purchase type BEFORE either payment form is shown.
   // Radio inputs are mutually exclusive: a customer cannot pick both by accident.
   const chooser=document.createElement('section');
   chooser.className='tote-public-card tote-purchase-choice';
   chooser.innerHTML='<h2>How would you like to play?</h2>'+
     '<p>Choose one option to continue.</p>'+
     '<fieldset class="tote-purchase-choices"><legend class="tote-choice-legend">Ticket purchase type</legend>'+
       '<label class="tote-purchase-option"><input type="radio" name="totePurchaseType" value="once">'+
         '<span class="tote-purchase-option-copy"><strong>One draw only</strong>'+
           '<small>Buy tickets for this Friday’s draw. Make a single payment.</small></span>'+
         '<span class="tote-purchase-selector" aria-hidden="true"></span></label>'+
       '<label class="tote-purchase-option"><input type="radio" name="totePurchaseType" value="weekly">'+
         '<span class="tote-purchase-option-copy"><strong>Every week</strong>'+
           '<small>Set up a weekly standing order. Fresh tickets after each payment is verified.</small></span>'+
         '<span class="tote-purchase-selector" aria-hidden="true"></span></label>'+
     '</fieldset>'+
     '<p class="tote-choice-footer">Entries are £1 each. Prize rules, winning chances and use of proceeds are in the '+
       '<a href="./tote-rules.html" target="_blank" rel="noopener noreferrer">full Tote rules</a>.</p>';
   target.insertBefore(chooser,target.firstChild);
   entryCard.hidden=true;
   card2.hidden=true;
   entryCard.style.display='none';
   card2.style.display='none';
   chooser.querySelectorAll('input[name="totePurchaseType"]').forEach(radio=>{
     radio.addEventListener('change',()=>{
       if(!radio.checked)return;
       const once=radio.value==='once';
       entryCard.hidden=!once;
       card2.hidden=once;
       entryCard.style.display=once?'':'none';
       card2.style.display=once?'none':'';
       const weeklyArea=card2.querySelector('#standingSignupArea');
       if(weeklyArea)weeklyArea.hidden=false;
       const openButton=card2.querySelector('#standingOpenForm');
       if(openButton){openButton.hidden=true;openButton.style.display='none'}
       chooser.querySelectorAll('.tote-purchase-option').forEach(label=>
         label.classList.toggle('selected',label.querySelector('input')?.checked===true));
       const chosen=once?entryCard:card2;
       chosen.scrollIntoView({behavior:'smooth',block:'start'});
     });
   });
   const form=card2.querySelector('#standingSignup');
   form.onsubmit=async e=>{
     e.preventDefault();
     const fd=new FormData(form);
     const email=String(fd.get('email')||'').trim().toLowerCase(),repeat=String(fd.get('repeat')||'').trim().toLowerCase();
     if(!email||email!==repeat)return alert('Please enter matching email addresses.');
     const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Preparing your reference…';
     try{
       const out=await api({action:'signup',name:fd.get('name'),email,email_confirm:repeat,mobile:fd.get('mobile'),
         ticket_count:Number(fd.get('count')),age_confirmed:fd.get('age')==='on',terms_confirmed:fd.get('age')==='on',ref});
       paymentInstructions(out);
     }catch(err){button.disabled=false;button.textContent='Get my permanent bank reference';alert(err.message)}
   };
 };
 const prevTote=tote;
 tote=async function(){
   await prevTote();
   if(isPlayerView()||!profile?.approved||!['chair','treasurer'].includes(profile.role)||tab!=='tote')return;
   const root=$('#content');
   if(!root||!root.querySelector('.tote-internal-hero'))return;
   const panel=document.createElement('section');
   panel.className='panel tote-standing-admin';
   panel.innerHTML='<div class="head"><div><span class="eyebrow dark">RECURRING TOTE</span><h3>Weekly standing orders</h3>'+
     '<p class="muted">Subscribers keep one permanent bank reference. Confirm each real Lloyds receipt here to issue that draw’s tickets and queue the normal email.</p></div></div>'+
     '<div id="standingAdminStatus" role="status">Loading standing orders…</div>'+
     '<div id="standingAdminList"></div>'+
     '<p class="muted">Check the correct Lloyds account, unique bank reference, amount, transaction ID and actual receipt time. Never confirm from an expected standing order alone. No automatic Lloyds feed is connected.</p>';
   const after=root.querySelector('.tote-internal-hero');
   after.insertAdjacentElement('afterend',panel);
   const label=panel.querySelector('#standingAdminStatus'),list=panel.querySelector('#standingAdminList');
   let result;
   try{result=await api({action:'list'},{Authorization:'Bearer '+await accountToken()})}
   catch(e){label.textContent='Standing orders unavailable: '+e.message;return}
   if(!panel.isConnected)return;
   const subs=result.subscriptions||[],payments=result.payments||[],open=result.draw;
   const bySub=new Map();
   for(const p of payments){if(!bySub.has(p.subscription_id))bySub.set(p.subscription_id,p)}
   const paidThisDraw=new Set(payments.filter(p=>p.draw_id===open?.id).map(p=>p.subscription_id));
   label.innerHTML='<strong>'+subs.filter(s=>s.status==='active').length+' active standing orders</strong> · '+
     (open?'Draw '+Number(open.draw_number)+' closes '+safe(dateText(open.sales_close_at)):'No eligible draw currently open')+
     ' · '+paidThisDraw.size+' subscriptions already allocated this draw.';
   list.innerHTML=subs.length?
     '<div class="list">'+subs.map(s=>{
       const entered=paidThisDraw.has(s.id),last=bySub.get(s.id);
       return '<details class="standing-subscriber"><summary><strong>'+safe(s.buyer_name)+'</strong> · '+safe(s.bank_reference)+
         ' · '+gbp(s.amount_pence)+'/week · '+safe(s.status)+
         (entered?' · DRAW ENTERED':'')+'</summary>'+
         '<div class="standing-sub-inner">'+
           '<p class="muted">'+safe(s.buyer_email)+' · '+Number(s.ticket_count)+' tickets a week · Last matched: '+safe(last?dateText(last.bank_received_at):'Never')+'</p>'+
           (s.status!=='active'?'<p>Subscription stopped. If a bank payment arrives, do not issue tickets; arrange review or refund.</p>':
             entered?'<p class="success-note">This subscription has already received tickets for the current draw. Do not enter another payment against it.</p>':
             !open?'<p>No open draw can accept this payment yet.</p>':
             '<form class="form standing-confirm" data-standing-id="'+safe(s.id)+'">'+
             '<div class="tote-form-grid">'+
             '<label>Amount received (£)<input name="amount" inputmode="decimal" value="'+(Number(s.amount_pence)/100).toFixed(2)+'" required></label>'+
             '<label>Bank reference seen<input name="reference" value="'+safe(s.bank_reference)+'" required></label>'+
             '<label>Actual Lloyds receipt date and time<input name="received" type="datetime-local" required></label>'+
             '<label>Unique bank transaction ID / statement line<input name="transaction" placeholder="Statement row or payment identifier" maxlength="130" required></label>'+
             '</div><button type="submit" class="btn primary">Verify and issue '+Number(s.ticket_count)+' tickets</button></form>')+
           (profile.role==='chair'&&s.status==='active'?'<p><button type="button" class="btn" data-standing-cancel="'+safe(s.id)+'">Stop this subscriber</button></p>':'')+
         '</div></details>';
     }).join('')+'</div>':
     '<p class="muted">No weekly standing orders yet. New subscribers will appear here automatically.</p>';
   list.querySelectorAll('form.standing-confirm').forEach(form=>form.onsubmit=async e=>{
     e.preventDefault();
     const id=form.dataset.standingId,sub=subs.find(x=>x.id===id),data=new FormData(form);
     const amount=Number(String(data.get('amount')||'').trim());
     const ref=String(data.get('reference')||'').trim();
     const stamp=String(data.get('received')||'');
     const transaction=String(data.get('transaction')||'').trim();
     if(!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==sub.amount_pence)return alert('The amount differs from the subscriber’s expected weekly payment. Do not issue tickets until it is resolved.');
     if(norm(ref)!==norm(sub.bank_reference))return alert('Reference mismatch. Check the Lloyds bank entry.');
     if(!stamp||Number.isNaN(Date.parse(stamp)))return alert('Enter the actual Lloyds receipt time.');
     if(transaction.length<6)return alert('Use a unique bank statement transaction identifier of at least six characters.');
     const when=new Date(stamp).toISOString();
     if(!confirm('Confirm a REAL cleared Lloyds payment (not an expected payment)?\n\n'+sub.buyer_name+
       '\nAmount: '+gbp(sub.amount_pence)+'\nBank reference: '+ref+
       '\nReceived: '+dateText(when)+'\nTransaction: '+transaction+
       '\nDraw: '+open.draw_number+'\nIssue: '+sub.ticket_count+' tickets'))return;
     const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Confirming…';
     try{
       const out=await api({action:'confirm',subscription_id:id,amount_pence:Math.round(amount*100),
         bank_reference_seen:ref,bank_received_at:when,bank_transaction_key:transaction},
         {Authorization:'Bearer '+await accountToken()});
       alert('Confirmed! '+sub.ticket_count+' tickets allocated to Draw '+out.draw_number+'. Ticket email queued.');
       await tote();
     }catch(err){button.disabled=false;button.textContent='Verify and issue '+sub.ticket_count+' tickets';alert('No tickets issued: '+err.message)}
   });
   list.querySelectorAll('[data-standing-cancel]').forEach(b=>b.onclick=async()=>{
     const id=b.dataset.standingCancel,s=subs.find(x=>x.id===id);
     if(!confirm('Stop '+s.buyer_name+' from future weekly entries? They must also cancel their Lloyds standing order.'))return;
     b.disabled=true;
     try{await api({action:'cancel_admin',subscription_id:id},{Authorization:'Bearer '+await accountToken()});await tote()}
     catch(err){b.disabled=false;alert(err.message)}
   });
 };
})();