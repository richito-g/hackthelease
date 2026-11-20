const housingNeeds = {
  quiet:'Quiet study space', furnished:'Furnished', pets:'Cats allowed',
  laundry:'In-unit laundry', parking:'Parking available', private:'Private unit'
};
const neighborhoods = {
  central:['Central Campus','a'], north:['North Campus','b'], market:['Kerrytown','c'],
  west:['Old West Side','c'], south:['South University','a'], burns:['Burns Park','a'],
  fuller:['Fuller Road','b'], downtown:['Downtown','c']
};
// Rent and utilities represent one student's share. All listing data is fictional.
const extraHomes = [
  ['Oak & Hill','south','Private room',875,75,[12,47,30],['furnished','laundry']],
  ['Packard Porch','burns','Private room',770,85,[20,53,35],['quiet','parking']],
  ['The Linden','south','Studio',1110,85,[11,45,29],['private','quiet','laundry']],
  ['East Quad Court','south','Private room',950,95,[7,42,24],['furnished','laundry','parking']],
  ['Arbor Avenue House','burns','Private room',820,90,[20,55,36],['pets','parking','quiet']],
  ['The Tappan','central','Studio',1210,90,[6,41,20],['private','furnished','laundry']],
  ['Jefferson Row','central','Private room',880,65,[10,46,18],['furnished','pets']],
  ['Liberty House','downtown','Studio',1150,85,[15,43,12],['private','pets','laundry']],
  ['Fourth & Washington','downtown','Private room',840,80,[18,46,8],['furnished','laundry']],
  ['The Observatory','central','Studio',1175,75,[13,31,25],['private','quiet','parking']],
  ['Miller Commons','west','Private room',735,95,[28,50,18],['quiet','parking','pets']],
  ['West Park Cottage','west','One bedroom',1220,100,[27,53,16],['private','pets','quiet','parking']],
  ['Washington Heights','fuller','Private room',865,100,[22,24,28],['quiet','furnished']],
  ['Fuller Crossing','fuller','Studio',1080,80,[26,17,32],['private','laundry','parking']],
  ['Plymouth Place','north','Private room',780,75,[54,14,43],['quiet','furnished','parking']],
  ['Murfin House','north','Studio',1060,90,[46,8,39],['private','quiet','laundry']],
  ['Barton Landing','north','Private room',805,75,[46,18,32],['pets','parking']],
  ['Broadway Terrace','fuller','One bedroom',1265,95,[30,21,16],['private','pets','laundry']],
  ['Catherine Court','market','Studio',1020,85,[20,34,7],['private','quiet','furnished']],
  ['Kingsley Carriage House','market','One bedroom',1325,95,[24,42,7],['private','quiet','pets','parking']],
  ['The Farmers Row','market','Private room',895,90,[21,39,5],['furnished','pets','laundry']]
];
const demoFeatures = [['private','laundry'],['quiet','parking','furnished'],['pets','laundry','furnished']];
const discoveryHomes = [
  ...homes.map((home,index) => ({...home,features:demoFeatures[index]})),
  ...extraHomes.map(([name,neighborhood,type,rent,utilities,minutes,features],index) => {
    const [area,transitArea] = neighborhoods[neighborhood];
    const study = homes[(index+1)%homes.length];
    return {id:'listing-'+index,name,area,type,rent,utilities,minutes,features,transitArea,
      stopOffset:index%7-2,form:study.form,palette:study.palette,color:study.color};
  })
];
const deckKey = 'homebase.discovery.v1';
const deckState = {swipes:[], needs:[], onlyFit:false};
try {
  const saved = JSON.parse(localStorage.getItem(deckKey));
  if (saved && Array.isArray(saved.swipes)) {
    const used = new Set();
    deckState.swipes = saved.swipes.filter(entry => {
      if (!entry || used.has(entry.id) || !discoveryHomes.some(home=>home.id===entry.id) ||
          !['save','pass'].includes(entry.action)) return false;
      used.add(entry.id);
      return true;
    });
    deckState.needs = Array.isArray(saved.needs) ? saved.needs.filter(need => Object.hasOwn(housingNeeds,need)) : [];
    deckState.onlyFit = saved.onlyFit === true;
  }
} catch {}
let showingSaved = false;
let currentHome;
const cardStage = $('#card-stage');
const savedHomes = $('#saved-homes');
const saveButton = $('#save-home');
const passButton = $('#pass-home');
const undoButton = $('#undo-swipe');

