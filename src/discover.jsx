import React, { useMemo, useRef, useState } from 'react';
import { cash, destinations, duration, rankHomes } from '../model.js';
import { discoveryHomes, housingNeeds } from './listings.js';
import PlacePicker from './place-picker.jsx';
import { placeKey } from '../places.js';
import { CampusStats, Dialog, ListingStats, Study } from './ui.jsx';

function fitDescription(home) {
  const reasons = [];
  if (home.overBudget) reasons.push(cash(home.overBudget)+' over budget');
  if (home.missing.length) reasons.push('Missing '+home.missing.map(need=>housingNeeds[need]).join(', ').toLowerCase());
  return reasons.join(' · ') || (home.hasNeeds ? 'Fits your budget and must-haves' : 'Within budget');
}

function WeekStrip({home,routine}) {
  if (!home.weekly) return null;
  const segments = home.trips.map(({out,back},index)=>({
    name:['Central','North','Kerrytown'][index] ?? routine.names[index],
    minutes:(out.minutes+back.minutes)*routine.days[index],
    color:['#365b48','#4e6084','#9a6143'][index] ?? '#477e80'
  })).filter(segment=>segment.minutes>0);
  return <div className="week-strip" aria-hidden="true">
    <div className="week-strip-header"><span>Travel in your week</span><strong>{duration(home.weekly)}</strong></div>
    <div className="week-strip-track">{segments.map((segment,index)=><span key={index}
      style={{flexGrow:segment.minutes,background:segment.color}} />)}</div>
    <div className="week-strip-key">{segments.map((segment,index)=><span key={index} style={{'--visit-color':segment.color}}>
      {segment.name} {duration(segment.minutes)}</span>)}</div>
  </div>;
}

