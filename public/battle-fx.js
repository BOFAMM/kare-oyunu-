import {project} from './rules.js';
import {teamColor} from './cosmetics.js';

export const FX_DURATION = 2050;
const cyan='#8beeff', gold='#ffcf69', orange='#ff8445', violet='#cdb2ff';
const images=new Map();
export function battleImage(name){
  if(typeof Image==='undefined')return null;
  if(!images.has(name)){const img=new Image();img.src='/assets/battle/'+name+'.png';images.set(name,img);}
  const image=images.get(name);
  return image.complete&&image.naturalWidth?image:null;
}

export function powerNotice(event, players){
  const actor=players.find(p=>p.id===event.player),target=players.find(p=>p.id===event.target);
  const name=actor?.name||'Komutan', rival=target?.name||'Rakip';
  const messages={
    1:['+ $','Dolu kese',name+' kasasına dolar ekledi.'],
    2:['⇄','Ordular yer değiştirdi',name+' ve '+rival+' bölgelerini takas etti.'],
    3:['$ ⇄ $','Kasalar takas edildi',name+' ve '+rival+' birbirinin bakiyesini aldı.'],
    4:['☣','Zehir bulutu',rival+' · '+(event.removed?.length||0)+' kare kaybedildi.'],
    5:['↓','Denizaltı füzesi',name+' · Hedef alanı 3 × 3.'],
    6:['◉','Işın kapısı',name+' ordusunu yeni konuma taşıdı.'],
    7:['$','Çeyrek pay',name+' · '+rival+' kasasından '+(event.money||0)+' $ alındı.'],
    8:['⊘','Hamle engellendi',rival+' bir sonraki sırasını pas geçecek.'],
    9:['×2','Çifte şans',name+' · Bu hamlede pozitif kazanç iki kat.'],
    10:['♥ 20','Çelik yürek',name+' · General canı 20 oldu.'],
    11:['$ ϟ','Kasa ve güç kilidi',name+' · Rakiplerin harcamaları ve güçleri kilitli.'],
    12:['−','Şans kalkanı',name+' · Bu hamledeki eksi zar kaybı engellenecek.'],
    13:['½','Yarım pay',name+' rakip birliklerini kendi saflarına kattı.'],
    14:['⬡','Dokunulmazlık',name+' saldırılara karşı koruma açtı.'],
    15:['▦','Yeniden dizilim',name+' birliklerinin konumunu düzenliyor.']
  };
  const [symbol,title,detail]=messages[event.power]||['✦','Özel güç',name];
  return {symbol,title,detail,portrait:(event.power===8?target:actor)?.generalSkin,tint:event.power===9?gold:teamColor(actor)};
}

const mix=(a,b,p)=>a+(b-a)*p;
const interp=(a,b,p)=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p)});
const clamp=v=>Math.max(0,Math.min(1,v));
const fade=p=>Math.max(0,1-p);

function ellipse(c,x,y,rx,ry,fill,stroke){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.stroke();}
}

function arrow(c,a,b,p,from,to,lift){
  const end=interp(a,b,Math.max(.06,p)), dx=end.x-a.x,dy=end.y-a.y;
  const x=end.x,y=end.y-lift,angle=Math.atan2(dy,dx||1);
  const ink=c.createLinearGradient(a.x,a.y-lift,x+1,y);
  ink.addColorStop(0,from);ink.addColorStop(.55,p<.5?from:to);ink.addColorStop(1,to);
  c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=6;
  c.beginPath();c.moveTo(a.x,a.y-lift);c.quadraticCurveTo((a.x+x)/2,(a.y-lift+y)/2-28,x,y);c.stroke();
  c.beginPath();c.moveTo(x+8*Math.cos(angle),y+8*Math.sin(angle));
  c.lineTo(x-19*Math.cos(angle-.58),y-19*Math.sin(angle-.58));
  c.lineTo(x-19*Math.cos(angle+.58),y-19*Math.sin(angle+.58));c.fill();
}

function glyph(c,text,x,y,color,size=30){
  c.textAlign='center';c.font='900 '+size+'px system-ui';
  c.lineWidth=5;c.strokeStyle='#091322';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);
}

