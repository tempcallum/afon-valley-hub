/* Afon Valley FC Tote secure prize-claim experience. Bank details are
   submitted only to the authenticated/encrypted server claim service. */
async function avfcClaimRequest(body,options={}){
  const h={"Content-Type":"application/json",apikey:TOTE_ANON};
  if(options.staff){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign into your Hub account again.');
    h.Authorization='Bearer '+session.access_token;
  }
  const response=await fetch(TOTE_FUNCTION_BASE+'/tote-prize-claim',{
    method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
    headers:h,body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'The club could not process this request.');
  return data;
}
async function avfcShowPrizeClaim(){
  $('#login').classList.add('hidden');
  $('#shell').classList.add('hidden');
  $('#joinPublic').classList.add('hidden');
  $('#totePublic').classList.remove('hidden');
  $('#toteBack').onclick=()=>{location.href=location.pathname};
  const wrap=$('#totePublicContent');
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const payoutId=hash.get('payout')||'';
  const token=hash.get('token')||'';
  // Private winner tokens should not remain in the visible URL/history after use.
  history.replaceState(null,'',location.pathname+'?tote=claim');
  wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><span class="eyebrow dark">AFON VALLEY FC TOTE</span><h2>Claim your prize</h2><p>Checking your private winning email link…</p></div>';
  if(!payoutId||!token){
    wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><h2>Open your winning email</h2><p>To claim a Tote prize, use the private link in the email sent to the winning ticket holder. This link is unique to each prize.</p><p>If you cannot find it, contact <a href="mailto:afonvalleyafc@gmail.com">afonvalleyafc@gmail.com</a>.</p></div>';
    return;
  }
  let prize;
  try{prize=await avfcClaimRequest({action:'status',payout_id:payoutId,token})}
  catch(err){wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><h2>Unable to open the claim</h2><p>'+esc(err.message)+'</p><p>Please reopen the original link from your winning email, or contact <a href="mailto:afonvalleyafc@gmail.com">afonvalleyafc@gmail.com</a>.</p></div>';return}
  if(prize.status==='paid'){
    wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><h2>Prize recorded as paid</h2><p>Afon Valley FC has marked this prize as paid. Please contact the club if you have a question about your transfer.</p></div>';return;
  }
  if(prize.status==='submitted'){
    wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><h2>Thank you — bank details received</h2><p>Your payment details are held securely for the Chair and Treasurer to process your prize. The club will transfer the money from Lloyds and contact you if anything needs checking.</p><p>No further details are needed. To change your bank details, contact <a href="mailto:afonvalleyafc@gmail.com">afonvalleyafc@gmail.com</a>.</p></div>';return;
  }
  const money=pounds(Number(prize.amount_pence||0)/100);
  wrap.innerHTML='<div class="tote-public-card avfc-prize-card">'+
    '<span class="eyebrow dark">OFFICIAL WINNING ENTRY</span>'+
    '<h2>Congratulations, '+esc(prize.winner_name||'winner')+'!</h2>'+
    '<div class="avfc-prize-total">'+money+'</div>'+
    '<p>You have won the '+(prize.prize_type==='jackpot'?'jackpot':'weekly prize')+
      ' from Afon Valley Tote draw '+esc(String(prize.draw_number||''))+'.</p>'+
    '<p>To receive your prize by bank transfer, please enter the account details you would like Afon Valley FC to pay. These will be encrypted, reviewed only by the Chair and Treasurer, and deleted after your prize is recorded as paid.</p>'+
    '<form id="avfcPrizeClaimForm" class="avfc-prize-claim-form" autocomplete="off">'+
    '<label>Account holder name<input name="holder" maxlength="90" minlength="2" autocomplete="off" required placeholder="Name on bank account"></label>'+
    '<label>Sort code<input name="sort" inputmode="numeric" maxlength="8" pattern="[0-9 -]{6,8}" autocomplete="off" required placeholder="12-34-56"></label>'+
    '<label>Account number<input name="account" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" autocomplete="off" required placeholder="8 digits"></label>'+
    '<label>Confirm account number<input name="confirm" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" autocomplete="off" required placeholder="Enter 8 digits again"></label>'+
    '<label class="avfc-prize-consent"><input type="checkbox" name="agree" required><span>I confirm these are the details I want Afon Valley FC to use to pay my prize.</span></label>'+
    '<button class="btn primary" type="submit">Send bank details securely</button>'+
    '<p id="avfcPrizeClaimStatus" class="muted" aria-live="polite" role="status"></p></form>'+
    '<div class="avfc-prize-safety"><strong>Your payment is handled by the club.</strong> We will never ask for your banking password, card number or one-time security code. Never send your account details through WhatsApp or by replying to an email.<p>We collect these details solely to pay your prize, restrict access to the Chair and Treasurer, and delete the account details when the payment is marked paid. We keep the financial payout audit record. For questions, corrections or your data rights, contact afonvalleyafc@gmail.com. Read the <a href="./tote-privacy.html" target="_blank" rel="noopener noreferrer">Tote Privacy Notice</a>.</p></div></div>';
  const form=wrap.querySelector('#avfcPrizeClaimForm');
  form.onsubmit=async e=>{
    e.preventDefault();
    const b=form.querySelector('button[type="submit"]');
    const error=form.querySelector('#avfcPrizeClaimStatus');
    const fd=new FormData(form),account=String(fd.get('account')||'').trim(),confirm=String(fd.get('confirm')||'').trim();
    if(!fd.get('agree')||account!==confirm){error.textContent='Please check your bank details and confirm the account number.';return}
    b.disabled=true;b.textContent='Submitting securely…';error.textContent='';
    try{
      await avfcClaimRequest({action:'submit',payout_id:payoutId,token,
        account_holder:String(fd.get('holder')||''),
        sort_code:String(fd.get('sort')||''),
        account_number:account,account_confirm:confirm});
      form.reset();
      wrap.innerHTML='<div class="tote-public-card avfc-prize-card"><h2>Your claim has been received</h2><p>Thank you! Your bank details are encrypted and available only to the club’s Chair and Treasurer. They will arrange your payout using Lloyds.</p><p>For questions, contact <a href="mailto:afonvalleyafc@gmail.com">afonvalleyafc@gmail.com</a>.</p></div>';
    }catch(err){error.textContent=err.message;b.disabled=false;b.textContent='Send bank details securely'}
  };
}
const avfcPrizeOriginalBoot=boot;
boot=async function(){
  if(publicTote==='claim')return avfcShowPrizeClaim();
  return avfcPrizeOriginalBoot();
};

const avfcPrizeOriginalTote=tote;
tote=async function(){
  await avfcPrizeOriginalTote();
  if(tab!=='tote'||!profile?.approved||!['chair','treasurer'].includes(profile.role)||isPlayerView())return;
  const root=$('#content');
  const payoutHeading=[...root.querySelectorAll('h3')].find(n=>n.textContent.trim()==='Winner payments');
  if(!payoutHeading||!payoutHeading.isConnected)return;
  const originalPanel=payoutHeading.closest('.panel');
  const placement=originalPanel.closest('.tote-admin-grid')||originalPanel;
  const claimPanel=document.createElement('section');
  claimPanel.className='panel avfc-prize-admin';
  claimPanel.innerHTML='<span class="eyebrow dark">PRIZE CLAIMS</span><h3>Winner bank details</h3><p class="muted">Bank details are encrypted. Reveal them only when arranging a Lloyds transfer; never share them over WhatsApp. Confirm the payee in Lloyds before making a payment.</p><p class="muted">Loading prize claims…</p>';
  placement.insertAdjacentElement('beforebegin',claimPanel);
  let response;
  try{response=await avfcClaimRequest({action:'overview'},{staff:true})}
  catch(err){claimPanel.insertAdjacentHTML('beforeend','<p class="muted">Unable to check prize claims: '+esc(err.message)+'</p>');return}
  if(!claimPanel.isConnected||tab!=='tote')return;
  const claims=response.claims||[];
  claimPanel.innerHTML='<div class="head"><div><span class="eyebrow dark">PRIZE CLAIMS</span><h3>Winner bank details</h3>'+
    '<p class="muted">Only you and Chris can view submitted bank details. Pay manually through Lloyds, then use “Mark paid” in Winner payments below. Bank details are deleted when marked paid.</p></div></div>'+
    (claims.length?claims.map(p=>'<div class="avfc-prize-admin-row">'+
      '<div><strong>'+esc(p.winner_name)+' · '+pounds(Number(p.amount_pence||0)/100)+'</strong>'+
      '<small>Draw '+esc(String(p.draw_number||''))+' · '+esc(p.prize_type)+'</small>'+
      '<small>'+(p.submitted_at
        ?'Bank details received '+esc(new Date(p.submitted_at).toLocaleString('en-GB'))+' · ending '+esc(p.account_last4||'')
        :'Waiting for the winner to submit bank details')+'</small></div>'+
      (p.submitted_at?'<button type="button" class="btn avfc-prize-reveal" data-avfc-claim="'+p.id+'">View bank details</button>':
        '<span class="badge warn">AWAITING CLAIM</span>')+
      '<div class="avfc-prize-reveal-area" data-avfc-claim-area="'+p.id+'"></div></div>').join(''):
      '<div class="success-note">No unpaid Tote prizes awaiting bank details.</div>');
  claimPanel.querySelectorAll('[data-avfc-claim]').forEach(button=>button.onclick=async()=>{
    const id=button.dataset.avfcClaim;
    const target=claimPanel.querySelector('[data-avfc-claim-area="'+id+'"]');
    if(!target)return;
    if(target.dataset.visible==='true'){target.replaceChildren();target.dataset.visible='false';button.textContent='View bank details';return;}
    button.disabled=true;button.textContent='Checking…';
    try{
      const details=await avfcClaimRequest({action:'reveal',payout_id:id},{staff:true});
      if(!target.isConnected)return;
      target.replaceChildren();
      const card=document.createElement('div');card.className='avfc-prize-bank-details';
      const intro=document.createElement('p');intro.textContent='Check these payee details in Lloyds. Do not mark paid until the transfer has actually left the club account.';
      card.appendChild(intro);
      for(const [label,value] of [
        ['Account holder',details.account_holder],
        ['Sort code',String(details.sort_code||'').replace(/(\d{2})(\d{2})(\d{2})/,'$1-$2-$3')],
        ['Account number',details.account_number]
      ]){
        const line=document.createElement('div');
        const labelElement=document.createElement('span');labelElement.textContent=label;
        const numberElement=document.createElement('strong');numberElement.textContent=String(value||'');
        line.append(labelElement,numberElement);card.appendChild(line);
      }
      target.appendChild(card);
      target.dataset.visible='true';
      button.textContent='Hide bank details';
      // Avoid leaving bank details displayed unattended on a shared phone.
      setTimeout(()=>{
        if(target.isConnected&&target.dataset.visible==='true'){
          target.replaceChildren();target.dataset.visible='false';
          if(button.isConnected)button.textContent='View bank details';
        }
      },60000);
    }catch(err){target.textContent=err.message;button.textContent='View bank details'}
    finally{button.disabled=false}
  });
};