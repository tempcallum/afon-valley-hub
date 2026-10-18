/* Player-controlled personal social links. They are not club Social accounts
   and cannot be read outside approved Hub membership. Sharing is opt-in. */
const avfcPlayerSocialPlatforms=[
 {id:'instagram',label:'Instagram',prefix:'https://www.instagram.com/',pattern:/^https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._%-]+\/?$/i},
 {id:'facebook',label:'Facebook',prefix:'https://www.facebook.com/',pattern:/^https:\/\/(?:(?:www|m)\.)?facebook\.com\/[A-Za-z0-9._%-]+\/?$/i},
 {id:'tiktok',label:'TikTok',prefix:'https://www.tiktok.com/@',pattern:/^https:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._%-]+\/?$/i},
 {id:'x',label:'X / Twitter',prefix:'https://x.com/',pattern:/^https:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_%-]+\/?$/i},
 {id:'snapchat',label:'Snapchat',prefix:'https://www.snapchat.com/add/',pattern:/^https:\/\/(?:www\.)?snapchat\.com\/add\/[A-Za-z0-9._%-]+\/?$/i},
 {id:'youtube',label:'YouTube',prefix:'https://www.youtube.com/@',pattern:/^https:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9._%-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9._%-]+|user\/[A-Za-z0-9._%-]+)\/?$/i}
];
function avfcSocialClean(platform,value){
 const entry=avfcPlayerSocialPlatforms.find(x=>x.id===platform);
 if(!entry)throw Error('Unsupported social network');
 let text=String(value||'').trim();
 if(!text)return null;
 if(text.length>300)throw Error(entry.label+': this link is too long.');
 // Accept both usernames and URLs, stripping sharing/tracking parameters from links.
 if(!/^https?:\/\//i.test(text)){
   if(/^www\./i.test(text))text='https://'+text;
   else if(/^(instagram\.com|facebook\.com|m\.facebook\.com|tiktok\.com|x\.com|twitter\.com|snapchat\.com|youtube\.com)\//i.test(text))
     text='https://'+text;
   else text=entry.prefix+text.replace(/^@/,'');
 }
 let uri;
 try{uri=new URL(text)}catch{throw Error(entry.label+': enter a valid username or profile URL.')}
 if(!['http:','https:'].includes(uri.protocol)||uri.username||uri.password||uri.port)
   throw Error(entry.label+': enter a normal profile link.');
 // Only accept the correct platform and canonical HTTPS URL; no user-entered redirects.
 const cleaned='https://'+uri.hostname.toLowerCase()+uri.pathname.replace(/\/+$/,'');
 if(!entry.pattern.test(cleaned))throw Error(entry.label+': this must be a direct link to your '+entry.label+' profile.');
 return cleaned;
}
const avfcSocialColumns=avfcPlayerSocialPlatforms.map(x=>({id:x.id,column:x.id+'_url'}));
const avfcSocialOriginalAccount=account;
account=async function(){
 await avfcSocialOriginalAccount();
 if(!isPlayerView()||!myPlayer||!profile?.approved)return;
 const target=$('#content');
 if(!target||!target.isConnected)return;
 const card=document.createElement('section');
 card.className='panel avfc-social-edit';
 card.id='avfcMySocialLinks';
 card.innerHTML='<div class="head"><div><span class="eyebrow dark">YOUR PLAYER PROFILE</span>'+
   '<h3>My social links</h3><p class="muted">Add your personal profiles here, not the club’s social accounts. All links are optional.</p></div></div>'+
   '<p id="avfcSocialLoading" class="muted">Loading your links…</p>';
 target.appendChild(card);
 const {data,error}=await sb.from('player_social_links')
   .select('instagram_url,facebook_url,tiktok_url,x_url,snapchat_url,youtube_url,visible_to_members')
   .eq('player_id',myPlayer).maybeSingle();
 if(!card.isConnected)return;
 if(error){card.querySelector('#avfcSocialLoading').textContent='Could not load your links. Please try again later.';return}
 card.innerHTML='<div class="head"><div><span class="eyebrow dark">YOUR PLAYER PROFILE</span>'+
   '<h3>My social links</h3><p class="muted">Your own Instagram, Facebook, TikTok and other profiles. Completely separate from Afon Valley FC’s official social media.</p></div></div>'+
   '<form id="avfcSocialForm" class="avfc-social-form">'+
   '<div class="avfc-social-fields">'+avfcPlayerSocialPlatforms.map(platform=>
      '<label>'+platform.label+'<input name="'+platform.id+'" type="text" inputmode="url" autocomplete="off" maxlength="300" '+
        'placeholder="@username or a profile link" value="'+esc(data?.[platform.id+'_url']||'')+'"></label>'
     ).join('')+'</div>'+
   '<label class="avfc-social-consent"><input type="checkbox" name="visible" '+
     (data?.visible_to_members?'checked':'')+'><span>Show these links on my player profile to other approved Afon Valley Hub members.</span></label>'+
   '<p class="muted avfc-social-footnote">Off by default. Only approved club members can see shared links. Untick to hide them again at any time.</p>'+
   '<button type="submit" class="btn primary">Save my social links</button>'+
   '<p id="avfcSocialSaveMessage" role="status" aria-live="polite" class="muted"></p></form>';
 const form=card.querySelector('#avfcSocialForm');
 form.onsubmit=async event=>{
   event.preventDefault();
   const fd=new FormData(form),msg=form.querySelector('#avfcSocialSaveMessage');
   const button=form.querySelector('button[type="submit"]');
   const values={player_id:myPlayer,visible_to_members:fd.get('visible')==='on'};
   try{
     for(const p of avfcPlayerSocialPlatforms)values[p.id+'_url']=avfcSocialClean(p.id,fd.get(p.id));
   }catch(e){msg.textContent=e.message;return}
   button.disabled=true;button.textContent='Saving…';msg.textContent='';
   const {error}=await sb.from('player_social_links').upsert(values,{onConflict:'player_id'});
   button.disabled=false;button.textContent='Save my social links';
   if(error){msg.textContent='Could not save your links: '+error.message;return}
   msg.textContent=values.visible_to_members
     ?'Saved. Your selected links are now visible on your player profile to approved Hub members.'
     :'Saved privately. Your links will remain hidden from other members until you choose to share.';
   msg.className='avfc-social-success';
 };
};

const avfcSocialOriginalPlayers=players;
players=async function(){
 await avfcSocialOriginalPlayers();
 if(!profile?.approved)return;
 const target=$('#content');
 if(!target||!target.isConnected)return;
 const tbody=target.querySelector('.table tbody');
 const rows=tbody?[...tbody.querySelectorAll('tr')]:[];
 if(!rows.length)return;
 const {data:people,error}=await sb.from('players').select('id,name,shirt_no,status').order('name');
 if(error||!people||!tbody.isConnected||people.length!==rows.length)return;
 let selected=0;
 let card=document.getElementById('avfcPlayerSocialProfile');
 if(!card){
  card=document.createElement('section');
  card.id='avfcPlayerSocialProfile';
  card.className='panel avfc-player-profile hidden';
  const editor=target.querySelector('#playerEditor');
  if(editor)editor.insertAdjacentElement('afterend',card);
  else target.insertAdjacentElement('afterbegin',card);
 }
 const profileCard=card;
 async function openProfile(player){
  const request=++selected;
  profileCard.classList.remove('hidden');
  profileCard.innerHTML='<div class="avfc-profile-head"><div><span class="eyebrow dark">PLAYER PROFILE</span>'+
    '<h3>'+esc(player.name)+'</h3></div><button class="btn" id="avfcClosePlayerProfile" type="button">Close</button></div>'+
    '<p class="muted">Loading profile…</p>';
  profileCard.querySelector('#avfcClosePlayerProfile').onclick=()=>{selected++;profileCard.classList.add('hidden')};
  profileCard.scrollIntoView({behavior:'smooth',block:'start'});
  const {data:links,error}=await sb.from('player_social_links')
    .select('instagram_url,facebook_url,tiktok_url,x_url,snapchat_url,youtube_url,visible_to_members')
    .eq('player_id',player.id).maybeSingle();
  if(request!==selected||!profileCard.isConnected)return;
  const shared=links?.visible_to_members===true;
  const validLinks=shared?avfcPlayerSocialPlatforms.map(x=>({name:x.label,url:links?.[x.id+'_url'],pattern:x.pattern})).filter(x=>
    x.url&&x.pattern.test(x.url)): [];
  const mine=Number(myPlayer)===Number(player.id)&&isPlayerView();
  profileCard.innerHTML='<div class="avfc-profile-head"><div><span class="eyebrow dark">PLAYER PROFILE</span>'+
    '<h3>'+esc(player.name)+'</h3><p class="muted">Shirt number '+
    esc(player.shirt_no??'—')+' · '+esc(player.status||'Squad member')+'</p></div>'+
    '<button class="btn" id="avfcClosePlayerProfile" type="button">Close</button></div>'+
    '<div class="avfc-social-profile-title"><strong>Personal social links</strong><small>Shared by the player, not official Afon Valley FC accounts</small></div>'+
    (error?'<p class="muted">Could not load personal social links right now.</p>':
     validLinks.length?'<div class="avfc-social-profile-links">'+validLinks.map(link=>
       '<a class="avfc-personal-social-link" href="'+esc(link.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+
       esc(link.name)+' <span aria-hidden="true">↗</span></a>').join('')+'</div>':
       '<p class="muted">This player has not shared any personal social links.</p>')+
    (mine?'<button type="button" class="btn" id="avfcEditMySocialLinks">Edit my links</button>':'');
  profileCard.querySelector('#avfcClosePlayerProfile').onclick=()=>{selected++;profileCard.classList.add('hidden')};
  const edit=profileCard.querySelector('#avfcEditMySocialLinks');
  if(edit)edit.onclick=()=>{
    if(!allowed().includes('account'))return;
    tab='account';drawNav();render('account').then(()=>{
      document.getElementById('avfcMySocialLinks')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  };
 }
 rows.forEach((row,index)=>{
   const player=people[index];
   const nameCell=row.querySelector('td:first-child');
   if(!nameCell)return;
   const btn=document.createElement('button');
   btn.type='button';btn.className='avfc-player-profile-link';
   btn.textContent='View profile';
   btn.setAttribute('aria-label','View '+player.name+' player profile');
   btn.onclick=()=>openProfile(player);
   nameCell.appendChild(btn);
 });
};
