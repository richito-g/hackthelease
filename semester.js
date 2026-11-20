const commuteMode = $('#commute-mode');
const northDial = $('#north-days');
const firstNorth = $('#first-north');
const lastNorth = $('#last-north');
const uncertainty = $('#uncertainty');
let rangeKey;

function applySemesterWeek(north) {
  const {total} = semesterBounds(routine.days);
  routine = {...routine, days:[total - north, north, routine.days[2]]};
  showRoutine();
}

function showRoutine() {
  try { localStorage.setItem('homebase.routine.v1', JSON.stringify(routine)); } catch {}
  selected = rankHomes(routine)[0].id;
  render();
}

function renderSemester() {
  const {min, max, total} = semesterBounds(routine.days);
  const [, north, kerrytown] = routine.days;
  commuteMode.value = routine.mode ?? 'walk';
  northDial.min = min;
  northDial.max = max;
  northDial.value = north;
  northDial.disabled = min === max;
  $('#north-output').value = north;
  $('#range-min').textContent = min + ' North';
  $('#range-max').textContent = max + ' North';
  $('#weekly-assumptions').textContent = (total - north) + ' Central · ' + north + ' North · ' + kerrytown +
    ' Kerrytown. ' + cash(routine.budget) + '/mo cap · ' + cash(routine.value) + '/hr saved.';
  $('#week-chips').innerHTML = routine.days.map((count, index) =>
    Array.from({length:count}, () => '<span class="campus-chip campus-'+index+'">'+['Central','North','Kerrytown'][index]+'</span>').join('')
  ).join('') || '<span class="lab-note">No campus visits scheduled.</span>';
  if (rangeKey !== total) {
    const options = Array.from({length:max - min + 1}, (_, i) =>
      '<option value="'+(min+i)+'">'+(min+i)+'</option>').join('');
    firstNorth.innerHTML = options;
    lastNorth.innerHTML = options;
    lastNorth.value = total === 5 ? 4 : max;
    rangeKey = total;
  }
  const best = ranked[0];
  const endpoints = [min,max].flatMap(day => semesterWeeks(routine, day, day)[0].options);
  const maximum = Math.max(1, ...endpoints.map(home => home.weekly));
  const previousBars = new Map(Array.from(document.querySelectorAll('[data-walk-bar]'),
    bar => [bar.dataset.walkBar, bar.style.getPropertyValue('--fill')]));
  $('#week-results').innerHTML = '<div class="mini-label">' +
    (best.eligible?'BEST FIT · '+best.name:'NO HOME WITHIN BUDGET') + '</div>' +
    homes.map(home => {
      const result = ranked.find(option => option.id === home.id);
      return '<div class="week-bar"><div><span>'+home.name+'</span><b>'+walkTime(result.weekly)+'/wk</b></div>' +
        '<div class="bar-track"><span data-walk-bar="' + home.id + '" style="--fill:'+(result.weekly/maximum*100)+'%;--tone:'+home.color+'"></span></div></div>';
    }).join('');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-walk-bar]').forEach(bar => {
      const from = previousBars.get(bar.dataset.walkBar);
      const to = bar.style.getPropertyValue('--fill');
      if (from && from !== to) bar.animate([{width:from},{width:to}], {duration:180,easing:'ease-out'});
    });
  }
  if (!uncertainty.hidden) renderUncertainty();
}

function renderUncertainty() {
  const weeks = semesterWeeks(routine, Number(firstNorth.value), Number(lastNorth.value));
  const hedge = semesterHedge(weeks);
  const grid = $('#gap-grid');
  if (!hedge) {
    $('#hedge-result').textContent = 'All homes exceed your cap. '+ranked[0].name+' comes closest at '+
      cash(ranked[0].monthly-routine.budget)+' over per month.';
    grid.innerHTML = '';
    return;
  }
  const wins = weeks.filter(week => week.winner.id === hedge.id).length;
  $('#hedge-result').innerHTML = '<strong>'+hedge.name+'</strong> has the smallest worst-case gap at <strong>'+cash(hedge.worstGap)+'</strong> per month.'+
    (wins === 0 ? ' It never comes first in this range.' : '');
  const maxGap = Math.max(1, ...weeks.flatMap(week => Object.values(week.gaps)));
  grid.innerHTML = '<table><caption>Monthly gap from each week’s best fit</caption><thead><tr><th scope="col">Apartment</th>'+
    weeks.map(week => '<th scope="col">'+week.north+' North</th>').join('')+
    '<th scope="col">Worst gap</th></tr></thead><tbody>'+homes.map(home => {
      const eligible = home.id in weeks[0].gaps;
      const worst = eligible ? Math.max(...weeks.map(week => week.gaps[home.id])) : null;
      return '<tr><th scope="row">'+home.name+(home.id===hedge.id?' <span class="hedge-label">SMALLEST GAP</span>':'')+'</th>'+
        weeks.map(week => {
          if (!eligible) return '<td>—</td>';
          const gap = week.gaps[home.id];
          const isBest = week.winner.id === home.id;
          return '<td><button class="gap-cell '+(gap===worst?'worst':'')+'" style="--heat:'+(gap/maxGap).toFixed(3)+'" data-gap-week="'+week.north+'" data-gap-home="'+home.id+'" aria-label="'+home.name+', '+week.north+' North visits, '+cash(gap)+' gap'+(isBest?', best fit':'')+'" aria-pressed="'+(week.north===routine.days[1])+'">'+cash(gap)+(isBest?'<small>BEST</small>':'')+'</button></td>';
        }).join('')+'<td><strong>'+(eligible?cash(worst):'Over cap')+'</strong></td></tr>';
    }).join('')+'</tbody></table>';
}