// Binbun3D impact_core: radial front with angular streaks and a fading outer edge.
export function impact(c,x,y,p,tint,kind='slash'){
  const scale=kind==='fire'?1.55:1;
  c.save();c.globalAlpha*=fade(p);c.translate(x,y);
  c.lineWidth=Math.max(.6,3*(1-p));
  ellipse(c,0,0,8+p*58*scale,5+p*29*scale,null,tint);
  for(let i=0;i<10;i++){
    const angle=i*Math.PI/5+(kind==='slash'?.15:.4);
    const wave=Math.abs(Math.sin(angle*3.5+p*8));
    const radius=(8+p*(27+wave*20))*scale;
    c.strokeStyle=i%3?'#fff1c4':tint;
    c.beginPath();c.moveTo(Math.cos(angle)*radius,Math.sin(angle)*radius*.64);
    c.lineTo(Math.cos(angle)*(radius+15*fade(p)),Math.sin(angle)*(radius+15*fade(p))*.64);c.stroke();
  }
  if(kind==='slash'){c.rotate(-.7);ellipse(c,0,0,22+p*28,2+fade(p)*3,'#ffffff66',null);}
  if(kind==='arcane'){c.rotate(p*2);c.strokeStyle=tint;c.strokeRect(-12-p*12,-12-p*12,24+p*24,24+p*24);}
  c.restore();
}

export function missileEffect(c,board,e,p){
  const {x,y}=project(e.x,e.y);
  c.save();c.globalAlpha*=p<.52?.78:fade((p-.52)/.48);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    if(e.x+dx<0||e.y+dy<0||e.x+dx>=50||e.y+dy>=50)continue;
    const tile=project(e.x+dx,e.y+dy);board.diamond(c,tile.x,tile.y,'#ff4e3729','#ff9b60');
  }
  if(p<.52&&!board.reduced){
    const screenY=board.point?.(e.x,e.y).y;
    const entry=Math.max(300,(screenY||0)/(board.zoom||1)+45);
    const drop=clamp(p/.52), fall=drop*drop, rx=x+(1-fall)*44, ry=y-(1-fall)*entry-12;
    for(let i=10;i>=0;i--){
      c.globalAlpha=(1-i/12)*.53;
      ellipse(c,rx+i*2.8,ry-i*13,5+i*1.1,5+i*1.1,i<4?'#ffc164':'#8b929d');
    }
    c.globalAlpha=1;c.translate(rx,ry);c.rotate(-.14);
    const body=c.createLinearGradient(-10,0,10,0);
    body.addColorStop(0,'#3b5069');body.addColorStop(.48,'#f3f9ff');body.addColorStop(1,'#657e93');
    board.poly(c,[[0,17],[-9,0],[-9,-37],[9,-37],[9,0]],body);
    board.poly(c,[[-9,-25],[-17,-43],[-9,-39]],'#7c8ea4');
    board.poly(c,[[9,-25],[17,-43],[9,-39]],'#7c8ea4');
    c.fillStyle='#e87a45';c.fillRect(-9,-13,18,6);
    board.poly(c,[[-6,-39],[0,-63-Math.sin(p*70)*9],[6,-39]],'#ffc56c');
  }else{
    // Binbun3D explosion impact: layered noisy ring, hot core and outward debris.
    const q=board.reduced?.38:clamp((p-.52)/.48);
    impact(c,x,y-6,q,orange,'fire');
    for(let i=0;i<14;i++){
      const angle=i*2.399,r=q*(33+i%4*14),px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.6-q*15;
      const glow=c.createRadialGradient(px,py,0,px,py,17+q*8);
      glow.addColorStop(0,i%3===0?'#ffebbc':'#ff8b35aa');glow.addColorStop(1,'#3e292900');
      ellipse(c,px,py,17+q*8,17+q*8,glow);
    }
  }
  c.restore();
}

export function teleportMotion(e,p){
  const from=project(...e.source),to=project(e.x,e.y);
  const travel=clamp((p-.24)/.46);
  const height=Math.sin(Math.PI*clamp(p))**1.4*107;
  return {dx:(to.x-from.x)*travel,dy:(to.y-from.y)*travel,height,from};
}

