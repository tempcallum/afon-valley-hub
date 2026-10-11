
/* Past results are kept with fixtures: no extra primary navigation tab. */
function avfcResultsDate(value){
 return new Date(value).toLocaleDateString('en-GB',{
  timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'
 });
}
function avfcResultsResult(m){
 const home=m.home_away==='home';
 const afon=home?Number(m.home_goals):Number(m.away_goals);
 const other=home?Number(m.away_goals):Number(m.home_goals);
 return {afon,other,outcome:afon>other?'W':afon<other?'L':'D'};
}
function avfcResultsSeasonMatches(matches){
 const now=new Date();const year=now.getUTCFullYear()-(now.getUTCMonth()<6?1:0);
 const seasonStart=new Date(Date.UTC(year,5,30,23,0,0));
 return matches.filter(m=>new Date(m.match_date)>=seasonStart);
}
const avfcResultsOriginalAvailability=availability;
availability=async function(){
 await avfcResultsOriginalAvailability();
 const top=$('#content .availability-switch');
 if(!top||!profile?.approved||!top.isConnected)return;
 if(top.querySelector('[data-avfc-results]'))return;
 const button=document.createElement('button');
 button.type='button';button.dataset.avfcResults='1';button.textContent='Results';
 top.appendChild(button);
 button.onclick=()=>avfcRenderPreviousResults();
};
async function avfcRenderPreviousResults(){
 const root=$('#content');
 if(!root||!profile?.approved)return;
 root.innerHTML='<div class="panel empty">Loading previous results…</div>';
 const [mr,ar]=await Promise.all([
  sb.from('matches').select('id,match_date,opponent,home_away,venue,notes,home_goals,away_goals')
   .lt('match_date',new Date().toISOString()).order('match_date',{ascending:false}).limit(150),
  sb.from('match_player_awards').select('match_id,award_type,player_id,players(name)').limit(400)
 ]);
 if(!root.isConnected)return;
 if(mr.error){root.innerHTML='<div class="panel empty">Could not load results. Please try again.</div>';return}
 const played=mr.data||[],recorded=played.filter(m=>m.home_goals!==null&&m.away_goals!==null);
 const current=avfcResultsSeasonMatches(recorded);
 const totals={W:0,D:0,L:0};
 current.forEach(m=>totals[avfcResultsResult(m).outcome]++);
 const awardMap=new Map();
 for(const award of ar.data||[]){
  let record=awardMap.get(Number(award.match_id));
  if(!record){record={};awardMap.set(Number(award.match_id),record)}
  record[award.award_type]=String(award.players?.name||'');
 }
 const canEdit=!isPlayerView()&&['chair','manager'].includes(profile.role);
 root.innerHTML=
  '<div class="availability-switch avfc-results-nav">'+
   '<button type="button" data-avfc-back="matches">Matches</button>'+
   '<button type="button" data-avfc-back="training">Training</button>'+
   '<button type="button" class="active" aria-current="page">Results</button></div>'+
  '<section class="avfc-results-panel">'+
  '<div class="avfc-results-title"><div><span class="eyebrow dark">2026/27 SEASON</span><h3>Previous results</h3>'+
  '<p>Final scores for Afon Valley FC</p></div>'+
  '<span class="avfc-results-count">'+recorded.length+' recorded</span></div>'+
  '<div class="avfc-results-form-summary"><div><b>'+totals.W+'</b><small>Wins</small></div>'+
  '<div><b>'+totals.D+'</b><small>Draws</small></div>'+
  '<div><b>'+totals.L+'</b><small>Losses</small></div></div>'+
  (recorded.length?
   '<div class="avfc-results-list">'+recorded.map(m=>{
    const home=m.home_away==='home',r=avfcResultsResult(m);
    const a=awardMap.get(Number(m.id))||{};
    return '<article class="avfc-results-game">'+
      '<div class="avfc-results-date">'+esc(avfcResultsDate(m.match_date))+
      '<small>'+esc(home?'Home':'Away')+'</small></div>'+
      '<div class="avfc-results-opponent"><strong>'+esc(m.opponent)+'</strong>'+
      '<small>'+esc(m.venue||'Venue not recorded')+'</small>'+
      ((a.motm||a.dotd)?'<small class="avfc-results-awards">'+
       (a.motm?'MOTM: '+esc(a.motm):'')+
       (a.motm&&a.dotd?' · ':'')+
       (a.dotd?'DOTD: '+esc(a.dotd):'')+'</small>':'')+
      '</div>'+
      '<div class="avfc-results-score">'+
      '<b>'+r.afon+' – '+r.other+'</b>'+
      '<span class="avfc-results-outcome '+r.outcome.toLowerCase()+'">'+
      (r.outcome==='W'?'WIN':r.outcome==='D'?'DRAW':'LOSS')+'</span></div>'+
      '</article>';
   }).join('')+'</div>':
   '<p class="avfc-results-empty">No results have been recorded yet.</p>')+
   (canEdit?'<details class="avfc-results-editor"><summary>Add or update a match score</summary>'+
    '<form id="avfcResultForm">'+
    '<label>Fixture<select name="match" id="avfcResultFixture" required>'+
    played.map(m=>'<option value="'+m.id+'">'+esc(avfcResultsDate(m.match_date)+' · '+m.opponent)+'</option>').join('')+
    '</select></label>'+
    '<div class="avfc-results-score-inputs"><label>Home goals<input name="home" type="number" inputmode="numeric" min="0" max="99" step="1" required></label>'+
    '<label>Away goals<input name="away" type="number" inputmode="numeric" min="0" max="99" step="1" required></label></div>'+
    '<p class="muted">Enter the actual home and away goals, even if Afon Valley were the away team. Only the Chair and Team Manager can record results.</p>'+
    '<button class="btn primary" type="submit">Save result</button></form></details>':'')+
   '<p class="avfc-results-footnote">Awards can be selected under Football → Player Stats. Matches without a confirmed score are not shown as final results.</p>'+
   '</section>';
 root.querySelectorAll('[data-avfc-back]').forEach(btn=>btn.onclick=()=>{
  availabilitySection=btn.dataset.avfcBack;
  availabilityShowAll=false;
  availability();
 });
 const form=root.querySelector('#avfcResultForm');
 if(!form)return;
 const matchSelect=form.querySelector('#avfcResultFixture');
 const homeInput=form.elements.home,awayInput=form.elements.away;
 const byId=new Map(played.map(m=>[Number(m.id),m]));
 function updateInputs(){
  const m=byId.get(Number(matchSelect.value));
  homeInput.value=m?.home_goals!==null&&m?.home_goals!==undefined?String(m.home_goals):'';
  awayInput.value=m?.away_goals!==null&&m?.away_goals!==undefined?String(m.away_goals):'';
 }
 matchSelect.onchange=updateInputs;updateInputs();
 form.onsubmit=async e=>{
  e.preventDefault();
  const id=Number(matchSelect.value),home=homeInput.value,away=awayInput.value;
  if(!id||home===''||away==='')return alert('Enter both scores.');
  const button=form.querySelector('button[type=submit]');
  button.disabled=true;button.textContent='Saving…';
  const {error}=await sb.rpc('save_match_result',{
   p_match_id:id,p_home_goals:Number(home),p_away_goals:Number(away)
  });
  if(error){button.disabled=false;button.textContent='Save result';return alert(error.message)}
  await avfcRenderPreviousResults();
 };
}
const avfcResultsOriginalHome=home;
home=async function(){
 await avfcResultsOriginalHome();
 if(!profile?.approved)return;
 const root=$('#content'),fixture=root?.querySelector('.match-feature');
 if(!fixture||!fixture.isConnected||tab!=='home')return;
 const {data,error}=await sb.from('matches')
 .select('id,match_date,opponent,home_away,home_goals,away_goals')
 .lt('match_date',new Date().toISOString())
 .not('home_goals','is',null).not('away_goals','is',null)
 .order('match_date',{ascending:false}).limit(1);
 if(error||!fixture.isConnected||tab!=='home'||!data?.length)return;
 const m=data[0],r=avfcResultsResult(m);
 const card=document.createElement('div');
 card.className='avfc-results-home';
 card.innerHTML='<div><small>LATEST RECORDED RESULT</small>'+
  '<strong>'+esc(m.opponent)+'</strong>'+
  '<span>Afon Valley '+r.afon+' – '+r.other+' '+esc(m.opponent)+
  ' · '+esc(avfcResultsDate(m.match_date))+'</span></div>'+
  '<div class="avfc-results-home-actions">'+
  '<span class="avfc-results-outcome '+r.outcome.toLowerCase()+'">'+
  (r.outcome==='W'?'WIN':r.outcome==='D'?'DRAW':'LOSS')+'</span>'+
  '<button type="button" class="avfc-results-home-link">All results</button></div>';
 fixture.insertAdjacentElement('afterend',card);
 const go=card.querySelector('button');
 go.onclick=()=>{tab='availability';drawNav();avfcRenderPreviousResults()};
};
