import { homes } from './model.js';

// Orthographic drawing shared by the neighborhood atlas and apartment studies.
function surface(canvas) {
  const w=canvas.clientWidth, h=canvas.clientHeight, dpi=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(w*dpi); canvas.height=Math.round(h*dpi);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpi,0,0,dpi,0,0);
  return {ctx,w,h};
}
function painter(ctx,project) {
  function polygon(points,fill,stroke) {
    ctx.beginPath();
    points.map(p=>project(...p)).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.65;ctx.stroke();}
  }
  function line(points,color,width=1,dash=[]) {
    ctx.beginPath();points.map(p=>project(...p)).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.setLineDash(dash);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);
  }
  function tile(x,y,dx,dy,z,fill,stroke) {
    polygon([[x,y,z],[x+dx,y,z],[x+dx,y+dy,z],[x,y+dy,z]],fill,stroke);
  }
  function box(x,y,dx,dy,z,h,colors,edge) {
    const a=x+dx,b=y+dy,t=z+h;
    polygon([[x,b,z],[a,b,z],[a,b,t],[x,b,t]],colors[1],edge);
    polygon([[a,y,z],[a,b,z],[a,b,t],[a,y,t]],colors[2],edge);
    tile(x,y,dx,dy,t,colors[0],edge);
  }
  return {polygon,line,tile,box};
}
function seed(x,y,n=1) { const t=Math.sin(x*127.1+y*311.7+n*71.83)*43758.5453;return t-Math.floor(t); }
export function miniature(canvas,home) {
  const {ctx,w,h}=surface(canvas); if(!w||!h)return;
  const s=Math.min(w/3.0,h/1.97);
  const cx=w*.52,cy=h*.59;
  const project=(x,y,z=0)=>[cx+(x-y)*s*.9,cy+(x+y)*s*.42-z*s*.86];
  const {box,tile,polygon}=painter(ctx,project), p=home.palette;
  const glass=['#4a584f','#596459','#d9b47e','#394944'];
  function building(x,y,dx,dy,height,floors,nx,ny) {
    box(x,y,dx,dy,.03,height,p,'#323c3480');
    for(let f=0;f<floors;f++){
      const bottom=.03+(f+.17)*height/floors, top=bottom+height/floors*.60;
      for(let i=0;i<nx;i++){
        const l=x+(i+.18)*dx/nx,r=l+dx/nx*.61;
        polygon([[l,y+dy,bottom],[r,y+dy,bottom],[r,y+dy,top],[l,y+dy,top]],glass[(i+f)%4]);
      }
      for(let i=0;i<ny;i++){
        const l=y+(i+.18)*dy/ny,r=l+dy/ny*.63;
        polygon([[x+dx,l,bottom],[x+dx,r,bottom],[x+dx,r,top],[x+dx,l,top]],glass[(i+f+1)%4]);
      }
    }
    box(x-.018,y-.018,dx+.036,dy+.036,height+.03,.035,['#d3c5aa','#b4aa92','#847c6b']);
    tile(x+.05,y+.05,dx-.10,dy-.10,height+.066,'#6b756a');
    box(x+dx*.20,y+dy*.18,dx*.32,dy*.29,height+.069,.07,['#bcbcac','#969a8c','#747d70']);
  }
  function tree(x,y,z) {
    box(x,y,.025,.025,.04,z*.65,['#86735c','#6f6754','#494b3b']);
    const r=z*.31, base=z*.48;
    const a=[x-r,y,base],b=[x,y-r,base+.03],c=[x+r,y,base],d=[x,y+r,base-.02],t=[x+.02,y,z*1.2];
    polygon([a,b,t],'#749268');polygon([b,c,t],'#89a279');polygon([c,d,t],'#526f54');polygon([d,a,t],'#66855c');
  }
  box(-.68,-.46,1.35,.96,-.07,.09,['#838c73','#586250','#424d40']);
  tile(-.60,-.4,1.19,.76,.03,'#a3a18c');
  tree(-.57,-.33,.4);
  if(home.form===0){building(-.44,-.30,.78,.43,.66,4,7,4);building(.12,.06,.41,.27,.39,2,4,3);}
  if(home.form===1){building(-.45,-.28,.51,.49,.82,5,4,4);building(.06,-.28,.4,.46,.53,3,3,4);}
  if(home.form===2){building(-.45,-.30,.84,.32,.49,3,7,3);building(-.39,.04,.43,.24,.34,2,4,2);}
  tree(-.52,.30,.35);tree(.56,-.28,.33);tree(.51,.33,.27);
}
export function drawAtlas(canvas, selected, visits, zoom, inventory=homes) {
  const {ctx,w,h}=surface(canvas);
  if(!w||!h)return;
  const unit=Math.min(w/16,h/8.5)*zoom;
  const project=(x,y,z=0)=>[w*.5+(x-y+.35)*unit,h*.51+(x+y-8.7)*unit*.47-z*unit];
  const {box,tile,line,polygon}=painter(ctx,project);
  ctx.fillStyle='#172420';ctx.fillRect(0,0,w,h);
  for(let i=-12;i<22;i++){
    line([[i,-15],[i,25]],'#35433d',1.4);line([[-15,i],[25,i]],'#35433d',1.4);
  }
  const riverY=x=>2.75+.15*Math.sin(x*.62);
  let banks=[];for(let x=-14;x<=25;x+=.25)banks.push([x,riverY(x)]);
  polygon([...banks,...banks.slice().reverse().map(([x,y])=>[x,y+.88])],'#234447');
  line(banks,'#496b61',2);line(banks.map(([x,y])=>[x,y+.88]),'#42675f',2);
  for(let x=-12;x<22;x+=.42){
    const y=riverY(x)+.15+seed(x,7)*.5;line([[x,y],[x+.21,y-.02]],'#365b5b',.75);
  }
  for(const x of [-4,2,6,11,17]) {
    tile(x-.13,2.4,.26,1.55,.015,'#78837a');line([[x,2.4],[x,3.95]],'#bdbaa0',.8,[3,4]);
  }
  // Nearby blocks are painted last so building facades occlude the blocks behind them.
  for(let depth=-16;depth<=35;depth++)for(let x=-10;x<=23;x++){
    const y=depth-x; if(y < -10||y>22||y===3||y===2)continue;
    const [sx,sy]=project(x,y);if(sx < -unit*2 || sx>w+unit*2 || sy < -unit*2 || sy>h+unit*3)continue;
    const park=seed(x,y,3)>.74;
    tile(x+.075,y+.075,.85,.85,.005,park?'#354b37':'#2c3832','#3b4940');
    if(park){
      for(let t=0;t<6;t++){const tx=x+.16+seed(x,y,t+13)*.66,ty=y+.16+seed(x,y,t+32)*.60;
        const [px,py]=project(tx,ty);ctx.beginPath();ctx.ellipse(px+1,py,unit*.065,unit*.032,0,0,7);ctx.fillStyle='#243a2c';ctx.fill();
        const r=.075,top=[tx,ty,.20];polygon([[tx-r,ty],[tx,ty+r],top],'#45644d');polygon([[tx,ty+r],[tx+r,ty],top],'#394f3d');polygon([[tx+r,ty],[tx,ty-r],top],'#526953');
      }continue;
    }
    for(let by=0;by<2;by++)for(let bx=0;bx<2;bx++){
      const n=by*2+bx,bh=.09+seed(x,y,n+6)*.32,px=x+.12+bx*.40,py=y+.13+by*.39;
      const dx=.22+seed(x,y,n+17)*.14,dy=.18+seed(x,y,n+23)*.15;
      const roofs=['#657068','#5b6960','#526059','#768075','#697367'];
      box(px,py,dx,dy,.01,bh,[roofs[Math.floor(seed(x,y,n+12)*5)],'#424e45','#354039'],'#313e3566');
      if(bh>.28)tile(px+.04,py+.05,dx*.36,dy*.34,bh+.013,'#798278');
    }
  }
  const home=inventory.find(h=>h.id===selected);
  const anchors=[[6.6,8.3],[5.7,0],[.7,5.6]];
  anchors.forEach(([x,y], index)=>{
    if (!visits[index]) return;
    line([[home.x,home.y,.09],[x,home.y,.09],[x,y,.09]], '#101911', 5);
    line([[home.x,home.y,.09],[x,home.y,.09],[x,y,.09]], home.color, 1.6 + visits[index] * .32, [5,5]);
  });
  const crown=project(home.x,home.y);
  const halo=ctx.createRadialGradient(...crown,0,...crown,unit*1.25);
  halo.addColorStop(0,home.color+'45');halo.addColorStop(1,home.color+'00');
  ctx.fillStyle=halo;ctx.fillRect(crown[0]-unit*1.3,crown[1]-unit*1.3,unit*2.6,unit*2.6);
  line([[home.x,home.y,.02],[home.x+.49,home.y,.02],[home.x+.49,home.y+.5,.02]],home.color,2.4,[3,4]);
  const vignette=ctx.createRadialGradient(w*.5,h*.48,w*.19,w*.5,h*.48,w*.65);
  vignette.addColorStop(0,'#101a1500');vignette.addColorStop(1,'#09120dc2');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  function label(name,x,y,rotation=0) {
    const [px,py]=project(x,y);ctx.save();ctx.translate(px,py);ctx.rotate(rotation);ctx.textAlign='center';ctx.font='600 11px ui-monospace,monospace';ctx.lineWidth=3;ctx.strokeStyle='#1c2a22';ctx.strokeText(name,0,0);ctx.fillStyle='#ccd4c7';ctx.fillText(name,0,0);ctx.restore();
  }
  label('K E R R Y T O W N',.7,5.6);label('N O R T H   C A M P U S',5.7,0);label('C E N T R A L   C A M P U S',6.6,8.3);label('Huron River',3.8,3.25,.43);
  return inventory.map(({id,x,y}) => ({id, point:project(x,y,.08)}));
}
