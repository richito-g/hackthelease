const $ = sel => document.querySelector(sel);
const icons = {
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  sliders:'<path d="M3 6h6m4 0h8M3 12h11m4 0h3M3 18h3m4 0h11"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  focus:'<path d="M3 9V4h5m8 0h5v5m0 7v5h-5m-8 0H3v-5"/><circle cx="12" cy="12" r="2"/>',
  compare:'<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  star:'<path d="m12 2 2.6 6.6L21 11l-6.4 2.5L12 21l-2.6-7.5L3 11l6.4-2.4z"/>',
  bars:'<path d="M4 19V9m7 10V4m7 15v-7"/>'
};
function mountIcons(scope=document){scope.querySelectorAll('i[data-icon]').forEach(el=>{el.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+icons[el.dataset.icon]+'</svg>';});}
function valid(r) {return r && Number.isInteger(r.budget)&&r.budget>=0&&r.budget<=10000&&Number.isFinite(r.value)&&r.value>=0&&r.value<=100&&Array.isArray(r.days)&&r.days.length===3&&r.days.every(n=>Number.isInteger(n)&&n>=0&&n<=7);}
let routine=structuredClone(presets.central);
try{const saved=JSON.parse(localStorage.getItem('homebase.routine.v1'));if(valid(saved))routine={...saved,mode:['transit','missed'].includes(saved.mode)?saved.mode:'walk'};}catch{}
let ranked=rankHomes(routine),selected=ranked[0].id,draft;
const modal=$('#modal'),content=$('#modal-content');
const walkTime=m=>m>=60?Math.floor(m/60)+'h'+(m%60?' '+m%60+'m':''):m+'m';
const homeLabel=h=>h.area+' · '+h.type;
const eyebrow=t=>'<span class="eyebrow">'+t+'</span>';
function explain(h) {
  if(!h.eligible)return cash(h.monthly-routine.budget)+' over your monthly cap. '+(ranked.some(x=>x.eligible)?'An eligible home ranks ahead of this option.':'All three homes exceed your cap.');
  const next=ranked.find(x=>x.id!==h.id&&x.eligible);
  if(!next)return 'The only home within your '+cash(routine.budget)+' monthly cap.';
  const delta=next.weekly-h.weekly;
  const prices=h.monthly-next.monthly;
  if(delta>0){
    const cost=prices===0?'Costs the same':prices>0?'Costs '+cash(prices)+' more per month':'Costs '+cash(-prices)+' less per month';
    return cost+' and saves '+walkTime(delta)+' of travel per week versus '+next.name+'.';
  }
  if(prices<0)return 'Costs '+cash(-prices)+' less per month than '+next.name+' before valuing commute time.';
  return 'Compare its monthly cost and '+walkTime(h.weekly)+' weekly commute with '+next.name+'.';
}
function render() {
  ranked=rankHomes(routine);
  const h=ranked.find(a=>a.id===selected),winner=ranked[0],best=winner.id===h.id&&h.eligible;
  $('#spotlight').innerHTML='<div class="study"><canvas id="model" aria-label="Architectural illustration of '+h.name+'"></canvas><span class="tag"><i data-icon="'+(best?'star':'layers')+'"></i> '+(best?'YOUR BEST FIT':h.eligible?'SELECTED HOME':'OVER BUDGET')+'</span><span class="study-code">APT / '+h.mark+'</span></div><div class="spot-body"><h2>'+h.name+'</h2><div class="subline"><i data-icon="pin"></i>'+homeLabel(h)+'</div><div class="metrics"><div><b>'+cash(h.monthly)+'</b><small>Monthly housing</small></div><div><b>'+walkTime(h.weekly)+'</b><small>Weekly commute</small></div></div><p class="why">'+explain(h)+'</p><button class="primary" data-action="detail"><i data-icon="bars"></i> View fit breakdown</button></div>';
  $('#cards').innerHTML=ranked.map((x,i)=>'<button class="home-card '+(x.id===selected?'active':'')+'" data-home="'+x.id+'" aria-pressed="'+(x.id===selected)+'" style="--accent:'+x.color+'"><span class="card-top"><span class="index">'+x.mark+'</span> '+(!x.eligible?'OVER BUDGET':i===0?'BEST FIT':'RANK '+(i+1))+'</span><span><h3>'+x.name+'</h3><p>'+homeLabel(x)+'</p></span><canvas data-model="'+x.id+'" aria-hidden="true"></canvas><span class="card-foot"><span><b>'+cash(x.monthly)+'</b> / mo</span><span>'+walkTime(x.weekly)+' travel / wk</span></span></button>').join('');
  $('.legend').style.setProperty('--accent',h.color);
  mountIcons();draw();document.dispatchEvent(new Event("homebase:render"));
}
function draw(){
  drawAtlas(selected,routine.days,ranked[0].eligible?ranked[0].id:null);miniature($('#model'),homes.find(x=>x.id===selected));
  document.querySelectorAll('[data-model]').forEach(el=>miniature(el,homes.find(x=>x.id===el.dataset.model)));
}
$('#pins').innerHTML=homes.map(x=>'<button class="pin" data-home="'+x.id+'" data-id="'+x.id+'" aria-label="Select '+x.name+'" style="--accent:'+x.color+'"><span class="bubble"><span class="letter">'+x.mark+'</span>'+x.name+'</span></button>').join('');
function openDialog(html){
  content.innerHTML=html;mountIcons(content);
  if(!modal.open)modal.showModal();
  modal.scrollTop=0;
}
function comparison() {
  const rows=[
    ['Rent',h=>cash(h.rent)],['Utilities',h=>cash(h.utilities)],['Monthly housing',h=>cash(h.monthly)],
    ['Budget left',h=>h.eligible?cash(routine.budget-h.monthly):cash(h.monthly-routine.budget)+' over'],
    ...destinations.map((d,i)=>[d,h=>h.trips[i].out.minutes+' min out / '+h.trips[i].back.minutes+' back']),
    ['Weekly commute',h=>walkTime(h.weekly)],['Time-adjusted monthly cost',h=>cash(h.burden)]
  ];
  const best=ranked[0],next=ranked[1];
  let verdict='All options exceed your cap. '+best.name+' has the smallest shortfall at '+cash(best.monthly-routine.budget)+' per month.';
  if(best.eligible) verdict=next.eligible?best.name+' leads '+next.name+' by '+cash(next.burden-best.burden)+' per month after valuing your commute time.':best.name+' is the only home within your monthly cap.';
  openDialog(eyebrow('SIDE BY SIDE')+'<h2 id="modal-title">Compare homes.</h2><p>Times cover the full trip. Weekly totals include the return trip.</p><div class="table-wrap"><table><thead><tr><th scope="col">Your week</th>'+ranked.map(h=>'<th scope="col">'+h.name+'</th>').join('')+'</tr></thead><tbody>'+rows.map(([label,get])=>'<tr><th scope="row">'+label+'</th>'+ranked.map(h=>'<td>'+get(h)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><div class="insight">'+verdict+'</div><div class="modal-actions"><button class="secondary" data-action="method">How it works</button><button class="primary" data-action="routine">Edit my routine</button></div>');
}
function routeBreakdown(home, destination) {
  if (routine.mode !== 'transit' && routine.mode !== 'missed') return '';
  const alternatives = busOptions(home,destination).map(bus => {
    const wait = routine.mode === 'missed' ? bus.headway : bus.headway / 2;
    return describeTrip({bus,wait,label:bus.route});
  });
  return alternatives.length ? '<details class="trip-alternatives"><summary>Outbound bus options</summary><ul>'+
    alternatives.map(option => '<li>'+option+'</li>').join('')+'</ul></details>' : '';
}
function detail() {
  const h=ranked.find(x=>x.id===selected);
  openDialog(eyebrow('FIT BREAKDOWN · APT '+h.mark)+'<h2 id="modal-title">'+h.name+'</h2><p>'+homeLabel(h)+'</p><h3>Your housing costs</h3><div class="costrow">Rent + utilities<b>'+cash(h.rent)+' + '+cash(h.utilities)+'</b></div><div class="costrow">Monthly housing<b>'+cash(h.monthly)+'</b></div><div class="costrow">Monthly cap<b>'+cash(routine.budget)+'</b></div><h3>Your week from here</h3>'+destinations.map((d,i)=>'<div class="costrow"><div>'+d+'<p class="quiet">'+routine.days[i]+' round trips · Out: '+describeTrip(h.trips[i].out)+'<br>Back: '+describeTrip(h.trips[i].back)+'</p>'+routeBreakdown(h,i)+'</div><b>'+walkTime((h.trips[i].out.minutes+h.trips[i].back.minutes)*routine.days[i])+'</b></div>').join('')+'<div class="costrow">Weekly commute time<b>'+walkTime(h.weekly)+'</b></div><div class="insight">'+cash(h.monthly)+' housing + '+cash(h.burden-h.monthly)+' in time at '+cash(routine.value)+'/hour gives a time-adjusted monthly cost of <b>'+cash(h.burden)+'</b>.</div><p class="quiet">Fictional apartment and estimated trips · 4.33 weeks per month.</p><div class="modal-actions"><button class="primary" data-action="compare">Compare all homes</button></div>');
}
function methodology(){
  openDialog(eyebrow('MODEL NOTES')+'<h2 id="modal-title">Behind the fit.</h2><h3>What the numbers represent</h3><p>Apartment, walking, ride and wait times are illustrative. Stop names and corridors are based on published routes. Use operator schedules for a real trip. <a href="https://ltp.umich.edu/campus-transit/routes-and-schedules/bursley-baits/" target="_blank" rel="noopener">U-M Bursley–Baits</a> · <a href="https://www.theride.org/maps-schedules/route-maps-schedules-library" target="_blank" rel="noopener">TheRide schedules</a>.</p><h3>How we rank homes</h3><ol class="method-list"><li>Monthly housing is your share of rent plus utilities. A home qualifies when this total is within your cap.</li><li>For each direction, compare walking against bus access, wait, ride and the walk from the stop. Add both legs and multiply by weekly visits. Typical bus waits use half a headway. Longer waits use a full headway for weekly estimates and one missed departure in the replay.</li><li>Convert weekly travel hours to a monthly estimate using 4.33 weeks. Multiply by your chosen value of an hour, then add housing cost. Lower totals rank first among qualifying homes.</li><li>Over-budget homes follow in order of smallest budget shortfall. Equal adjusted costs favor lower housing costs.</li></ol><h3>Assumptions</h3><p>Each visit starts and ends at home. Linked trips, transit fares, weather, accessibility, deposits and lease terms are outside this model. The value of time expresses a preference and adds no cash expense. Your routine stays in this browser.</p>');
}
function refreshDraft(){
  content.querySelectorAll('[data-preset]').forEach(b=>{const p=presets[b.dataset.preset];b.classList.toggle('selected',draft.days.every((n,i)=>n===p.days[i]));});
  const first=rankHomes(draft)[0];
  $('#draft-summary').textContent=first.eligible?'Best fit for this routine · '+first.name+' · '+walkTime(first.weekly)+' in transit or walking per week.':'All homes exceed this cap. '+first.name+' comes closest, at '+cash(first.monthly-draft.budget)+' over.';
}
function routineForm() {
  const names={central:'Central-heavy',north:'North-heavy',market:'Kerrytown shifts'};
  openDialog(eyebrow('ROUTINE BUILDER')+'<h2 id="modal-title">Build your week.</h2><p>Choose a sample week or enter your own round trips from home.</p><div class="seg">'+Object.entries(names).map(([k,n])=>'<button type="button" data-preset="'+k+'">'+n+'</button>').join('')+'</div><form id="routine-form">'+destinations.map((d,i)=>'<div class="formrow"><label for="d'+i+'">'+d+'<small>Round trips per week</small></label><input type="number" id="d'+i+'" min="0" max="7" step="1" required value="'+draft.days[i]+'"></div>').join('')+'<div class="formrow"><label for="budget">Monthly housing cap<small>Rent and utilities in dollars</small></label><input id="budget" type="number" required min="0" max="10000" step="1" value="'+draft.budget+'"></div><div class="formrow"><label for="time-value">Value of one hour saved<small>Dollars per hour of travel avoided</small></label><input id="time-value" type="number" required min="0" max="100" step="1" value="'+draft.value+'"></div><div id="draft-summary" class="preview-note" aria-live="polite"></div><div class="modal-actions"><button class="primary" type="submit">Apply routine</button></div></form>');
  refreshDraft();
  $('#routine-form').addEventListener('input',()=>{const form=$('#routine-form');
    if(!form.checkValidity()){$('#draft-summary').textContent='Enter a valid value in each field to update the comparison.';return;}
    draft={...draft,days:destinations.map((_,i)=>$('#d'+i).valueAsNumber),budget:$('#budget').valueAsNumber,value:$('#time-value').valueAsNumber};refreshDraft();
  });
  $('#routine-form').addEventListener('submit',event=>{event.preventDefault();routine=structuredClone(draft);
    try{localStorage.setItem('homebase.routine.v1',JSON.stringify(routine));}catch{}
    selected=rankHomes(routine)[0].id;modal.close();render();$('#announce').textContent='Routine updated. '+ranked[0].name+' ranks first.';
  });
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button,a.brand');if(!button)return;
  if(button.matches('.close')){modal.close();return;}
  if(button.dataset.home){selected=button.dataset.home;render();if(button.classList.contains('home-card')){document.querySelector('.home-card[data-home="'+selected+'"]').focus({preventScroll:true});if(matchMedia('(max-width:700px)').matches)$('#spotlight').scrollIntoView({block:'start'});}$('#announce').textContent=homes.find(h=>h.id===selected).name+' selected.';return;}
  if(button.dataset.preset){draft={...draft,days:[...presets[button.dataset.preset].days]};routineForm();content.querySelector('[data-preset="'+button.dataset.preset+'"]').focus();return;}
  switch(button.dataset.action){
    case 'compare':comparison();break;
    case 'detail':detail();break;
    case 'method':methodology();break;
    case 'routine':draft=structuredClone(routine);routineForm();break;
    case 'explore':if(modal.open)modal.close();window.scrollTo(0,0);break;
  }
  if(['zoom-in','zoom-out','reset-map'].includes(button.id)){zoom=button.id==='reset-map'?1:Math.max(.8,Math.min(1.4,+(zoom+(button.id==='zoom-in'?.2:-.2)).toFixed(1)));drawAtlas(selected,routine.days,ranked[0].eligible?ranked[0].id:null);$('#zoom-in').disabled=zoom>=1.4;$('#zoom-out').disabled=zoom<=.8;}
});
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
render();new ResizeObserver(draw).observe($('.workspace'));