function persistDeck() {
  try { localStorage.setItem(deckKey, JSON.stringify(deckState)); } catch {}
}
function ratedDiscovery() {
  return rankHomes(routine,discoveryHomes).map(home => ({
    ...home, missing:deckState.needs.filter(need => !home.features.includes(need))
  })).sort((a,b)=>Number(b.eligible)-Number(a.eligible) || a.missing.length-b.missing.length);
}
function fitDescription(home) {
  const reasons = home.missing.length ? ['Missing: '+home.missing.map(need=>housingNeeds[need]).join(', ')] : [];
  if (!home.eligible) reasons.unshift(cash(home.monthly-routine.budget)+' over budget');
  if (reasons.length) return reasons.join(' · ');
  return deckState.needs.length ? 'Within budget · Meets all must-haves' : 'Within budget';
}
function listingStats(home) {
  const difference = routine.budget - home.monthly;
  return '<dl class="listing-stats"><div><dt>Monthly housing</dt><dd>'+cash(home.monthly)+'<small>'+cash(home.rent)+' rent + '+cash(home.utilities)+' utilities</small></dd></div>'+
    '<div><dt>'+ (difference < 0?'Over budget':'Budget left') +'</dt><dd>'+cash(Math.abs(difference))+'<small>of your '+cash(routine.budget)+' cap</small></dd></div>'+
    '<div><dt>Weekly travel</dt><dd>'+walkTime(home.weekly)+'<small>'+routine.days.reduce((sum,visits)=>sum+visits,0)+' round trips</small></dd></div></dl>';
}
function campusStats(home) {
  return '<table class="listing-commutes"><caption>Estimated travel from this home</caption>'+
    '<thead><tr><th scope="col">Destination</th><th scope="col">One way</th><th scope="col">Per week</th></tr></thead><tbody>'+
    destinations.map((name,index)=>{
      const {out,back} = home.trips[index];
      const visits = routine.days[index];
      const total = (out.minutes+back.minutes)*visits;
      return '<tr><th scope="row">'+name+'<small>'+out.label+
        (out.bus?' · '+out.bus.from:'')+'</small></th>'+
        '<td><strong>'+out.minutes+' min</strong>'+(back.minutes!==out.minutes?'<small>'+back.minutes+' min back</small>':'')+'</td>'+
        '<td><strong>'+walkTime(total)+'</strong><small>'+visits+(visits===1?' visit':' visits')+'</small></td></tr>';
    }).join('')+'</tbody></table>';
}
function listingCard(home) {
  const features = home.features.map(key=>'<span>'+housingNeeds[key]+'</span>').join('');
  return '<article class="swipe-card" tabindex="0" aria-label="'+home.name+'">'+
    '<div class="listing-art"><canvas aria-hidden="true"></canvas><span class="listing-area">'+home.area+'</span><span class="art-caption">Illustration</span><span class="gesture-label" aria-hidden="true"></span></div>'+
    '<div class="listing-body"><h2>'+home.name+'</h2><p class="listing-type">'+home.type+'</p>'+
    '<p class="listing-fit '+(home.eligible&&!home.missing.length?'fits':'')+'">'+fitDescription(home)+'</p>'+listingStats(home)+campusStats(home)+
    '<div class="listing-features">'+features+'</div></div></article>';
}
function renderDeck() {
  const all = ratedDiscovery();
  const reviewed = new Set(deckState.swipes.map(entry=>entry.id));
  const saved = new Set(deckState.swipes.filter(entry=>entry.action==='save').map(entry=>entry.id));
  const available = all.filter(home => !reviewed.has(home.id) &&
    (!deckState.onlyFit || (home.eligible && !home.missing.length)));
  currentHome = available[0];
  $('#saved-count').textContent = saved.size;
  const routineRows = [['Monthly cap',cash(routine.budget)], ...destinations.map((name,index) => {
    const visits = routine.days[index];
    return [name, visits + (visits===1?' visit/wk':' visits/wk')];
  })];
  $('#deck-routine').innerHTML = routineRows.map(([label,value]) =>
    '<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('');
  $('#deck-progress').textContent = available.length+' available to swipe · '+reviewed.size+' reviewed';
  $('#browse-deck').setAttribute('aria-pressed',String(!showingSaved));
  $('#browse-saved').setAttribute('aria-pressed',String(showingSaved));
  $('.discover-grid').hidden = showingSaved;
  savedHomes.hidden = !showingSaved;
  undoButton.disabled = !deckState.swipes.length;
  saveButton.disabled = passButton.disabled = !currentHome;
  if (showingSaved) {
    const matches = all.filter(home=>saved.has(home.id));
    savedHomes.innerHTML = matches.length ? matches.map(home =>
      '<article class="saved-home"><div><h3>'+home.name+'</h3><p>'+home.area+' · '+home.type+'</p><p>'+fitDescription(home)+'</p>'+
      '<button class="secondary" data-remove-home="'+home.id+'">Remove from saved</button></div>'+
      listingStats(home)+campusStats(home)+'</article>'
    ).join('') : '<div class="deck-empty"><h3>No saved homes yet.</h3><p>Save a listing to compare it here.</p></div>';
    return;
  }
  cardStage.innerHTML = currentHome ? listingCard(currentHome) :
    '<div class="deck-empty"><h3>'+ (deckState.onlyFit?'No more matching homes.':'You’ve reviewed all 24 homes.') +'</h3>'+
    '<p>'+ (deckState.onlyFit?'Edit your campus routine or must-haves to see more listings.':'Open Saved or return the homes you passed on to the deck.') +'</p>'+
    '<button class="secondary" id="review-passed">Review passed homes again</button></div>';
  if (currentHome) {
    miniature(cardStage.querySelector('canvas'),currentHome);
    attachSwipe(cardStage.querySelector('.swipe-card'));
  }
}
function actOnHome(action) {
  if (!currentHome || showingSaved) return;
  const focusListing = document.activeElement === cardStage.querySelector('.swipe-card');
  const {id,name} = currentHome;
  deckState.swipes.push({id,action});
  persistDeck();
  renderDeck();
  if (focusListing) (cardStage.querySelector('.swipe-card') ?? undoButton).focus({preventScroll:true});
  $('#deck-status').textContent = (action==='save'?'Saved ':'Passed on ')+name+'. '+
    (currentHome?'Up next is '+currentHome.name+'.':'You reached the end of the deck.');
}
function attachSwipe(card) {
  let start;
  card.addEventListener('keydown',event=>{
    if (event.repeat || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    actOnHome(event.key==='ArrowRight'?'save':'pass');
  });
  card.addEventListener('pointerdown',event=>{
    if (!event.isPrimary || event.button!==0) return;
    start = {x:event.clientX,y:event.clientY};
    card.setPointerCapture(event.pointerId);
  });
  card.addEventListener('pointermove',event=>{
    if (!start) return;
    const x = event.clientX-start.x;
    const y = event.clientY-start.y;
    if (Math.abs(y)>Math.abs(x) && Math.abs(x)<25) return;
    card.dataset.dragging = '';
    card.style.setProperty('--drag',x+'px');
    card.style.setProperty('--tilt',Math.max(-12,Math.min(12,x/14))+'deg');
    card.dataset.gesture = Math.abs(x)>35 ? (x>0?'save':'pass') : '';
  });
  function clear() {
    start = undefined;
    card.style.removeProperty('--drag');
    card.style.removeProperty('--tilt');
    delete card.dataset.gesture;
    delete card.dataset.dragging;
  }
  card.addEventListener('pointerup',event=>{
    if (!start) return;
    const x = event.clientX-start.x;
    const y = event.clientY-start.y;
    clear();
    if (Math.abs(x) >= 70 && Math.abs(x)>Math.abs(y)) actOnHome(x>0?'save':'pass');
  });
  card.addEventListener('pointercancel',clear);
  card.addEventListener('lostpointercapture',clear);
}
$('#housing-needs').innerHTML = Object.entries(housingNeeds).map(([key,label]) =>
  '<label><input type="checkbox" value="'+key+'"'+(deckState.needs.includes(key)?' checked':'')+'>'+label+'</label>'
).join('');
$('#housing-needs').addEventListener('change', () => {
  deckState.needs = [...document.querySelectorAll('#housing-needs input:checked')].map(input=>input.value);
  persistDeck();
  renderDeck();
});
$('#only-fit').checked = deckState.onlyFit;
$('#only-fit').addEventListener('change',event=>{
  deckState.onlyFit = event.currentTarget.checked;
  persistDeck();
  renderDeck();
});
$('#browse-deck').addEventListener('click',()=>{showingSaved=false;renderDeck();});
$('#browse-saved').addEventListener('click',()=>{showingSaved=true;renderDeck();});
saveButton.addEventListener('click',()=>actOnHome('save'));
passButton.addEventListener('click',()=>actOnHome('pass'));
undoButton.addEventListener('click',()=>{
  const entry = deckState.swipes.pop();
  if (!entry) return;
  persistDeck();
  renderDeck();
  $('#deck-status').textContent = 'Undid the last swipe.';
});
cardStage.addEventListener('click',event=>{
  if (event.target.id!=='review-passed') return;
  deckState.swipes = deckState.swipes.filter(entry=>entry.action==='save');
  persistDeck();
  renderDeck();
});
savedHomes.addEventListener('click',event=>{
  const button = event.target.closest('[data-remove-home]');
  if (!button) return;
  deckState.swipes = deckState.swipes.filter(entry=>entry.id!==button.dataset.removeHome);
  persistDeck();
  renderDeck();
  $('#browse-saved').focus();
});
document.addEventListener('homebase:render',renderDeck);
new ResizeObserver(() => {
  const canvas = cardStage.querySelector('canvas');
  if (!showingSaved && currentHome && canvas) miniature(canvas,currentHome);
}).observe(cardStage);

// Hash links keep the swipe deck, lab and replay independently shareable.
function showHomebaseView() {
  const hash = location.hash;
  const view = ['#semester','#replay'].includes(hash) ? hash : '#discover';
  $('#discover').hidden = view !== '#discover';
  $('#semester-view').hidden = view !== '#semester';
  $('#replay').hidden = view !== '#replay';
  document.querySelectorAll('.topbar nav a').forEach(link => {
    if (link.hash === view) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  if (view === '#discover') renderDeck();
  if (view === '#semester') draw();
  requestAnimationFrame(() => window.scrollTo(0,0));
}
window.addEventListener('hashchange',showHomebaseView);
showHomebaseView();
