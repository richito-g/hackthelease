import React, { useState } from 'react';
import { cash, duration, homes, presets, rankHomes, semesterHedge, semesterWeeks } from '../model.js';
import { Study } from './ui.jsx';

const sample = {...presets.central,mode:'walk'};
const weeks = semesterWeeks(sample,0,4);
const baseline = rankHomes(sample);
const baselineWinner = baseline[0];
const hedge = semesterHedge(weeks);
const timeScale = 8 * 60;
const colors = {a:'#365b48',b:'#4e6084',c:'#9a6143'};

function WeekComparison({week}) {
  const winner = week.winner;
  const reordered = week.north !== sample.days[1];
  const currentBaseline = week.options.find(home=>home.id===baselineWinner.id);
  const savings = currentBaseline.weekly-winner.weekly;
  const rentDifference = currentBaseline.monthly-winner.monthly;

  return <section className="showcase-compare" aria-labelledby="showcase-compare-title">
    <div className="showcase-section-heading">
      <div><h2 id="showcase-compare-title">How the week changes</h2><p>Housing costs stay fixed. Each bar shows total weekly walking on the same scale.</p></div>
      <div className="chart-legend"><span>Original week</span><span>Selected week</span></div>
    </div>
    <div className="showcase-homes">{homes.map(home=>{
      const before = baseline.find(item=>item.id===home.id);
      const now = week.options.find(item=>item.id===home.id);
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
      <p>{winner.id!==baselineWinner.id
        ? (savings>0?duration(savings)+' less walking each week than '+baselineWinner.name+' in this scenario.'
          : cash(rentDifference)+' less per month in housing, with '+duration(-savings)+' more walking each week than '+baselineWinner.name+'.')
        : reordered ? 'This schedule still favors '+baselineWinner.name+' at the chosen budget and value of time.'
          : 'Move a visit to North Campus to see whether the original recommendation holds up.'}</p>
    </div>
  </section>;
}

function LeaseRisk() {
  const [expanded,setExpanded] = useState(false);
  const risks = homes.map(home=>({...home,worst:Math.max(...weeks.map(week=>week.gaps[home.id]))}));
  const maxRisk = Math.max(...risks.map(home=>home.worst));

  return <section className="showcase-risk" aria-labelledby="risk-title">
    <div className="showcase-section-heading">
      <div><h2 id="risk-title">What if the schedule is still undecided?</h2><p>Check every week from zero to four North Campus visits.</p></div>
      <button className="secondary" aria-expanded={expanded} aria-controls="risk-results"
        onClick={()=>setExpanded(!expanded)}>{expanded?'Hide downside':'Reveal the least downside'}</button>
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
  const week = weeks[north];
  return <section className="showcase" aria-labelledby="showcase-title">
    <div className="showcase-hero">
      <div><p className="eyebrow">HOMEBASE DEMO · ANN ARBOR</p>
        <h1 id="showcase-title">Your lease is due Friday. Your schedule isn’t out yet.</h1>
        <p>Pick a home for the week you expect. Then see what happens when one class day moves across campus.</p>
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
      <button className="primary" onClick={()=>setNorth(north===2?1:2)}>{north===2?'Restore the original week':'Try two North Campus days'}</button>
    </div>
    <WeekComparison week={week} />
    <LeaseRisk />
    <details className="showcase-evidence">
      <summary>How Homebase makes the call</summary>
      <p>First, exclude homes above the housing cap. For each remaining home, add rent and utilities to its estimated monthly walking hours multiplied by {cash(sample.value)} per hour. For undecided schedules, compare each home with the best choice for each week, then pick the home with the smallest maximum gap.</p>
      <p>Listings and travel times are illustrative. Try bus waits or your own routine in <a href="#semester">Semester lab</a>.</p>
    </details>
  </section>;
}