export function powerEffect(c,board,e,progress,time){
  const owner=board.state?.players.find(p=>p.id===e.player);
  const target=board.state?.players.find(p=>p.id===e.target);
  const color=teamColor(owner), rival=teamColor(target);
  const a=e.source?project(...e.source):{x:0,y:650};
  const b=e.destination?project(...e.destination):{x:a.x+95,y:a.y};
  const p=board.reduced?.62:progress,q=Math.min(1,p*2.25);
  c.save();c.lineCap='round';c.globalAlpha=Math.min(1,(1-p)*3.2);
  if([2,3].includes(e.power)){
    arrow(c,a,b,q,color,rival,72);arrow(c,b,a,q,rival,color,37);
    if(e.power===3){glyph(c,'$',a.x,a.y-77,p<.55?color:rival);glyph(c,'$',b.x,b.y-77,p<.55?rival:color);}
  }
  if([3,7,13].includes(e.power)){
    for(let i=0;i<12;i++){
      const u=(p*1.7+i/12)%1, point=interp(i%2&&e.power===3?a:b,i%2&&e.power===3?b:a,u);
      ellipse(c,point.x,point.y-41-Math.sin(u*Math.PI)*49,4+Math.abs(Math.cos(p*15+i))*4,9,gold,'#fff1bd');
    }
    if(e.power===7){arrow(c,a,b,q*.9,color,gold,58);glyph(c,'+'+(e.money||0)+' $',a.x,a.y-90,gold,25);}
  }
  if(e.power===4){
    for(const [x,y] of e.removed||[]){
      const tile=project(x,y);c.globalAlpha=fade(p)**1.3;
      board.diamond(c,tile.x,tile.y,rival+'78','#b2f66e');
      for(let i=0;i<4;i++){
        const px=tile.x-13+i*8, wiggle=board.reduced?0:Math.sin(time/80+i)*7, height=12+q*(22+i*3);
        const flame=c.createLinearGradient(px,tile.y,px,tile.y-height);
        flame.addColorStop(0,'#663adf');flame.addColorStop(.55,'#a3f976');flame.addColorStop(1,'#e5ffbb00');
        c.fillStyle=flame;c.beginPath();c.moveTo(px-7,tile.y);
        c.quadraticCurveTo(px-10+wiggle,tile.y-height*.5,px+wiggle,tile.y-height);
        c.quadraticCurveTo(px+14,tile.y-height*.35,px+7,tile.y);c.fill();
      }
    }
  }
  if(e.power===6){
    const flight=teleportMotion({source:e.source||[0,0],x:e.destination?.[0]||0,y:e.destination?.[1]||0},p);
    const x=a.x+flight.dx,y=a.y+flight.dy-155;
    const beam=c.createLinearGradient(x,y,x,y+156);
    beam.addColorStop(0,'#8eedfff0');beam.addColorStop(1,'#31adff0a');
    board.poly(c,[[x-24,y],[x-88,y+155],[x+88,y+155],[x+24,y]],beam);
    ellipse(c,x,y+153,88,23,'#71dfff26',cyan);
    const hull=c.createLinearGradient(x,y-20,x,y+18);
    hull.addColorStop(0,'#e5f4ff');hull.addColorStop(.52,'#778baf');hull.addColorStop(1,'#253247');
    ellipse(c,x,y,65,18,hull,cyan);ellipse(c,x,y-12,22,17,'#356a9e','#e0fbff');
    for(let i=-3;i<=3;i++)ellipse(c,x+i*12,y+8,3,3,i%2?'#fff':cyan,null);
  }
  if([10,14].includes(e.power)){
    for(const [k,u] of Object.entries(board.state.board))if(u.owner===e.player&&u.hp){
      const tile=project(...k.split(',').map(Number));
      const ink=e.power===10?'#8effbf':cyan;
      for(let i=0;i<4;i++)ellipse(c,tile.x+(i-1.5)*9,tile.y-((p*110+i*21)%105),2,6,ink,null);
      ellipse(c,tile.x,tile.y-42,29,42,ink+'19',ink);
      glyph(c,e.power===10?'♥ 20':'⬡',tile.x,tile.y-91,ink,22);
    }
  }
  if(e.power===12){impact(c,a.x,a.y-60,q*.75,cyan,'arcane');glyph(c,'− ⛨',a.x,a.y-86,cyan);}
  if(e.power===9){impact(c,a.x,a.y-65,q*.75,gold,'arcane');glyph(c,'×2',a.x,a.y-109,gold,55);}
  if(e.power===8)glyph(c,'⊘',b.x,b.y-89,'#ff735d',43);
  if(e.power===11)glyph(c,'$ ϟ ✕',a.x,a.y-80,violet,32);
  if(e.power===1)glyph(c,'+ $',a.x,a.y-78,gold);
  if(e.power===15)glyph(c,'▦',a.x,a.y-82,color);
  c.restore();
}
