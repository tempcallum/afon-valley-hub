
/* Chair-only real bank-payment check for the Tote. Public entry sales remain OFF. */
const avfcToteBeforePrivateTest=tote;
tote=async function(){
  await avfcToteBeforePrivateTest();
  if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
  const area=$('#content');
  if(!area||!area.isConnected||area.querySelector('#totePrivatePaymentTest'))return;
  const panel=document.createElement('section');
  panel.id='totePrivatePaymentTest';
  panel.className='panel';
  panel.innerHTML=
    '<span class="eyebrow dark">CHAIR ONLY · CONTROLLED CHECK</span>'+
    '<h3>Test your first £1 Tote ticket</h3>'+
    '<p>Public sales are still closed. Prepare a private single-ticket order and pay using the displayed Lloyds reference. '+
    'This is a <strong>real paid entry</strong>, not a pretend ticket: only proceed if you intend to send the money. '+
    'The ticket and email are issued only after you verify the payment in Lloyds.</p>'+
    '<label>Test ticket holder name<input id="totePrivateTestName" autocomplete="name" maxlength="100" placeholder="Name to print on the ticket"></label>'+
    '<label class="tote-terms"><input type="checkbox" id="totePrivateTestAge"><span>I am 16 or over and understand this is a real Tote ticket.</span></label>'+
    '<div class="tote-receipt-actions"><button id="totePreparePrivateTest" class="btn primary" type="button">Prepare private £1 test</button></div>'+
    '<p class="muted">Prepare it only when you are ready to transfer within 20 minutes. '+
    'Use the exact bank reference shown; do not transfer before preparing the entry. '+
    'The automated confirmation goes to <strong>afonvalleyafc@gmail.com</strong>.</p>'+
    '<p class="muted" id="totePrivateTestResult" role="status" aria-live="polite"></p>'+
    '<div id="totePrivateTestBank"></div>';
  const gmail=area.querySelector('#toteGmailSetup');
  if(gmail)gmail.insertAdjacentElement('afterend',panel);
  else area.insertAdjacentElement('afterbegin',panel);
  const name=panel.querySelector('#totePrivateTestName');
  name.value=String(profile.display_name||'').trim();
  const age=panel.querySelector('#totePrivateTestAge');
  const button=panel.querySelector('#totePreparePrivateTest');
  const msg=panel.querySelector('#totePrivateTestResult');
  const instructions=panel.querySelector('#totePrivateTestBank');
  button.onclick=async()=>{
    const buyer_name=String(name.value||'').trim().replace(/\s+/g,' ');
    if(buyer_name.length<2){msg.textContent='Please enter a name for the test ticket.';return}
    if(!age.checked){msg.textContent='Please confirm you are at least 16.';return}
    if(!confirm('Prepare a real single-ticket bank transfer test? Public Tote sales will stay closed.'))return;
    button.disabled=true;
    button.textContent='Preparing test…';
    msg.textContent='Checking Gmail, draw and Lloyds settings…';
    try{
      const out=await toteAdminApi({action:'create_chair_test',buyer_name,age_confirmed:true,confirmed:true});
      const bank=out.bank||{};
      const amount=pounds(out.amount);
      const reference=String(out.reference||'');
      const details=[
        'Afon Valley FC Tote - private test',
        'Amount: '+amount,
        'Account name: '+String(bank.account_name||''),
        'Sort code: '+formatSortCode(bank.sort_code),
        'Account number: '+String(bank.account_number||''),
        'Reference: '+reference
      ].join('\n');
      const due=out.payment_due_at?new Date(out.payment_due_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'within 20 minutes';
      msg.textContent=out.created?'Your private test order is ready. No payment has been recorded yet.':'Your existing private test order has been found. No extra order was created.';
      instructions.innerHTML=
        '<div class="list">'+
        '<div class="row"><span>Amount to send</span><strong>'+esc(amount)+'</strong></div>'+
        '<div class="row"><span>Receiving name</span><strong>'+esc(bank.account_name||'')+'</strong></div>'+
        '<div class="row"><span>Sort code</span><strong>'+esc(formatSortCode(bank.sort_code))+'</strong></div>'+
        '<div class="row"><span>Account number</span><strong>'+esc(bank.account_number||'')+'</strong></div>'+
        '<div class="row"><span>Exact reference</span><strong>'+esc(reference)+'</strong></div>'+
        '<div class="row"><span>Payment deadline</span><strong>'+esc(due)+'</strong></div>'+
        '</div>'+
        '<div class="tote-receipt-actions"><button id="totePrivateCopyBank" class="btn" type="button">Copy payment details</button>'+
        '<button id="totePrivateMarkSent" class="btn primary" type="button">I have made the bank transfer</button></div>'+
        '<p class="muted">After transferring, tap the second button. Then verify the incoming transaction in Lloyds and use the Chair payment-check form to issue your ticket.</p>';
      button.textContent='Test order prepared';
      panel.querySelector('#totePrivateCopyBank').onclick=e=>copyText(details,e.currentTarget);
      const mark=panel.querySelector('#totePrivateMarkSent');
      mark.onclick=async()=>{
        if(!confirm('Have you actually sent the bank transfer to Lloyds using the exact reference?'))return;
        mark.disabled=true;mark.textContent='Notifying the Hub…';
        try{
          await toteApi('tote-bank-claim',{method:'POST',body:JSON.stringify({order_token:out.order_token})});
          msg.textContent='Payment reported. You must now check Lloyds and confirm the matching transaction on the Chair Tote screen.';
          await tote();
        }catch(e){
          mark.disabled=false;mark.textContent='I have made the bank transfer';
          msg.textContent=e?.message||'Could not notify the Hub. Keep your payment reference and try again.';
        }
      };
    }catch(e){
      button.disabled=false;button.textContent='Prepare private £1 test';
      msg.textContent=e?.message||'Private test could not be prepared. Do not send a bank transfer.';
    }
  };
};
