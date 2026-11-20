import {multiplierLabel} from './rules.js';
import {DICE_STYLES} from './cosmetics.js';

const phi = (1 + Math.sqrt(5)) / 2;
const signs = [-1, 1];
const vertices = [];
for (const x of signs) for (const y of signs) for (const z of signs) vertices.push([x,y,z]);
const normals = [];
for (const a of signs) for (const b of signs) {
  vertices.push([0,a/phi,b*phi], [a/phi,b*phi,0], [a*phi,0,b/phi]);
  normals.push([0,a*phi,b], [a,0,b*phi], [a*phi,b,0]);
}
const dot = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
const cross = ([a,b,c],[x,y,z]) => [b*z-c*y,c*x-a*z,a*y-b*x];
const unit = v => { const n=Math.hypot(...v); return v.map(x=>x/n); };
const labels = [1,-1,2,-2,5,-5,10,1,-1,1,-1,2];

export const faces = normals.map((normal,i)=>{
  const z=unit(normal), x=unit(cross([0,1,0],z)), y=cross(z,x);
  const plane=Math.max(...vertices.map(v=>dot(v,z)));
  const corners=vertices.filter(v=>Math.abs(dot(v,z)-plane)<1e-7)
    .sort((a,b)=>Math.atan2(dot(a,y),dot(a,x))-Math.atan2(dot(b,y),dot(b,x)));
  const center=z.map(n=>n*plane);
  return {x,y,z,corners,center,value:labels[i]};
});

const clamp = n => Math.max(0,Math.min(1,n));
const rotateX = ([x,y,z],a) => [x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
const rotateY = ([x,y,z],a) => [x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a)];
const rotateZ = ([x,y,z],a) => [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z];
export function dicePose(value, progress) {
  const target=faces.find(f=>f.value===value)||faces[0];
  const p=clamp(progress), winding=(1-p)**2;
  return v=>rotateZ(rotateX(rotateY([dot(v,target.x),dot(v,target.y),dot(v,target.z)],winding*18+.29),winding*24-.22),winding*8+.12);
}

let wood;
function woodGrain() {
  if(wood)return wood;
  wood=document.createElement('canvas');
  wood.width=wood.height=160;
  const c=wood.getContext('2d');
  c.fillStyle='#8b4d27';c.fillRect(0,0,160,160);
  for(let n=0;n<112;n++){
    const base=n*1.45,grain=n%11;
    c.strokeStyle=grain<4?'#2f120a46':grain>7?'#efd09d48':'#e09b574a';
    c.lineWidth=grain===1?1.8:.7;c.beginPath();
    for(let x=0;x<=160;x+=4){
      const y=base+2.3*Math.sin(x/29+n*.21)+1.3*Math.sin(x/6+n);
      if(x)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.stroke();
  }
  return wood;
}
export function startDice(canvas, roll, duration, landing, reduced, onLand) {
  const c=canvas.getContext('2d');
  const style=DICE_STYLES.find(item=>item.id===roll.dieStyle)||DICE_STYLES[0];
  const grain=style.texture?woodGrain():null;
  const started=performance.now();
  let frame, landed=false;
  function draw(now){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    c.setTransform(dpr,0,0,dpr,0,0);
    c.clearRect(0,0,w,h);
    const p=reduced?1:clamp((now-started)/duration/.82);
    const throwProgress=1-(1-p)**3;
    const x=landing.x-(Math.min(w*.38,330))*(1-throwProgress);
    const floor=landing.y+(1-throwProgress)*Math.min(h*.22,140);
    const lift=p<.43?Math.sin(p/.43*Math.PI)*Math.min(h*.24,165):Math.abs(Math.sin((p-.43)*22))*(1-p)**2*125;
    const scale=Math.min(52,w*.121)*(1+.14*lift/160);
    const pose=dicePose(roll.value,p);
    const screen=v=>{const [a,b,z]=pose(v);return [x+a*scale,floor-lift-scale*.82-b*scale,z];};
    const stopGlow=clamp(1-(now-started-duration*.82)/420);
    c.fillStyle='rgba(6,15,25,.38)';
    c.beginPath();c.ellipse(x,floor+9,scale*1.33,scale*.35,0,0,2*Math.PI);c.fill();
    if(!reduced){
      c.strokeStyle=style.edge;c.globalAlpha=(p>=1?.65*stopGlow:.28*(1-p));
      c.lineWidth=2;c.beginPath();c.ellipse(x,floor+7,scale*(1.8+(.8-stopGlow)*.6),scale*.65,0,0,2*Math.PI);c.stroke();
      for(let i=0;i<18;i++){
        const angle=i*2.399,r=scale*(.55+(i%5)*.21)*(p>=1?1.65-stopGlow*.7:1);
        c.fillStyle=i%3===0?'#fff':style.edge;c.beginPath();
        c.arc(x+Math.cos(angle)*r,floor-lift*.45+Math.sin(angle)*r*.45,(i%3)+1,0,2*Math.PI);c.fill();
      }
      c.globalAlpha=1;
    }
    for(const face of faces.filter(f=>pose(f.z)[2]>.005).sort((a,b)=>screen(a.center)[2]-screen(b.center)[2])){
      const points=face.corners.map(screen), center=screen(face.center);
      const [rx,ry]=pose(face.x),[ux,uy]=pose(face.y);
      c.save();c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();
      c.fillStyle=style.base;c.fill();c.strokeStyle=style.edge;c.lineWidth=2;c.stroke();c.clip();
      const nz=pose(face.z)[2];
      c.transform(rx*scale,-ry*scale,-ux*scale,uy*scale,center[0],center[1]);
      if(grain){c.globalAlpha=.86;c.drawImage(grain,-1.14,-1.14,2.28,2.28);c.globalAlpha=1;}
      const light=c.createLinearGradient(-1,-1,1,1);
      light.addColorStop(0,`rgba(255,247,225,${nz*.37})`);light.addColorStop(1,`rgba(3,9,18,${.51-nz*.22})`);
      c.fillStyle=light;c.fillRect(-1.2,-1.2,2.4,2.4);
      c.font='900 .57px system-ui';c.textAlign='center';c.textBaseline='middle';
      c.strokeStyle='#07101b';c.lineWidth=.046;c.strokeText(multiplierLabel(face.value),0,.025);
      c.fillStyle=style.ink;c.fillText(multiplierLabel(face.value),0,.025);
      c.restore();
    }
    if(p>=1&&!landed){landed=true;onLand();}
    if(now-started<duration)frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return ()=>{cancelAnimationFrame(frame);c.clearRect(0,0,canvas.width,canvas.height);};
}
