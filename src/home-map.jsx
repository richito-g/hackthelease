import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { originFor } from '../places.js';

export default function HomeMap({homes,active,onSelect,destination}) {
  const container = useRef(null);
  const map = useRef(null);
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
  return <div className="place-map saved-place-map" role="region" aria-label="Map of homes and destination" ref={container}/>;
}
