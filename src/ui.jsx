import React, { useLayoutEffect, useRef } from 'react';
import { miniature } from '../atlas.js';
import { cash, destinations, duration } from '../model.js';

export function Study({home}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    const draw = () => miniature(canvas,home);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  },[home]);
  return <canvas ref={ref} aria-hidden="true" />;
}

export function ListingStats({home,routine}) {
  const difference = routine.budget - home.monthly;
  return <dl className="listing-stats">
    <div><dt>Monthly housing</dt><dd>{cash(home.monthly)}<small>{cash(home.rent)} rent + {cash(home.utilities)} utilities</small></dd></div>
    <div><dt>{difference < 0 ? 'Over budget' : 'Budget left'}</dt><dd>{cash(Math.abs(difference))}<small>of your {cash(routine.budget)} cap</small></dd></div>
    <div><dt>Weekly travel</dt><dd>{duration(home.weekly)}<small>{routine.days.reduce((a,b)=>a+b,0)} round trips</small></dd></div>
  </dl>;
}

export function CampusStats({home,routine}) {
  return <table className="listing-commutes">
    <caption>Estimated travel from this home</caption>
    <thead><tr><th scope="col">Destination</th><th scope="col">One way</th><th scope="col">Per week</th></tr></thead>
    <tbody>{home.trips.map(({out,back},index) => {
      const visits = routine.days[index];
      return <tr key={destinations[index]}>
        <th scope="row">{destinations[index]}<small>{out.label}{out.bus && ' · '+out.bus.from}</small></th>
        <td><strong>{out.minutes} min</strong>{back.minutes !== out.minutes && <small>{back.minutes} min back</small>}</td>
        <td><strong>{duration((out.minutes+back.minutes)*visits)}</strong><small>{visits} {visits===1?'visit':'visits'}</small></td>
      </tr>;
    })}</tbody>
  </table>;
}

export function Dialog({children,onClose,wide=false}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  },[]);
  return <dialog ref={ref} className={wide?'dialog-wide':undefined} aria-labelledby="dialog-title"
    onCancel={event=>{event.preventDefault();onClose();}}
    onClick={event=>{if(event.target===event.currentTarget) onClose();}}>
    <div className="modal-shell">
      <button className="close" aria-label="Close dialog" onClick={onClose}>×</button>
      {children}
    </div>
  </dialog>;
}