commuteMode.addEventListener('change', () => {
  routine = {...routine, mode:commuteMode.value};
  showRoutine();
});
northDial.addEventListener('input', () => applySemesterWeek(northDial.valueAsNumber));
northDial.addEventListener('change', () => {
  $('#announce').textContent = ranked[0].eligible ? ranked[0].name+' is the best fit this week.' : 'All homes exceed budget.';
});
$('#semester-reset').addEventListener('click', () => {
  routine = structuredClone(presets.central);
  rangeKey = undefined;
  showRoutine();
});
$('#toggle-uncertainty').addEventListener('click', event => {
  uncertainty.hidden = !uncertainty.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!uncertainty.hidden));
  if (!uncertainty.hidden) renderUncertainty();
});
firstNorth.addEventListener('change', () => {
  if (+firstNorth.value > +lastNorth.value) lastNorth.value = firstNorth.value;
  renderUncertainty();
});
lastNorth.addEventListener('change', () => {
  if (+lastNorth.value < +firstNorth.value) firstNorth.value = lastNorth.value;
  renderUncertainty();
});
$('#gap-grid').addEventListener('click', event => {
  const cell = event.target.closest('[data-gap-week]');
  if (!cell) return;
  const {gapWeek, gapHome} = cell.dataset;
  applySemesterWeek(Number(gapWeek));
  $('#gap-grid').querySelector('[data-gap-week="'+gapWeek+'"][data-gap-home="'+gapHome+'"]').focus({preventScroll:true});
  $('#announce').textContent = 'Atlas updated for '+gapWeek+' North Campus visits.';
});

const lectureInput = $('#lecture-end');
const labInput = $('#lab-start');
const minimumInput = $('#home-minimum');
const earlierLab = $('#earlier-lab');
const readMinutes = input => input.valueAsNumber / 60000;
function clockTime(minute) {
  const hour = Math.floor(minute / 60);
  return (hour % 12 || 12)+':'+String(minute % 60).padStart(2,'0')+(hour < 12?' AM':' PM');
}

function renderReplay() {
  const day = {...classReplay, lectureEnd:readMinutes(lectureInput), labStart:readMinutes(labInput), minimum:minimumInput.valueAsNumber, mode:routine.mode};
  const result = $('#replay-result');
  const lanes = $('#replay-lanes');
  earlierLab.disabled = !labInput.validity.valid || day.labStart < 4 || day.labStart - 4 <= day.lectureEnd;
  if (![lectureInput,labInput,minimumInput].every(input => input.validity.valid) || day.labStart <= day.lectureEnd) {
    result.textContent = 'Enter a valid minimum and a lab start after the lecture ends.';
    lanes.innerHTML = '';
    return;
  }
  const gap = day.labStart - day.lectureEnd;
  const outcomes = homes.map(home => ({home, ...replayDay(home, day)}));
  const feasible = outcomes.filter(outcome => outcome.fits);
  const direct = outcomes[0];
  const summary = feasible.length === 1 ? 'Only '+feasible[0].home.name+' leaves at least '+day.minimum+' minutes at home.'
    : feasible.length === homes.length ? 'All three homes leave at least '+day.minimum+' minutes at home.'
    : feasible.length ? feasible.map(option => option.home.name).join(' and ')+' leave enough time at home.'
    : 'None of the three detours leaves enough time at home.';
  result.textContent = summary+' '+(direct.directFits?'Fastest direct trip arrives at '+clockTime(direct.directArrival)+' · '+direct.direct.label+'.':'The fastest direct trip misses the arrival buffer.');
  lanes.innerHTML = '<div class="timeline-scale"><span>'+clockTime(day.lectureEnd)+' · lecture ends</span><span>Lab starts · '+clockTime(day.labStart)+'</span></div>'+
    outcomes.map(({home, arriveHome, leaveHome, free, fits, inbound, outbound}) => {
      const detourPossible = leaveHome >= arriveHome;
      const segments = detourPossible ? [arriveHome-day.lectureEnd, free, day.labStart-day.buffer-leaveHome, day.buffer] : [gap];
      return '<div class="replay-lane"><div class="lane-head"><strong>'+home.name+'</strong><span class="'+(fits?'fits':'misses')+'">'+
        (detourPossible?free+' min at home':'Detour exceeds gap')+'</span></div>'+
        '<div class="timeline-track '+(detourPossible?'':'clipped')+'" aria-hidden="true">'+segments.map((minutes,index) =>
          '<span class="segment segment-'+index+'" style="width:'+(minutes/gap*100)+'%;--home:'+home.color+'"></span>').join('')+'</div>'+
        '<div class="lane-detail">'+(detourPossible?'Home '+clockTime(arriveHome)+' ('+inbound.label+') · Leave '+clockTime(leaveHome)+' ('+outbound.label+')':'Travel and arrival buffer exceed the available time.')+'</div></div>';
    }).join('')+
    '<div class="timeline-key"><span>Travel</span><span>Time at home</span><span>Arrival buffer</span></div>';
}
[lectureInput,labInput,minimumInput].forEach(input => input.addEventListener('input', renderReplay));
earlierLab.addEventListener('click', () => {
  labInput.valueAsNumber -= 4 * 60000;
  renderReplay();
});
document.addEventListener('homebase:render', () => { renderSemester(); renderReplay(); });
renderSemester();
renderReplay();
