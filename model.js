import { originFor, stops, walkMinutes } from './places.js';
/* All listing attributes and walk times are authored scenarios, November 2026. */
export const destinations = ['Central Campus', 'North Campus', 'Kerrytown'];
export const homes = [
  {id:'a', mark:'A', name:'The Monroe', area:'Central Campus', type:'Studio', rent:1040, utilities:80, minutes:[5,45,18], color:'#c0fb79', palette:['#b9a788','#8e795c','#625642'], form:0, x:5.5, y:7.5},
  {id:'b', mark:'B', name:'Riverbend Flats', area:'North Campus', type:'Private room', rent:855, utilities:95, minutes:[48,6,37], color:'#a8b7ff', palette:['#aab7be','#798b98','#526672'], form:1, x:6.5, y:1.5},
  {id:'c', mark:'C', name:'Market House', area:'Kerrytown', type:'Private room', rent:985, utilities:75, minutes:[18,36,4], color:'#ffb583', palette:['#c59985','#9e6c59','#714a41'], form:2, x:1.5, y:5.5}
];
export const presets = {
  central:{days:[4,1,0], budget:1350, value:18},
  north:{days:[1,4,0], budget:1350, value:18},
  market:{days:[2,0,4], budget:1150, value:18}
};
export const cash = n => '$' + Math.round(n).toLocaleString('en-US');
// Illustrative weekday service, based on operator route geography.
// Access, ride, headways and departure offsets are scenario inputs.
const blue = (from, to, access, ride, exit, phase) =>
  ({route:'Bursley–Baits', from, to, access, ride, exit, phase, headway:10});
const ride23 = (from, to, access, ride, exit, phase) =>
  ({route:'TheRide 23', from, to, access, ride, exit, phase, headway:30});
const cctc = 'Central Campus Transit Center';
const pierpont = 'Pierpont Commons';
const downtown = 'Fifth & Washington';
const plymouth = 'Plymouth & Barton';
const transitRoutes = {
  a: {1:[blue(cctc,pierpont,6,12,3,0), ride23(cctc,plymouth,6,17,8,3)]},
  b: {0:[blue(pierpont,'Rackham',5,13,4,5), ride23(plymouth,cctc,7,17,3,9)],
      2:[ride23(plymouth,downtown,7,24,9,9)]},
  c: {0:[ride23(downtown,cctc,9,8,3,0)],
      1:[blue('Glen & Catherine',pierpont,13,10,3,4), ride23(downtown,plymouth,9,24,8,0)]}
};
const intercampus = [blue(cctc,pierpont,4,12,3,0), ride23(cctc,plymouth,4,17,8,3)];

export function busOptions(home, destination, returning = false) {
  const source = home.transitArea ?? home.id;
  const routes = (transitRoutes[source]?.[destination] ?? []).map(route => ({
    ...route, access:Math.max(2,route.access+(home.stopOffset ?? 0))
  }));
  if (!returning) return routes;
  return routes.map(route => ({
    ...route, from:route.to, to:route.from,
    access:route.exit, exit:route.access, phase:(route.phase + 5) % route.headway,
    ...(source === 'b' && route.route === 'Bursley–Baits' ? {from:cctc} : {})
  }));
}

function estimateTrip(walk, routes, mode) {
  let best = {minutes:walk, label:'Walk'};
  if (mode !== 'transit' && mode !== 'missed') return best;
  for (const bus of routes) {
    const wait = mode === 'missed' ? bus.headway : bus.headway / 2;
    const minutes = bus.access + wait + bus.ride + bus.exit;
    if (minutes < best.minutes) best = {minutes, bus, wait, label:bus.route};
  }
  return best;
}

export function describeTrip(trip) {
  if (!trip.bus) return 'Walk · '+trip.minutes+' min';
  const {from,to,access,ride,exit} = trip.bus;
  return trip.label+' · '+from+' → '+to+' · '+access+' min walk + '+trip.wait+
    ' min wait + '+ride+' min ride + '+exit+' min walk';
}

export function customCommute(home,place,mode) {
  const origin = originFor(home);
  const destination = [place.lat,place.lon];
  const walk = walkMinutes(origin,destination);
  function direction(returning) {
    const start = returning ? destination : origin;
    const end = returning ? origin : destination;
    const routes = destinations.flatMap((_,i)=>busOptions(home,i,returning)).map(bus=>({
      ...bus, access:walkMinutes(start,stops[bus.from]), exit:walkMinutes(stops[bus.to],end)
    }));
    return estimateTrip(walk,routes,mode);
  }
  return {out:direction(false),back:direction(true)};
}

