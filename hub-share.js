
/* One-tap, Chair-only sharing of the actual Hub login/signup URL. */
const AVFC_LOGIN_SHARE_URL='https://tempcallum.github.io/afon-valley-hub/';

async function avfcCopyHubLoginUrl(button){
 const label=button?.textContent||'Copy Hub Link';
 try{
  if(navigator.clipboard&&window.isSecureContext){
   await navigator.clipboard.writeText(AVFC_LOGIN_SHARE_URL);
  }else{
   const input=document.createElement('textarea');
   input.value=AVFC_LOGIN_SHARE_URL;
   input.setAttribute('readonly','');
   input.style.position='fixed';
   input.style.left='-9999px';
   document.body.appendChild(input);
   input.select();
   const copied=document.execCommand('copy');
   input.remove();
   if(!copied)throw new Error('Clipboard not available');
  }
  button.textContent='Link copied';
  button.classList.add('copied');
  setTimeout(()=>{
   if(button?.isConnected){button.textContent=label;button.classList.remove('copied')}
  },2400);
 }catch{
  window.prompt('Copy the Afon Valley Hub link:',AVFC_LOGIN_SHARE_URL);
 }
}
function avfcAttachHubShareButtons(container){
 container.querySelectorAll('[data-copy-avfc-hub]').forEach(btn=>{
  btn.onclick=()=>avfcCopyHubLoginUrl(btn);
 });
}
const avfcPreviousHomeForHubSharing=home;
home=async function(){
 await avfcPreviousHomeForHubSharing();
 if(!profile?.approved||profile.role!=='chair'||isPlayerView()||tab!=='home')return;
 const area=$('#content');if(!area||!area.isConnected||area.querySelector('.chair-hub-share'))return;
 const el=document.createElement('div');
 el.className='chair-hub-share';
 el.innerHTML='<div class="chair-hub-share-text">'+
  '<strong>Invite someone to the Hub</strong>'+
  '<small>Send the login and Create account page. FAW COMET clearance stays separate.</small></div>'+
  '<button type="button" class="btn primary" data-copy-avfc-hub>Copy Hub Link</button>';
 const fixture=area.querySelector('.match-feature');
 if(fixture)fixture.insertAdjacentElement('afterend',el);
 else area.insertAdjacentElement('afterbegin',el);
 avfcAttachHubShareButtons(el);
};

const avfcPreviousAdminExtrasForHubSharing=renderAdminExtras;
renderAdminExtras=async function(){
 await avfcPreviousAdminExtrasForHubSharing();
 if(!profile?.approved||profile.role!=='chair'||isPlayerView())return;
 const area=$('#content'),panel=area?.querySelector('.direct-reg-admin-share');
 if(!panel||panel.querySelector('.chair-hub-share-admin'))return;
 panel.insertAdjacentHTML('beforeend',
  '<div class="chair-hub-share-admin">'+
  '<div><strong>Hub login & signup</strong>'+
  '<small>Different from the player registration form above. Send this link so someone can create their Hub account or log in.</small></div>'+
  '<button class="btn primary" type="button" data-copy-avfc-hub>Copy Hub Link</button></div>');
 avfcAttachHubShareButtons(panel);
};
