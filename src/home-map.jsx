import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { originFor } from '../places.js';

export default function HomeMap({homes,active,onSelect,destination}) {
  const container = useRef(null);
  const map = useRef(null);
  const [showBuses,setShowBuses] = useState(false);
  const [busStatus,setBusStatus] = useState('');
  const pins = useRef(new Map());
  useEffect(()=>{
    const instance = L.map(container.current,{scrollWheelZoom:false}).setView([42.28,-83.74],13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(instance);
    map.current=instance;
    const observer=new ResizeObserver(()=>instance.invalidateSize());
    observer.observe(container.current);
    return ()=>{observer.disconnect();instance.remove();map.current=null;};
  },[]);

  useEffect(()=>{
    const instance=map.current;
    const layer=L.layerGroup().addTo(instance);
    const points=[];
    const groups=homes.reduce((acc,home)=>{
      if (!acc.has(home.area)) acc.set(home.area,[]);
      acc.get(home.area).push(home);return acc;
    },new Map());
    for (const [area,group] of groups) {
      const point=originFor(group[0]);
      points.push(point);
      const title=group.length===1 ? group[0].name : group.length+' homes in '+area;
      const marker=L.marker(point,{
        title,alt:title,icon:L.divIcon({className:'home-map-pin',html:group.length===1?'⌂':String(group.length),iconSize:[32,32],iconAnchor:[16,16]})
      }).addTo(layer);
      pins.current.set(area,marker);
      if (group.length===1) marker.on('click',()=>onSelect(group[0].id));
      else {
        const list=document.createElement('div');
        list.className='home-map-choices';
        for (const home of group) {
          const button=document.createElement('button');
          button.type='button';button.textContent=home.name;
          button.onclick=()=>{onSelect(home.id);instance.closePopup();};
          list.append(button);
        }
        marker.bindPopup(list);
      }
    }
    if (destination) {
      const point=[destination.lat,destination.lon];
      points.push(point);
      const label=document.createElement('span');
      label.textContent=destination.name;
      L.marker(point,{title:destination.name,alt:destination.name,
        icon:L.divIcon({className:'home-map-destination',html:'◆',iconSize:[22,22],iconAnchor:[11,11]})
      }).addTo(layer).bindTooltip(label);
    }
    if(points.length) instance.fitBounds(points,{padding:[30,30],maxZoom:15,animate:false});
    return ()=>{layer.remove();pins.current.clear();};
  },[homes,destination,onSelect]);

  useEffect(()=>{
    for (const [area,marker] of pins.current) marker.getElement()?.classList.toggle('is-selected',area===active?.area);
  },[homes,destination,active]);
  useEffect(()=>{
    if (!showBuses) return;
    const layer=L.layerGroup().addTo(map.current);
    const controller=new AbortController();
    let nextRefresh;
    async function refresh() {
      try {
        const response=await fetch('/api/magic-bus',{signal:controller.signal});
        if (!response.ok) throw new Error('Magic Bus unavailable');
        const {vehicles,updatedAt}=await response.json();
        if (controller.signal.aborted) return;
        layer.clearLayers();
        for (const bus of vehicles) {
          const title='U-M bus '+bus.label+(bus.route?' · Route '+bus.route:'');
          const label=document.createElement('span');
          label.textContent=title;
          L.marker([bus.lat,bus.lon],{
            title,alt:title,zIndexOffset:-1000,riseOnHover:true,
            icon:L.divIcon({className:'home-map-bus',html:'BUS',iconSize:[32,20],iconAnchor:[16,10]})
          }).addTo(layer).bindPopup(label);
        }
        const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',timeStyle:'short'}).format(updatedAt);
        setBusStatus(vehicles.length ? vehicles.length+' U-M buses reporting · Updated '+time+' ET' :
          'No U-M buses are currently reporting positions.');
      } catch {
        if (controller.signal.aborted) return;
        layer.clearLayers();
        setBusStatus('Live bus positions are unavailable. Retrying shortly.');
      }
      if (!controller.signal.aborted) nextRefresh=setTimeout(refresh,30000);
    }
    refresh();
    return ()=>{controller.abort();clearTimeout(nextRefresh);layer.remove();};
  },[showBuses]);

  return <>
    <div className="place-map saved-place-map" role="region" aria-label="Map of homes and destination" ref={container}/>
    <div className="map-transit-controls">
      <label><input type="checkbox" checked={showBuses} onChange={event=>{
        setShowBuses(event.target.checked);
        setBusStatus(event.target.checked?'Loading live bus positions…':'');
      }} /> Live U-M buses</label>
      <a href="https://mbus.ltp.umich.edu/" target="_blank" rel="noreferrer">Magic Bus stop times</a>
      <small role="status">{busStatus}</small>
    </div>
  </>;
}