export function rankHomes(routine, inventory = homes, places = []) {
  return inventory.map(home => {
    const monthly = home.rent + home.utilities;
    const trips = home.minutes.map((walk,i) => ({
      out:estimateTrip(walk,busOptions(home,i),routine.mode),
      back:estimateTrip(walk,busOptions(home,i,true),routine.mode)
    }));
    trips.push(...places.map(place=>customCommute(home,place,routine.mode)));
    const weekly = trips.reduce((sum,trip,i) => sum + (trip.out.minutes + trip.back.minutes) * (routine.days[i] ?? places[i-destinations.length].visits),0);
    const burden = monthly + weekly * 4.33 / 60 * routine.value;
    return {...home, monthly, weekly, trips, burden, eligible:monthly <= routine.budget};
  }).sort((a,b) => Number(b.eligible)-Number(a.eligible) ||
    (!a.eligible ? a.monthly-b.monthly : 0) || a.burden-b.burden || a.monthly-b.monthly);
}

// Keep total campus visits fixed without exceeding either destination's input limit.
export function semesterBounds(days) {
  const total = days[0] + days[1];
  return { total, min: Math.max(0, total - 7), max: Math.min(7, total) };
}

export function semesterWeeks(routine, first, last, inventory=homes, places=[]) {
  const { total } = semesterBounds(routine.days);
  return Array.from({length: last - first + 1}, (_, offset) => {
    const north = first + offset;
    const options = rankHomes({...routine, days: [total - north, north, routine.days[2]]},inventory,places);
    const winner = options[0].eligible ? options[0] : null;
    const gaps = Object.fromEntries(options.filter(home => home.eligible)
      .map(home => [home.id, home.burden - winner.burden]));
    return {north, winner, gaps, options};
  });
}

export function semesterHedge(weeks) {
  const choices = weeks[0].options.filter(home => home.eligible).map(home => ({
    ...home,
    worstGap: Math.max(...weeks.map(week => week.gaps[home.id]))
  }));
  const weeklyWinner = weeks.length === 1 ? weeks[0].winner?.id : null;
  return choices.sort((a,b) => a.worstGap - b.worstGap ||
    Number(b.id === weeklyWinner) - Number(a.id === weeklyWinner) ||
    a.monthly - b.monthly || a.id.localeCompare(b.id))[0] ?? null;
}

export const classReplay = { lectureEnd: 11 * 60, labStart: 12 * 60 + 30, buffer: 5, minimum: 30, direct: 35 };

// Use clock-dependent departures in the Tuesday replay. Buses in this
// weekday scenario board between 07:00 and 22:00 at each modeled stop.
function scheduledTrip(walk, routes, clock, mode, backwards = false) {
  let best = {time:clock + (backwards ? -walk : walk), label:'Walk'};
  if (mode !== 'transit' && mode !== 'missed') return best;
  for (const bus of routes) {
    const first = 420 + bus.phase;
    const last = first + Math.floor((1320-first)/bus.headway)*bus.headway;
    const missed = mode === 'missed' ? bus.headway : 0;
    const departure = backwards
      ? Math.min(last, first + Math.floor((clock-bus.ride-bus.exit-first)/bus.headway)*bus.headway)
      : Math.max(first, first + Math.ceil((clock+bus.access-first)/bus.headway)*bus.headway) + missed;
    if (departure < first + (backwards ? missed : 0) || departure > last) continue;
    const time = backwards ? departure - missed - bus.access : departure + bus.ride + bus.exit;
    if (backwards ? time > best.time : time < best.time) {
      best = {time,label:bus.route+' via '+bus.from,bus,departure};
    }
  }
  return best;
}

export function replayDay(home, day) {
  const deadline = day.labStart - day.buffer;
  const inbound = scheduledTrip(home.minutes[0], busOptions(home,0,true), day.lectureEnd, day.mode);
  const outbound = scheduledTrip(home.minutes[1], busOptions(home,1), deadline, day.mode, true);
  const direct = scheduledTrip(day.direct, intercampus, day.lectureEnd, day.mode);
  const arriveHome = inbound.time;
  const leaveHome = outbound.time;
  return {arriveHome, leaveHome, free:Math.max(0,leaveHome-arriveHome), inbound, outbound, direct,
    directArrival:direct.time, directFits:direct.time <= deadline,
    fits:leaveHome-arriveHome >= day.minimum};
}

export function duration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + 'h' + (rest ? ' ' + rest + 'm' : '') : rest + 'm';
}
