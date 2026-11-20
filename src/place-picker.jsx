import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from './ui.jsx';
import HomeMap from './home-map.jsx';
import { cash, customCommute } from '../model.js';
import { isLocalPlace, library, placeKey } from '../places.js';

export default function PlacePicker({homes,savedView,onAdd,onRemove,onClose,places}) {
  const [activeId,setActiveId]=useState(homes[0]?.id);
  const home=homes.find(item=>item.id===activeId) ?? homes[0];
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [selected,select]=useState(null);
  const [visits,setVisits]=useState(1);
  const [message,setMessage]=useState('');
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  function pick(place) {
    request.current?.abort();
    select(place); setMessage(''); setResults([]);
  }
  async function search(event) {
    event.preventDefault();
    const term=query.trim();
    if (!term) return;
    request.current?.abort();
    select(null); setResults([]);
    if (/^(the )?(ugli|ugly|shapiro( undergraduate)?( library)?)$/i.test(term)) return pick(library);
    const controller=new AbortController();
    request.current=controller;
    setMessage('Searching Ann Arbor…');
    try {
      const params=new URLSearchParams({q:term,lat:'42.28',lon:'-83.74',bbox:'-83.87,42.19,-83.61,42.36',limit:'8'});
      const response=await fetch('https://photon.komoot.io/api/?'+params,{signal:controller.signal});
      if (!response.ok) throw new Error();
      const data=await response.json();
      const matches=data.features.map(({geometry,properties:p})=>({
        name:p.name || [p.housenumber,p.street].filter(Boolean).join(' '),
        detail:[p.street,p.district,p.city].filter(Boolean).join(' · '),
        lat:geometry.coordinates[1],lon:geometry.coordinates[0]
      })).filter(isLocalPlace);
      if (controller.signal.aborted) return;
      setResults(matches);
      setMessage(matches.length?'Choose a map result.':'No local matches. Try a street address or a different spelling.');
    } catch {
      if (!controller.signal.aborted) setMessage('Map search is unavailable. Try again or choose the UGLi below.');
    }
  }
  const exists=selected && places.some(p=>placeKey(p)===placeKey(selected));
  const bus=selected && home && customCommute(home,selected,'transit').out;
  return <Dialog onClose={onClose}>
    <h2 id="dialog-title">{savedView?'Saved homes map':'Add a destination'}</h2>
    <p>Find a building, business or street address around Ann Arbor.</p>
    <form className="place-search" onSubmit={search}>
      <label htmlFor="place-query">Place or address</label>
      <div><input id="place-query" autoFocus value={query} placeholder="e.g. the UGLi" onChange={e=>{
        request.current?.abort(); setQuery(e.target.value); select(null); setResults([]); setMessage('');
      }}/><button className="secondary" disabled={!query.trim()}>Search</button></div>
    </form>
    <button className="text-button" onClick={()=>{setQuery('UGLi');pick(library);}}>Use the UGLi</button>
    <p role="status">{message}</p>
    {results.map((place,i)=><button className="place-result" key={placeKey(place)+i} onClick={()=>pick(place)}>{place.name}<small>{place.detail}</small></button>)}
    {places.length>0 && <label className="formrow">Routine destination<select value={places.some(p=>selected && placeKey(p)===placeKey(selected))?placeKey(selected):''} onChange={e=>{
      const p=places.find(item=>placeKey(item)===e.target.value); if(p) pick(p);
    }}><option value="" disabled>Choose a destination</option>{places.map(p=><option key={placeKey(p)} value={placeKey(p)}>{p.name}</option>)}</select></label>}
    <HomeMap homes={homes} active={home} onSelect={setActiveId} destination={selected}/>
    {home && <><label className="formrow">Travel from<select value={home.id} onChange={e=>setActiveId(e.target.value)}>
      {homes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <p aria-live="polite"><strong>{home.name}</strong> · {home.area} · {cash(home.monthly)}/mo</p></>}
    {selected && <><h3>{selected.name}</h3>
      {bus && <p>From {home.name}: <strong>{customCommute(home,selected,'walk').out.minutes} min walking</strong> · {bus.bus ? bus.minutes+' min via '+bus.label : 'walking is fastest among modeled routes'}.</p>}
      {!exists && <label className="formrow">Round trips per week<select value={visits} onChange={e=>setVisits(Number(e.target.value))}>{Array.from({length:8},(_,n)=><option key={n}>{n}</option>)}</select></label>}
      <button className="primary" onClick={()=>{if (!exists) return onAdd({...selected,visits}); onRemove(selected); select(null); setQuery(''); setMessage('Removed '+selected.name+' from your routine.');}}>{exists?'Remove from routine':'Add to my routine'}</button></>}
    <p><small>Estimates start at the sample home’s neighborhood center. Walking uses approximate distance; bus estimates include walks to stops and modeled weekday waits. Map data © OpenStreetMap contributors.</small></p>
  </Dialog>;
}