function Listing({home,routine,onReview,cardRef,onAddPlace}) {
  const start = useRef(null);
  const [drag,setDrag] = useState(0);

  function reset() {
    start.current = null;
    setDrag(0);
  }

  return <article ref={cardRef} className="swipe-card" tabIndex={0} aria-label={home.name}
    data-dragging={drag ? '' : undefined} data-gesture={Math.abs(drag)>35 ? (drag>0?'save':'pass') : undefined}
    style={{'--drag':drag+'px','--tilt':Math.max(-9,Math.min(9,drag/18))+'deg'}}
    onKeyDown={event=>{
      if (event.target!==event.currentTarget || event.repeat || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      onReview(event.key==='ArrowRight'?'save':'pass');
    }}
    onPointerDown={event=>{
      if (event.target.closest('button,a,input,select') || !event.isPrimary || event.button!==0) return;
      start.current={x:event.clientX,y:event.clientY};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event=>{
      if (!start.current) return;
      const x=event.clientX-start.current.x;
      const y=event.clientY-start.current.y;
      setDrag(Math.abs(x)>Math.abs(y) ? x : 0);
    }}
    onPointerUp={event=>{
      if (!start.current) return;
      const x=event.clientX-start.current.x;
      const y=event.clientY-start.current.y;
      reset();
      if (Math.abs(x)>=65 && Math.abs(x)>Math.abs(y)) onReview(x>0?'save':'pass');
    }}
    onPointerCancel={reset} onLostPointerCapture={reset}>
    <div className="listing-art">
      <Study home={home} />
      <span className="listing-area">{home.area}</span>
      <div className="listing-art-footer"><WeekStrip home={home} routine={routine} /><span className="art-caption">Architectural illustration</span></div>
      <span className="gesture-label" aria-hidden="true" />
    </div>
    <div className="listing-body">
      <p className="listing-type">{home.type}</p>
      <h2>{home.name}</h2>
      <p className={'listing-fit '+(home.eligible&&!home.missing.length?'fits':'')}>{fitDescription(home)}</p>
      <ListingStats home={home} routine={routine} />
      <CampusStats home={home} routine={routine} />
      <button className="text-button add-place" onClick={onAddPlace}>+ Add a destination</button>
      <div className="listing-features">{home.features.map(key=><span key={key}>{housingNeeds[key]}</span>)}</div>
    </div>
  </article>;
}

function CompareSaved({homes,routine,onClose}) {
  const rows = [
    ['Monthly housing',home=>cash(home.monthly)],
    ['Rent + utilities',home=>cash(home.rent)+' + '+cash(home.utilities)],
    ['Budget fit',home=>home.eligible?cash(routine.budget-home.monthly)+' left':cash(home.overBudget)+' over'],
    ['Weekly travel',home=>duration(home.weekly)],
    ...routine.names.flatMap((name,index)=>routine.hiddenCampuses?.includes(index) && !routine.days[index] ? [] : [[name,home=>home.trips[index].out.minutes+' min · '+home.trips[index].out.label]]),
    ['Amenities',home=>home.features.map(need=>housingNeeds[need]).join(', ')],
    ['Must-haves missed',home=>home.missing.map(need=>housingNeeds[need]).join(', ') || 'None']
  ];
  return <Dialog wide onClose={onClose}>
    <h2 id="dialog-title">Compare saved homes</h2>
    <p>Costs and travel times use your current routine.</p>
    <div className="table-wrap"><table className="saved-comparison">
      <thead><tr><th scope="col">Measure</th>{homes.map(home=><th key={home.id} scope="col">{home.name}</th>)}</tr></thead>
      <tbody>{rows.map(([label,format],index)=><tr key={index}><th scope="row">{label}</th>{homes.map(home=><td key={home.id}>{format(home)}</td>)}</tr>)}</tbody>
    </table></div>
  </Dialog>;
}

const sortOptions = {
  fit: 'Best fit',
  price: 'Lowest housing cost',
  commute: 'Shortest weekly commute'
};

export default function Discover({routine:baseRoutine,deck,setDeck,onEdit,showSaved,setShowSaved}) {
  const [picker,setPicker] = useState(false);
  const places = deck.places;
  const routine = useMemo(()=>({...baseRoutine,
    names:[...destinations,...places.map(place=>place.name)],
    days:[...baseRoutine.days,...places.map(place=>place.visits)]
  }),[baseRoutine,places]);
  const [sort,setSort] = useState('fit');
  const [area,setArea] = useState('');
  const [compare,setCompare] = useState([]);
  const [comparisonOpen,setComparisonOpen] = useState(false);
  const [status,setStatus] = useState('');
  const cardRef = useRef(null);
  const undoRef = useRef(null);
  const rated = useMemo(() => rankHomes(baseRoutine,discoveryHomes,places).map(home=>({
    ...home, hasNeeds:deck.needs.length>0, overBudget:Math.max(0,home.monthly-routine.budget),
    missing:deck.needs.filter(need=>!home.features.includes(need))
  })).sort((a,b)=>Number(b.eligible)-Number(a.eligible) || a.missing.length-b.missing.length),[baseRoutine,places,deck.needs]);

  const reviewed = new Set(deck.swipes.map(entry=>entry.id));
  const savedIds = new Set(deck.swipes.filter(entry=>entry.action==='save').map(entry=>entry.id));
  const saved = rated.filter(home=>savedIds.has(home.id));
  const choices = rated.filter(home=>!reviewed.has(home.id) && (!area || home.area===area) &&
    (!deck.onlyFit || (home.eligible && !home.missing.length)));
  if (sort!=='fit') choices.sort(sort==='price' ? (a,b)=>a.monthly-b.monthly : (a,b)=>a.weekly-b.weekly);
  const home = choices[0];

  function review(action) {
    if (!home) return;
    const keepFocus = document.activeElement === cardRef.current;
    setDeck(current=>current.swipes.some(entry=>entry.id===home.id) ? current : ({
      ...current,swipes:[...current.swipes,{id:home.id,action}]
    }));
    setStatus((action==='save'?'Saved ':'Passed on ')+home.name+'.');
    if (keepFocus) requestAnimationFrame(()=>(cardRef.current ?? undoRef.current)?.focus({preventScroll:true}));
  }

  function toggleNeed(key) {
    setDeck(current=>({...current,needs:current.needs.includes(key) ?
      current.needs.filter(need=>need!==key) : [...current.needs,key]}));
  }

  function removePlace(place) {
    setDeck(current=>({...current,places:current.places.filter(p=>placeKey(p)!==placeKey(place))}));
    setStatus('Removed '+place.name+' from your routine.');
  }

  function removeSaved(id) {
    setCompare(current=>current.filter(value=>value!==id));
    setDeck(current=>({...current,swipes:current.swipes.filter(entry=>entry.id!==id)}));
  }

  return <section className="discover" aria-labelledby="discover-title">
    <div className="discover-head">
      <div><h1 id="discover-title">{showSaved?'Saved homes':'Discover homes'}</h1>
        <p>{showSaved ? 'Compare your shortlist using the same routine.' : '24 sample listings in Ann Arbor'}</p></div>
      <div className="discover-tabs" role="group" aria-label="Listing view">
        <button aria-pressed={!showSaved} onClick={()=>setShowSaved(false)}>Swipe deck</button>
        <button aria-pressed={showSaved} onClick={()=>setShowSaved(true)}>Saved <span>{saved.length}</span></button>
      </div>
    </div>
    {showSaved ? <>
      {saved.length>0 ? <>
        <div className="compare-bar">
          <p>Select two or three homes to compare.</p>
          <button className="secondary" onClick={()=>setPicker(true)}>View saved homes on map</button>
          <button className="primary" disabled={compare.length<2} onClick={()=>setComparisonOpen(true)}>Compare {compare.length ? '('+compare.length+')' : 'homes'}</button>
        </div>
        <div id="saved-homes">{saved.map(item=><article className="saved-home" key={item.id}>
          <div><h3>{item.name}</h3><p>{item.area} · {item.type}</p><p>{fitDescription(item)}</p>
            <label className="compare-choice"><input type="checkbox" checked={compare.includes(item.id)}
              disabled={compare.length>=3 && !compare.includes(item.id)}
              onChange={event=>setCompare(event.target.checked?[...compare,item.id]:compare.filter(id=>id!==item.id))} /> Compare {item.name}</label>
            <button className="text-button remove-saved" onClick={()=>removeSaved(item.id)}>Remove from saved</button>
          </div>
          <ListingStats home={item} routine={routine} />
          <CampusStats home={item} routine={routine} />
          <label className="listing-note">Notes <textarea rows={2} maxLength={300} value={deck.notes[item.id] ?? ''}
            onChange={event=>{const note=event.target.value;setDeck(current=>({...current,notes:{...current.notes,[item.id]:note}}));}}
            placeholder="Tour questions, lease dates, or a detail to remember" /></label>
        </article>)}</div>
      </> : <div className="deck-empty"><h2>No saved homes yet</h2><p>Save a home from the deck to shortlist it here.</p>
        <button className="secondary" onClick={()=>setShowSaved(false)}>Back to the deck</button></div>}
      {comparisonOpen && <CompareSaved homes={saved.filter(item=>compare.includes(item.id))} routine={routine} onClose={()=>setComparisonOpen(false)} />}
    </> : <div className="discover-grid">
      <div className="deck-stage">
        <div className="deck-toolbar">
          <span>{choices.length} to review</span>
          <label>Sort by <select value={sort} onChange={event=>setSort(event.target.value)}>{Object.entries(sortOptions).map(([key,label])=>
            <option value={key} key={key}>{label}</option>)}</select></label>
        </div>
        <div id="card-stage">{home ? <Listing key={home.id} home={home} routine={routine} onReview={review} cardRef={cardRef} onAddPlace={()=>setPicker(true)} /> :
          <div className="deck-empty"><h2>{deck.onlyFit || area?'No listings match these filters':'You’ve reached the end'}</h2>
            <p>{deck.onlyFit || area?'Try another neighborhood or adjust your must-haves.':'Compare saved homes or take another look at the listings you passed.'}</p>
            {deck.swipes.some(entry=>entry.action==='pass') && <button className="secondary" onClick={()=>
              setDeck(current=>({...current,swipes:current.swipes.filter(entry=>entry.action==='save')}))}>Review passed homes again</button>}
          </div>}</div>
        <div className="deck-controls">
          <button ref={undoRef} disabled={!deck.swipes.length} onClick={()=>{
            setDeck(current=>({...current,swipes:current.swipes.slice(0,-1)}));setStatus('Undid the last swipe.');
          }}>↶ Undo</button>
          <button disabled={!home} onClick={()=>review('pass')}>Pass</button>
          <button id="save-home" disabled={!home} onClick={()=>review('save')}>Save home</button>
        </div>
        <p className="deck-hint">Swipe left to pass, right to save. Arrow keys work when the listing is focused.</p>
      </div>
      <aside className="housing-profile" aria-label="Housing preferences">
        <div className="profile-heading"><h2>Your routine</h2><button className="text-button" onClick={onEdit}>Edit</button></div>
        <dl id="deck-routine">
          <div><dt>Monthly cap</dt><dd>{cash(routine.budget)}</dd></div>
          {destinations.map((name,index)=>!routine.hiddenCampuses?.includes(index) || routine.days[index] ? <div key={name}><dt>{name}</dt><dd>{routine.days[index]} {routine.days[index]===1?'visit':'visits'}/wk</dd></div> : null)}
        </dl>
        {places.map((place,index)=><div className="custom-place" key={placeKey(place)}>
          <label>{place.name}<select aria-label={'Weekly visits to '+place.name} value={place.visits} onChange={event=>{
            const visits=Number(event.target.value);
            setDeck(current=>({...current,places:current.places.map((p,i)=>i===index?{...p,visits}:p)}));
          }}>{Array.from({length:8},(_,n)=><option key={n} value={n}>{n} visits/wk</option>)}</select></label>
          <button className="text-button" aria-label={'Remove '+place.name} onClick={()=>removePlace(place)}>Remove</button>
        </div>)}
        <button className="text-button add-place" onClick={()=>setPicker(true)}>+ Add a destination</button>
        <label className="area-filter">Neighborhood<select value={area} onChange={event=>setArea(event.target.value)}>
          <option value="">All neighborhoods</option>
          {[...new Set(discoveryHomes.map(item=>item.area))].sort().map(name=><option key={name}>{name}</option>)}
        </select></label>
        <fieldset><legend>Must-haves</legend><div id="housing-needs">
          {Object.entries(housingNeeds).map(([key,label])=><label key={key}><input type="checkbox" checked={deck.needs.includes(key)} onChange={()=>toggleNeed(key)} />{label}</label>)}
        </div></fieldset>
        <label className="fit-filter"><input type="checkbox" checked={deck.onlyFit}
          onChange={event=>{const onlyFit=event.target.checked;setDeck(current=>({...current,onlyFit}));}} /> Only show homes that fit</label>
      </aside>
    </div>}
    {picker && <PlacePicker homes={showSaved || !home ? saved : [home,...saved]} savedView={showSaved} onRemove={removePlace} places={places} onClose={()=>setPicker(false)} onAdd={place=>{
      setDeck(current=>current.places.some(p=>placeKey(p)===placeKey(place)) ? current : {...current,places:[...current.places,place]});
      setPicker(false); setStatus('Added '+place.name+' to your routine.');
    }}/>}
    <p role="status" className="sr">{status}</p>
  </section>;
}
