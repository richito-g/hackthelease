import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from './ui.jsx';
import { customCommute } from '../model.js';
import { isLocalPlace, library, placeKey } from '../places.js';

export default function PlacePicker({home,onAdd,onClose,places}) {
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
  const {lat,lon}=selected ?? {lat:42.28,lon:-83.74};
  const zoom=selected?.lat ? 0.006 : 0.035;
  const map=new URLSearchParams({bbox:[lon-zoom,lat-zoom,lon+zoom,lat+zoom].join(','),layer:'mapnik'});
  if (selected) map.set('marker',lat+','+lon);
  const exists=selected && places.some(p=>placeKey(p)===placeKey(selected));
  const bus=selected && home && customCommute(home,selected,'transit').out;
  return <Dialog onClose={onClose}>
    <h2 id="dialog-title">Add a destination</h2>
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
    <iframe className="place-map" title="Ann Arbor destination map" src={'https://www.openstreetmap.org/export/embed.html?'+map} />
    {selected && <><h3>{selected.name}</h3>
      {bus && <p>From {home.name}: <strong>{customCommute(home,selected,'walk').out.minutes} min walking</strong> · {bus.bus ? bus.minutes+' min via '+bus.label : 'walking is fastest among modeled routes'}.</p>}
      <label className="formrow">Round trips per week<select value={visits} onChange={e=>setVisits(Number(e.target.value))}>{Array.from({length:8},(_,n)=><option key={n}>{n}</option>)}</select></label>
      <button className="primary" disabled={exists} onClick={()=>onAdd({...selected,visits})}>{exists?'Already in your routine':'Add to my routine'}</button></>}
    <p><small>Estimates start at the sample home’s neighborhood center. Walking uses approximate distance; bus estimates include walks to stops and modeled weekday waits. Map data © OpenStreetMap contributors.</small></p>
  </Dialog>;
}
