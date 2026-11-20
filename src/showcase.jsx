import React, { useState } from 'react';
import { cash, duration, homes, presets, rankHomes, semesterHedge, semesterWeeks } from '../model.js';
import { Study } from './ui.jsx';
import { modes } from './state.js';

const sample = {...presets.central,mode:'walk'};
const weeks = semesterWeeks(sample,0,4);
const baseline = rankHomes(sample);
const cheapestSample = baseline.reduce((best,home)=>home.monthly<best.monthly ? home : best);
const fastestSample = baseline.reduce((best,home)=>home.weekly<best.weekly ? home : best);
const hedge = semesterHedge(weeks);
const timeScale = 8 * 60;
const colors = {a:'#365b48',b:'#4e6084',c:'#9a6143'};

function WeekComparison({routine}) {
  const walking = rankHomes({...routine,mode:'walk'});
  const options = rankHomes(routine);
  const winner = options[0];
  const cheapest = options.reduce((best,home)=>home.monthly<best.monthly ? home : best);
  const quickest = options.reduce((best,home)=>home.weekly<best.weekly ? home : best);
  const extraTime = cheapest.weekly-quickest.weekly;
  const discount = quickest.monthly-cheapest.monthly;

  return <section className="showcase-compare" aria-labelledby="showcase-compare-title">
    <div className="showcase-section-heading">
      <div><h2 id="showcase-compare-title">Compare rent and weekly travel</h2><p>Travel includes both directions for every campus visit.</p></div>
      <div className="chart-legend"><span>Walk only</span><span>Selected mode</span></div>
    </div>
    <div className="showcase-homes">{homes.map(home=>{
      const before = walking.find(item=>item.id===home.id);
      const now = options.find(item=>item.id===home.id);
      return <article className={'showcase-home '+(winner.id===home.id?'showcase-winner':'')} key={home.id} style={{'--campus-ink':colors[home.id]}}>
        <div className="showcase-home-art"><Study home={home} /></div>
        <header><div><h3>{home.name}</h3><p>{home.area} · {cash(now.monthly)}/mo</p></div>
          {winner.id===home.id && <span className="showcase-fit">Best fit</span>}</header>
        <div className="scenario-meter"><div className="scenario-track"><span style={{width:before.weekly/timeScale*100+'%'}} /></div><span>{duration(before.weekly)}</span></div>
        <div className="scenario-meter is-current"><div className="scenario-track"><span style={{width:now.weekly/timeScale*100+'%'}} /></div><strong>{duration(now.weekly)}</strong></div>
        <div className="scenario-cost"><span>Time-adjusted cost</span><strong>{cash(now.burden)}/mo</strong></div>
      </article>;
    })}</div>
    <div className="showcase-verdict" role="status">
      <span>Best fit</span><strong>{winner.name}</strong>
      <p>{extraTime>0
        ? cheapest.name+' costs '+cash(discount)+' less per month than '+quickest.name+' and adds '+duration(extraTime)+' of travel each week.'
        : cheapest.name+' has the lowest housing cost and is tied for or has the shortest commute.'}</p>
    </div>
  </section>;
}

function LeaseRisk() {
  const [expanded,setExpanded] = useState(false);
  const risks = homes.map(home=>({...home,worst:Math.max(...weeks.map(week=>week.gaps[home.id]))}));
  const maxRisk = Math.max(...risks.map(home=>home.worst));

  return <section className="showcase-risk" aria-labelledby="risk-title">
    <div className="showcase-section-heading">
      <div><h2 id="risk-title">How well does each home fit other routines?</h2><p>Optional: compare five walking schedules with different numbers of North Campus visits.</p></div>
      <button className="secondary" aria-expanded={expanded} aria-controls="risk-results"
        onClick={()=>setExpanded(!expanded)}>{expanded?'Hide results':'Compare across weeks'}</button>
    </div>
    {expanded && <div id="risk-results">
      <div className="risk-answer" role="status">
        <strong>{hedge.name} has the smallest worst-case gap.</strong>
        <p>It comes first in none of the five weeks. Its largest gap from that week’s best lease is {cash(hedge.worstGap)} per month, including the student’s value of time.</p>
      </div>
      <div className="risk-bars">{risks.map(home=><div key={home.id} className="risk-bar">
        <span>{home.name}</span><div className="scenario-track"><span style={{width:home.worst/maxRisk*100+'%',background:colors[home.id]}} /></div>
        <strong>{cash(home.worst)}</strong>
      </div>)}</div>
    </div>}
  </section>;
}

export default function Showcase() {
  const [north,setNorth] = useState(sample.days[1]);
  const [mode,setMode] = useState('walk');
  const routine = {...sample,days:[5-north,north,0],mode};
  return <section className="showcase" aria-labelledby="showcase-title">
    <div className="showcase-hero">
      <div><p className="eyebrow">HOMEBASE DEMO · ANN ARBOR</p>
        <h1 id="showcase-title">How much commute are you getting with that rent?</h1>
        <p>In this sample week, {cheapestSample.name} costs {cash(fastestSample.monthly-cheapestSample.monthly)} less per month than {fastestSample.name} and adds {duration(cheapestSample.weekly-fastestSample.weekly)} of walking every week. Try taking the bus and compare again.</p>
      </div>
      <dl className="scenario-assumptions">
        <div><dt>Housing cap</dt><dd>{cash(sample.budget)}<small> / month</small></dd></div>
        <div><dt>Campus visits</dt><dd>5<small> / week</small></dd></div>
        <div><dt>Value of travel time</dt><dd>{cash(sample.value)}<small> / hour</small></dd></div>
      </dl>
    </div>
    <div className="showcase-scenario">
      <div><label htmlFor="showcase-days">North Campus visits per week</label>
        <div className="showcase-range">
          <input type="range" id="showcase-days" min="0" max="4" value={north} onChange={event=>setNorth(Number(event.target.value))} />
          <output htmlFor="showcase-days">{north}</output>
        </div>
        <p>{5-north} Central Campus · {north} North Campus</p>
      </div>
      <label className="showcase-mode">Commute mode
        <select value={mode} onChange={event=>setMode(event.target.value)}>
          {Object.entries(modes).map(([key,label])=><option value={key} key={key}>{label}</option>)}
        </select>
      </label>
    </div>
    <WeekComparison routine={routine} />
    <LeaseRisk />
    <details className="showcase-evidence">
      <summary>How Homebase makes the call</summary>
      <p>First, exclude homes above the housing cap. For each remaining home, add rent and utilities to its estimated monthly travel hours multiplied by {cash(sample.value)} per hour. To compare across routines, compare each home with the best choice for each week, then pick the home with the smallest maximum gap.</p>
      <p>Listings and travel times are illustrative. Try bus waits or your own routine in <a href="#semester">Semester lab</a>.</p>
    </details>
  </section>;
}
