
/* One-time player setup checklist. Progress belongs to the player login, never local storage. */
const avfcOnboardingOriginalHome=home;
home=async function(){
  await avfcOnboardingOriginalHome();
  if(!profile?.approved||!isPlayerView()||!myPlayer)return;
  const area=$('#content');
  if(!area)return;
  const {data,error}=await sb.rpc('my_player_setup');
  if(error||!data||!area.isConnected)return;
  if(data.completed)return;
  const tasks=[
    {key:'emergency',label:'Save emergency details',detail:'Add your emergency contact',tab:'emergency'},
    {key:'notifications',label:'Switch on notifications',detail:'Get match and club updates',tab:'notifications'},
    {key:'availability',label:'Check match availability',detail:'Open your availability page',tab:'availability'},
    {key:'policies',label:'Open the Code of Conduct',detail:'Find it in Club Policies',tab:'policies'}
  ];
  const done=tasks.filter(x=>data[x.key]).length;
  if(done===tasks.length)return;
  const box=document.createElement('section');
  box.className='hub-setup-card';
  box.id='hubPlayerSetupChecklist';
  box.setAttribute('aria-label','Player setup checklist');
  box.innerHTML=
    '<div class="hub-setup-head"><div><span class="hub-setup-kicker">FIRST-TIME SETUP</span>'+
    '<h3>Get match ready</h3><p>Four quick things to finish your Hub setup.</p></div>'+
    '<span class="hub-setup-count">'+done+' / '+tasks.length+'</span></div>'+
    '<div class="hub-setup-track"><div class="hub-setup-fill" style="width:'+(done/tasks.length*100)+'%"></div></div>'+
    '<div class="hub-setup-rows">'+tasks.map(task=>{
      const complete=Boolean(data[task.key]);
      return '<div class="hub-setup-row '+(complete?'is-done':'')+'">'+
        '<span class="hub-setup-mark" aria-hidden="true">'+(complete?String(tasks.indexOf(task)+1):String(tasks.indexOf(task)+1))+'</span>'+
        '<div class="hub-setup-desc"><strong>'+esc(task.label)+'</strong>'+
        (!complete?'<small>'+esc(task.detail)+'</small>':'')+'</div>'+
        (complete?'<span class="hub-setup-status">Done</span>':
          '<button type="button" class="hub-setup-go" data-setup-go="'+task.tab+'">Go</button>')+
        '</div>';
    }).join('')+'</div>'+
    '<div class="hub-setup-bottom">Complete these once and this checklist disappears permanently.</div>';
  area.insertAdjacentElement('afterbegin',box);
  box.querySelectorAll('[data-setup-go]').forEach(button=>button.onclick=()=>{
    const dest=button.dataset.setupGo;
    if(!allowed().includes(dest))return;
    tab=dest;drawNav();render(dest);
  });
};
async function avfcPlayerSetupStep(step){
 if(!profile?.approved||!myPlayer||!isPlayerView())return;
 const {error}=await sb.rpc('my_player_setup',{p_action:step});
 if(error)console.warn('Unable to save player setup progress',error.message);
}
const avfcOnboardingOriginalRender=render;
render=async function(next){
 const result=await avfcOnboardingOriginalRender(next);
 if(next==='availability')await avfcPlayerSetupStep('availability');
 return result;
};
