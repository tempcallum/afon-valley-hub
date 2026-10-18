/* Afon Valley FC — each player's existing Tote referral as a personal QR.
   Link is generated locally from their own authorised referral code.
   This does not expose lottery management or other players' referral codes. */
const avfcPlayerToteBeforeQr=avfcPlayerTote;
avfcPlayerTote=async function(){
  await avfcPlayerToteBeforeQr();
  if(!isPlayerView()||!profile?.approved||!myPlayer||tab!=='tote')return;
  const root=$('#content');
  const toteScreen=root?.querySelector('.hub-player-tote');
  if(!toteScreen||!toteScreen.isConnected)return;

  const qrSection=document.createElement('section');
  qrSection.className='panel hub-personal-tote-qr';
  qrSection.id='avfcPersonalToteQr';
  qrSection.innerHTML='<div class="hub-personal-tote-qr-heading">'+
    '<div><span class="eyebrow dark">SHARE THE TOTE</span>'+
    '<h3>Your personal Tote QR</h3>'+
    '<p class="muted">Let someone scan your code to enter the public Tote. Tickets purchased and verified through your link count towards your player referral total.</p></div></div>'+
    '<div class="hub-personal-tote-qr-loading" role="status">Loading your personal referral code…</div>';

  // Put the QR above the normal purchase button and rules, so it is easy to find.
  const actionRow=toteScreen.querySelector('.hub-player-tote-actions');
  if(actionRow)actionRow.insertAdjacentElement('beforebegin',qrSection);
  else toteScreen.appendChild(qrSection);

  const currentPlayer=myPlayer;
  const {data:referral,error}=await sb.from('tote_player_referrals')
    .select('code,active').eq('player_id',currentPlayer).maybeSingle();
  if(!qrSection.isConnected||tab!=='tote'||!isPlayerView()||myPlayer!==currentPlayer)return;

  const validCode=referral?.active===true&&/^[a-f0-9]{10}$/i.test(String(referral.code||''));
  if(error||!validCode){
    qrSection.querySelector('.hub-personal-tote-qr-loading').innerHTML=
      '<p class="muted">Your personal Tote referral is not available yet. Ask the Chair to check that your Hub account is linked to the correct player. You can still buy tickets using the normal button below.</p>';
    return;
  }
  const personalLink=toteLink(String(referral.code).toLowerCase());
  const loading=qrSection.querySelector('.hub-personal-tote-qr-loading');
  loading.outerHTML='<div class="hub-personal-tote-qr-content">'+
    '<div class="hub-personal-tote-qr-image" id="avfcMyToteQrGraphic" aria-label="Your personal Tote referral QR code"></div>'+
    '<div class="hub-personal-tote-qr-side">'+
      '<strong>Share this with friends and family</strong>'+
      '<small>They can scan the QR or open your unique link. The public £1 checkout handles payment instructions and ticket entry.</small>'+
      '<div class="hub-personal-tote-qr-actions">'+
        '<button type="button" class="btn primary" id="avfcCopyMyToteLink">Copy my Tote link</button>'+
        '<button type="button" class="btn" id="avfcShareMyToteLink">Share</button>'+
      '</div>'+
      '<small class="hub-personal-tote-qr-note">Referrals count once the club confirms payment in Lloyds. Your own ticket purchases do not count towards your referral sales.</small>'+
    '</div></div>';
  const image=qrSection.querySelector('#avfcMyToteQrGraphic');
  const copy=qrSection.querySelector('#avfcCopyMyToteLink');
  const share=qrSection.querySelector('#avfcShareMyToteLink');
  copy.onclick=e=>copyText(personalLink,e.currentTarget);
  share.onclick=async()=>{
    if(navigator.share){
      try{await navigator.share({title:'Afon Valley FC Weekly Tote',
        text:'Support Afon Valley FC in the weekly £1 Tote draw.',url:personalLink});}
      catch(err){if(err?.name!=='AbortError')await copyText(personalLink,share)}
    }else await copyText(personalLink,share);
  };
  if(typeof QRCode==='undefined'){
    image.innerHTML='<p class="muted">The QR image could not load. Use “Copy my Tote link” to share your referral.</p>';
    return;
  }
  try{
    new QRCode(image,{
      text:personalLink,width:216,height:216,
      colorDark:'#063b24',colorLight:'#ffffff',
      correctLevel:QRCode.CorrectLevel.M
    });
  }catch(err){
    console.warn('Could not create personal Tote QR',err);
    image.innerHTML='<p class="muted">QR image unavailable. You can still copy or share your personal Tote link.</p>';
  }
};