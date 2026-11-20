import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { cash, destinations, presets } from '../model.js';
import Discover from './discover.jsx';
import Showcase from './showcase.jsx';
import { DayReplay, SemesterLab } from './labs.jsx';
import { modes, useDeck, useRoutine } from './state.js';
import { Dialog } from './ui.jsx';
import '../style.css';

const pages = {discover:'Discover',semester:'Semester lab',replay:'Day replay'};
function currentPage() {
  const page=window.location.hash.slice(1);
  return Object.hasOwn(pages,page) || page==='demo' ? page : 'discover';
}

function RoutineEditor({routine,onApply,onClose}) {
  const [draft,setDraft]=useState(routine);
  const names={central:'Central-heavy',north:'North-heavy',market:'Kerrytown shifts'};
  return <Dialog onClose={onClose}>
    <h2 id="dialog-title">Build your week</h2>
    <p>Pick a sample week or enter your own round trips from home.</p>
    <div className="seg" role="group" aria-label="Sample weeks">{Object.entries(presets).map(([key,preset])=>{
      const active=preset.days.every((n,index)=>n===draft.days[index]);
      return <button key={key} aria-pressed={active} className={active?'selected':undefined}
        onClick={()=>setDraft({...draft,days:preset.days})}>{names[key]}</button>;
    })}</div>
    <form onSubmit={event=>{event.preventDefault();onApply({...draft,days:draft.days.map(Number),budget:Number(draft.budget),value:Number(draft.value)});}}>
      {destinations.map((name,index)=><label className="formrow" key={name}>
        <span>{name}<small>Round trips per week</small></span>
        <input type="number" min="0" max="7" step="1" required value={draft.days[index]} onChange={event=>{
          const days=[...draft.days];days[index]=event.target.value===''?'':Number(event.target.value);setDraft({...draft,days});
        }} />
      </label>)}
      <label className="formrow"><span>Monthly housing cap<small>Rent and utilities in dollars</small></span>
        <input type="number" min="0" max="10000" required value={draft.budget} onChange={event=>setDraft({...draft,budget:event.target.value})}/></label>
      <label className="formrow"><span>Value of one hour saved<small>Dollars per hour of travel avoided</small></span>
        <input type="number" min="0" max="100" step="0.01" required value={draft.value} onChange={event=>setDraft({...draft,value:event.target.value})}/></label>
      <label className="formrow"><span>Commute mode</span><ModeSelect value={draft.mode} onChange={mode=>setDraft({...draft,mode})}/></label>
      <div className="modal-actions"><button className="primary" type="submit">Apply routine</button></div>
    </form>
  </Dialog>;
}

function ModeSelect({value,onChange}) {
  return <select value={value ?? 'walk'} onChange={event=>onChange(event.target.value)}>
    {Object.entries(modes).map(([key,label])=><option value={key} key={key}>{label}</option>)}
  </select>;
}

function Methodology({onClose}) {
  return <Dialog onClose={onClose}>
    <h2 id="dialog-title">Demo data & methodology</h2>
    <p>Listings, travel times and departure times are illustrative. Stop names and corridors reference published service.</p>
    <h3>How homes are ranked</h3>
    <ol className="method-list">
      <li>Compare each home’s rent plus utilities with your cap.</li>
      <li>Estimate travel in both directions and multiply by your weekly visits. Bus travel includes walking to and from stops and a half-headway wait. Longer waits use a full headway.</li>
      <li>Add housing cost to your estimated travel hours over 4.33 weeks, multiplied by your value of an hour saved. Discover also considers your selected must-haves.</li>
    </ol>
    <p>Use operator schedules for an actual trip. <a href="https://ltp.umich.edu/campus-transit/routes-and-schedules/bursley-baits/">U-M Bursley–Baits</a> · <a href="https://www.theride.org/maps-schedules/route-maps-schedules-library">TheRide schedules</a></p>
    <h3>Saved information</h3><p>Your routine, swipes, and notes are stored in this browser.</p>
  </Dialog>;
}

function App() {
  const [routine,setRoutine]=useRoutine();
  const [deck,setDeck]=useDeck();
  const [page,setPage]=useState(currentPage);
  const [showSaved,setShowSaved]=useState(false);
  const [dialog,setDialog]=useState(null);
  const [notice,setNotice]=useState('');
  const edit=()=>setDialog('routine');
  const close=()=>setDialog(null);
  useEffect(()=>{
    function update() { setPage(currentPage()); window.scrollTo(0,0); }
    window.addEventListener('hashchange',update);
    return ()=>window.removeEventListener('hashchange',update);
  },[]);

  return <>
    <a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content').focus();}}>Skip to content</a>
    <header><div className="topbar">
      <a href="#discover" className="brand" aria-label="Homebase Discover"><span className="logo" aria-hidden="true" />homebase<span className="brand-dot">.</span></a>
      <nav aria-label="Main navigation">{Object.entries(pages).map(([key,label])=>
        <a href={'#'+key} aria-current={page===key?'page':undefined} key={key}>{label}</a>)}</nav>
      <span className="location">Ann Arbor, MI</span>
    </div></header>
    <main id="main-content" tabIndex={-1}>
      <div className="view-toolbar" hidden={page==='demo'}><a className="demo-link" href="#demo">Try the demo <span aria-hidden="true">↗</span></a><div className="intro-actions">
        <label>Commute <ModeSelect value={routine.mode} onChange={mode=>setRoutine({...routine,mode})}/></label>
        <button className="edit" onClick={edit}>Edit routine</button>
      </div></div>
      {page==='demo' && <Showcase />}
      <div hidden={page!=='discover'}>
        <Discover routine={routine} deck={deck} setDeck={setDeck} onEdit={edit} showSaved={showSaved} setShowSaved={setShowSaved} />
      </div>
      <div hidden={page!=='semester'}><SemesterLab deck={deck} routine={routine} setRoutine={setRoutine} onEdit={edit} /></div>
      <div hidden={page!=='replay'}><DayReplay mode={routine.mode} /></div>
      <footer><span>Homebase · University of Michigan pilot</span><button onClick={()=>setDialog('method')}>Demo data & methodology</button></footer>
    </main>
    {dialog==='routine' && <RoutineEditor routine={routine} onApply={updated=>{
      setRoutine(updated);setNotice('Routine updated. Monthly cap '+cash(updated.budget)+'.');close();
    }} onClose={close}/>}
    {dialog==='method' && <Methodology onClose={close}/>}
    <p className="sr" role="status">{notice}</p>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
