import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { drawAtlas } from '../atlas.js';
import { busOptions, cash, classReplay, describeTrip, destinations, duration, homes, presets,
  rankHomes, replayDay, semesterBounds, semesterHedge, semesterWeeks } from '../model.js';
import { CampusStats, Dialog, ListingStats, Study } from './ui.jsx';

// Positions on the illustrated atlas are neighborhood anchors, not street addresses.
const atlasAreas = {
  'Central Campus':[5.5,7.5], 'North Campus':[6.5,1.5], Kerrytown:[1.5,5.5],
  'Old West Side':[2.2,7.6], Downtown:[3.4,6.6], 'South University':[7.4,7.1],
  'Burns Park':[8.7,8.1], 'Fuller Road':[6,4.4]
};
import { discoveryHomes } from './listings.js';

function Atlas({inventory,selected,winner,days,onSelect}) {
  const ref = useRef(null);
  const [zoom,setZoom] = useState(1);
  const [openArea,setOpenArea]=useState(null);
  const [pins,setPins] = useState([]);
  useLayoutEffect(()=>{
    const canvas = ref.current;
    const draw = () => {
      const markers=drawAtlas(canvas,selected,days,zoom,inventory);
      if (markers) setPins(markers);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return ()=>observer.disconnect();
  },[selected,days,zoom,inventory]);
  const groups=new Map();
  for (const pin of pins) {
    const home=inventory.find(item=>item.id===pin.id);
    if (!home) continue;
    if (!groups.has(home.area)) groups.set(home.area,{point:pin.point,items:[]});
    groups.get(home.area).items.push(home);
  }
  const choices=groups.get(openArea)?.items;
  return <div className="atlas">
    <canvas id="city" ref={ref} role="img" aria-label="Schematic Ann Arbor map and campus connections" />
    <div id="pins">{Array.from(groups,([area,{point:[left,top],items}])=>{
      const chosen=items.find(item=>item.id===selected);
      const home=chosen ?? items[0];
      const shared=items.length>1;
      const title=shared ? area+' · '+items.length+' homes' : home.name;
      return <button className={'pin '+(chosen?'chosen ':'')+(items.some(i=>i.id===winner)?'winner':'')}
        style={{left,top,'--accent':home.color}} key={area} aria-label={title}
        aria-expanded={shared?openArea===area:undefined} aria-pressed={shared?undefined:!!chosen}
        onClick={()=>{if(shared) setOpenArea(openArea===area?null:area); else {setOpenArea(null);onSelect(home.id);}}}>
        <span className="bubble"><span className="letter">{shared?items.length:home.mark}</span>{shared?area:home.name}</span>
      </button>;
    })}</div>
    {choices?.length>1 && <div className="atlas-choices" role="group" aria-label={'Homes in '+openArea}>
      <strong>{openArea}</strong> <button onClick={()=>setOpenArea(null)}>Close</button>
      {choices.map(home=><button key={home.id} aria-pressed={selected===home.id}
        onClick={()=>{onSelect(home.id);setOpenArea(null);}}>{home.name}</button>)}
    </div>}
    <div className="map-caption"><div><h2>Campus atlas</h2><small>FICTIONAL LISTINGS</small></div></div>
    <div className="north" aria-label="North direction">N<span>▴</span></div>
    <div className="map-tools">
      <button aria-label="Zoom in" disabled={zoom>=1.4} onClick={()=>setZoom(Math.min(1.4,zoom+.2))}>+</button>
      <button aria-label="Zoom out" disabled={zoom<=.8} onClick={()=>setZoom(Math.max(.8,zoom-.2))}>−</button>
      <button aria-label="Reset zoom" onClick={()=>setZoom(1)}>⟲</button>
    </div>
    <div className="legend">Illustrative map</div>
  </div>;
}

function BenchmarkDialog({detail,routine,ranked,onClose}) {
  const isCompare=detail==='compare';
  const home=ranked.find(item=>item.id===detail);
  const options = routine.mode==='transit' || routine.mode==='missed';
  const rows=[
    ['Rent',item=>cash(item.rent)],['Utilities',item=>cash(item.utilities)],['Housing total',item=>cash(item.monthly)],
    ['Budget room',item=>item.eligible?cash(routine.budget-item.monthly):cash(item.monthly-routine.budget)+' over'],
    ...(routine.names ?? destinations).map((name,index)=>[name,item=>item.trips[index].out.minutes+' min out / '+item.trips[index].back.minutes+' min back']),
    ['Weekly travel',item=>duration(item.weekly)],['Time-adjusted cost',item=>cash(item.burden)]
  ];
  return <Dialog wide={isCompare} onClose={onClose}>
    <h2 id="dialog-title">{isCompare?'Compare homes':home.name}</h2>
    {isCompare ? <div className="table-wrap"><table>
      <thead><tr><th scope="col">Measure</th>{ranked.map(item=><th key={item.id} scope="col">{item.name}</th>)}</tr></thead>
      <tbody>{rows.map(([name,format])=><tr key={name}><th scope="row">{name}</th>{ranked.map(item=><td key={item.id}>{format(item)}</td>)}</tr>)}</tbody>
    </table></div> : <>
      <p>{home.area} · {home.type}</p>
      <ListingStats home={home} routine={routine} />
      <CampusStats home={home} routine={routine} />
      <h3>Trip details</h3>
      {(routine.names ?? destinations).map((name,index)=><div className="costrow" key={name}><div>
        <strong>{name}</strong>
        <p className="quiet">Out: {describeTrip(home.trips[index].out)}<br/>Back: {describeTrip(home.trips[index].back)}</p>
        {options && busOptions(home,index).length>0 && <details className="trip-alternatives"><summary>Outbound bus options</summary>
          <ul>{busOptions(home,index).map(bus=><li key={bus.route}>{describeTrip({bus,label:bus.route,wait:routine.mode==='missed'?bus.headway:bus.headway/2})}</li>)}</ul>
        </details>}
      </div></div>)}
      <div className="insight">{cash(home.monthly)} housing + {cash(home.burden-home.monthly)} in travel time per month = <strong>{cash(home.burden)} time-adjusted cost.</strong></div>
    </>}
  </Dialog>;
}

function Uncertainty({inventory,places,routine,first,last,setFirst,setLast,onWeek}) {
  const {min,max}=semesterBounds(routine.days);
  const weeks=semesterWeeks(routine,first,last,inventory,places);
  const hedge=semesterHedge(weeks);
  const maximum=Math.max(1,...weeks.flatMap(week=>Object.values(week.gaps)));
  const defaultHome=weeks[0].options[0];
  const bounds=Array.from({length:max-min+1},(_,index)=>min+index);
  return <div id="uncertainty">
    <div className="lab-heading"><div><h3>Which lease holds up?</h3><p>See how far each home falls behind the best choice for each possible week.</p></div>
      <div className="bounds">
        <label>Fewest North visits<select value={first} onChange={event=>setFirst(Number(event.target.value))}>
          {bounds.filter(n=>n<=last).map(n=><option key={n}>{n}</option>)}</select></label>
        <label>Most North visits<select value={last} onChange={event=>setLast(Number(event.target.value))}>
          {bounds.filter(n=>n>=first).map(n=><option key={n}>{n}</option>)}</select></label>
      </div></div>
    <div id="hedge-result" aria-live="polite">{hedge ? <>
      <strong>{hedge.name}</strong> has the smallest worst-case gap at <strong>{cash(hedge.worstGap)}</strong> per month.
      {weeks.every(week=>week.winner.id!==hedge.id) && ' It never comes first in this range.'}
    </> : <>All homes exceed the cap. {defaultHome.name} comes closest at {cash(defaultHome.monthly-routine.budget)} over per month.</>}</div>
    {hedge && <>
      <div className="table-wrap"><table>
        <caption>Monthly gap from each week’s best fit</caption>
        <thead><tr><th scope="col">Apartment</th>{weeks.map(week=><th scope="col" key={week.north}>{week.north} North</th>)}<th scope="col">Worst gap</th></tr></thead>
        <tbody>{inventory.map(home=>{
          const eligible=home.id in weeks[0].gaps;
          const worst=eligible ? Math.max(...weeks.map(week=>week.gaps[home.id])) : null;
          return <tr key={home.id}><th scope="row">{home.name}{home.id===hedge.id && <span className="hedge-label">SMALLEST GAP</span>}</th>
            {weeks.map(week=>{
              const gap=week.gaps[home.id];
              return <td key={week.north}>{eligible ? <button className={'gap-cell '+(gap===worst?'worst':'')}
                style={{'--heat':gap/maximum}} aria-pressed={week.north===routine.days[1]}
                aria-label={home.name+', '+week.north+' North visits, '+cash(gap)+' gap'}
                onClick={()=>onWeek(week.north,home.id)}>{cash(gap)}{week.winner.id===home.id && <small>BEST</small>}</button> : '—'}</td>;
            })}<td>{eligible?cash(worst):'Over cap'}</td>
          </tr>;
        })}</tbody>
      </table></div>
      <p className="lab-note">Gaps include the value you place on commute time. Select a week to see it on the atlas.</p>
    </>}
  </div>;
}

export function SemesterLab({deck,routine,setRoutine,onEdit}) {
  const saved=useMemo(()=>{
    const ids=new Set(deck.swipes.filter(s=>s.action==='save').map(s=>s.id));
    return discoveryHomes.filter(h=>ids.has(h.id)).map((h,i)=>{
      const [x,y]=atlasAreas[h.area];
      return {...h,x,y,mark:h.mark ?? String(i+1)};
    });
  },[deck.swipes]);
  const [benchmarks,setBenchmarks]=useState(false);
  const usingSaved=saved.length>0 && !benchmarks;
  const inventory=usingSaved?saved:homes;
  const places=usingSaved?deck.places:[];
  const ranked=rankHomes(routine,inventory,places);
  const detailRoutine={...routine,names:[...destinations,...places.map(p=>p.name)],days:[...routine.days,...places.map(p=>p.visits)]};
  const winner=ranked[0];
  const [inspected,inspect] = useState(null);
  const [detail,setDetail] = useState(null);
  const [uncertain,setUncertain] = useState(false);
  const {min,max,total}=semesterBounds(routine.days);
  const [limits,setLimits]=useState(null);
  const first=limits?.total===total ? limits.first : min;
  const last=limits?.total===total ? limits.last : total===5?4:max;
  const [,north,kerrytown]=routine.days;
  const active=ranked.find(item=>item.id===inspected) ?? winner;
  const runner=ranked.find(home=>home.eligible && home.id!==active.id);
  const maximum=Math.max(1,...[min,max].flatMap(n=>semesterWeeks(routine,n,n,inventory,places)[0].options.map(home=>home.weekly)));

  function changeWeek(n,id=null) {
    setRoutine(current=>({...current,days:[total-n,n,kerrytown]}));
    inspect(id);
  }

  return <>
    <div className="lab-intro"><h1>Test your semester</h1><p>{usingSaved?'Select a saved home on the Campus atlas to see its cost and commute.': 'Explore the benchmark homes. Save homes in Discover to see them here.'}</p></div>
    {saved.length>0 && <div className="atlas-select"><label>Show on atlas <select value={usingSaved?'saved':'benchmarks'} onChange={e=>{setBenchmarks(e.target.value==='benchmarks');inspect(null);setDetail(null);}}>
      <option value="saved">Saved homes ({saved.length})</option><option value="benchmarks">Benchmark homes</option></select></label>
      <label>Selected home <select value={active.id} onChange={e=>inspect(e.target.value)}>{inventory.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label></div>}
    <div className="workspace">
      <Atlas inventory={inventory} selected={active.id} winner={winner.eligible?winner.id:null} days={routine.days} onSelect={inspect} />
      <aside id="spotlight" aria-label="Selected apartment">
        <div className="study"><Study home={active} /><span className="tag">
          {!active.eligible?'OVER BUDGET':winner.id===active.id?'BEST FIT':'SELECTED HOME'}
        </span></div>
        <div className="spot-body"><h2>{active.name}</h2><p className="subline">{active.area} · {active.type}</p>
          <div className="metrics"><div><b>{cash(active.monthly)}</b><small>Monthly housing</small></div>
            <div><b>{duration(active.weekly)}</b><small>Weekly commute</small></div></div>
          <p className="why">{!active.eligible ? cash(active.monthly-routine.budget)+' over the monthly cap.' :
            runner && winner.id===active.id ? 'Leads '+runner.name+' by '+cash(runner.burden-active.burden)+' per month after valuing commute time.' :
            'See how this home fits your campus routine.'}</p>
          <button className="primary" onClick={()=>setDetail(active.id)}>View fit breakdown</button>
        </div>
      </aside>
    </div>
    <section className="lab" aria-labelledby="semester-title">
      <div className="lab-heading"><div><h2 id="semester-title">What if your week changes?</h2><p>Move visits between Central and North Campus.</p></div>
        <button className="secondary" onClick={()=>{
          setRoutine({...presets.central,mode:'walk'});inspect(null);setLimits(null);
        }}>Load demo week</button></div>
      <div className="lab-grid"><div>
        <div id="week-chips" aria-hidden="true">{routine.days.flatMap((n,index)=>Array.from({length:n},(_,chip)=>
          <span className={'campus-chip campus-'+index} key={index+'-'+chip}>{['Central','North','Kerrytown'][index]}</span>))}</div>
        <label htmlFor="north-days">North Campus visits per week <output>{north}</output></label>
        <input id="north-days" type="range" min={min} max={max} value={north} disabled={min===max} onChange={event=>changeWeek(Number(event.target.value))} />
        <div className="range-ends"><span>{min} North</span><span>{max} North</span></div>
        <p className="lab-note">{total-north} Central · {north} North · {kerrytown} Kerrytown. {cash(routine.budget)}/mo cap · {cash(routine.value)}/hour saved.</p>
        <div className="lab-actions"><button className="secondary" onClick={onEdit}>Edit budget & visits</button>
          <button className="primary" aria-expanded={uncertain} aria-controls="uncertainty" onClick={()=>setUncertain(!uncertain)}>My schedule is uncertain</button></div>
      </div><div>
        <span className="mini-label" role="status">{winner.eligible?'BEST FIT · '+winner.name:'NO HOME WITHIN BUDGET'}</span>
        {ranked.map(home=><div key={home.id} className="week-bar"><div><span>{home.name}</span><b>{duration(home.weekly)}/wk</b></div>
          <div className="bar-track"><span style={{'--fill':home.weekly/maximum*100+'%','--tone':home.color}} /></div></div>)}
      </div></div>
      {uncertain && <Uncertainty inventory={inventory} places={places} routine={routine} first={first} last={last} setFirst={n=>setLimits({total,first:n,last})}
        setLast={n=>setLimits({total,first,last:n})} onWeek={changeWeek} />}
    </section>
    <section className="shortlist"><div className="section-head"><h2>{usingSaved?'Saved homes':'Benchmark homes'}</h2>
      <button className="secondary" onClick={()=>setDetail('compare')}>Compare homes</button></div>
      <div id="cards">{ranked.map((home,index)=><button key={home.id} className={'home-card '+(home.id===active.id?'active':'')}
        aria-pressed={home.id===active.id} onClick={()=>inspect(home.id)} style={{'--accent':home.color}}>
        <span className="card-top"><span className="index">{home.mark}</span>{!home.eligible?'OVER BUDGET':index===0?'BEST FIT':'RANK '+(index+1)}</span>
        <span><strong>{home.name}</strong><br/><small>{home.area}</small></span><Study home={home} />
        <span className="card-foot"><span>{cash(home.monthly)} / mo</span><span>{duration(home.weekly)} / wk</span></span>
      </button>)}</div>
    </section>
    {detail && <BenchmarkDialog detail={detail} routine={detailRoutine} ranked={ranked} onClose={()=>setDetail(null)} />}
  </>;
}

const timeInput = minutes=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
const parseTime = value=>value ? Number(value.slice(0,2))*60+Number(value.slice(3,5)) : NaN;
function clockTime(minutes) {
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(minutes*60000);
}

export function DayReplay({mode}) {
  const [lecture,setLecture]=useState(timeInput(classReplay.lectureEnd));
  const [lab,setLab]=useState(timeInput(classReplay.labStart));
  const [minimum,setMinimum]=useState(String(classReplay.minimum));
  const day={...classReplay,lectureEnd:parseTime(lecture),labStart:parseTime(lab),minimum:minimum===''?NaN:Number(minimum),mode};
  const gap=day.labStart-day.lectureEnd;
  const valid=gap>0 && Number.isInteger(day.minimum) && day.minimum>=0 && day.minimum<=180;
  const results=valid ? homes.map(home=>({home,...replayDay(home,day)})) : [];
  const feasible=results.filter(result=>result.fits);
  const direct=results[0];
  let summary='Enter a valid minimum and a lab start after the lecture ends.';
  if (valid) {
    summary=feasible.length>0 ? feasible.map(result=>result.home.name).join(', ') +
      (feasible.length===1?' leaves':' leave')+' at least '+day.minimum+' minutes at home.' :
      'None of the three homes leaves enough time for this break.';
    summary+=' '+(direct.directFits ? 'Direct trip arrives at '+clockTime(direct.directArrival)+' · '+direct.direct.label+'.' :
      'The fastest direct trip misses the arrival buffer.');
  }
  return <section className="lab" aria-labelledby="replay-title">
    <div className="lab-heading"><div><h2 id="replay-title">Can you get home for lunch?</h2><p>One Tuesday, a Central Campus lecture and a North Campus lab.</p></div>
      <button className="primary" disabled={!(gap>4)} onClick={()=>setLab(timeInput(day.labStart-4))}>Lab starts 4 minutes earlier</button></div>
    <div className="replay-controls">
      <label>Lecture ends<input type="time" value={lecture} onChange={event=>setLecture(event.target.value)} /></label>
      <label>Lab starts<input type="time" value={lab} onChange={event=>setLab(event.target.value)} /></label>
      <label>Minimum time at home<input type="number" min="0" max="180" value={minimum} onChange={event=>setMinimum(event.target.value)} /></label>
    </div>
    <div id="replay-result" aria-live="polite">{summary}</div>
    {valid && <div id="replay-lanes">
      <div className="timeline-scale"><span>{clockTime(day.lectureEnd)} · lecture ends</span><span>Lab starts · {clockTime(day.labStart)}</span></div>
      {results.map(result=>{
        const {home,arriveHome,leaveHome,free,fits,inbound,outbound}=result;
        const possible=leaveHome>=arriveHome;
        const segments=possible?[arriveHome-day.lectureEnd,free,day.labStart-day.buffer-leaveHome,day.buffer]:[gap];
        return <div className="replay-lane" key={home.id}>
          <div className="lane-head"><strong>{home.name}</strong><span className={fits?'fits':'misses'}>{possible?free+' min at home':'Detour exceeds gap'}</span></div>
          <div className={'timeline-track '+(possible?'':'clipped')} aria-hidden="true">
            {segments.map((minutes,index)=><span key={index} className={'segment segment-'+index} style={{width:minutes/gap*100+'%'}} />)}
          </div>
          <div className="lane-detail">{possible?'Home '+clockTime(arriveHome)+' ('+inbound.label+') · Leave '+clockTime(leaveHome)+' ('+outbound.label+')':
            'Travel and arrival buffer exceed the available time.'}</div>
        </div>;
      })}
      <div className="timeline-key"><span>Travel</span><span>Time at home</span><span>Arrival buffer</span></div>
    </div>}
    <p className="lab-note">Tuesday replay uses a 5-minute arrival buffer and illustrative weekday departures.</p>
  </section>;
}
