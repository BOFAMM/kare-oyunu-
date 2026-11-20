import {drawCharacter,preloadCharacter} from './sprites.js';
import {THEMES,generalById,teamColor} from './cosmetics.js';
import {battleImage,FX_DURATION,impact,missileEffect,powerEffect,teleportMotion} from './battle-fx.js';
import {SIZE,COLORS,project,unproject,xy,key,units,adjacent,inside,dismissalPlan} from './rules.js';
const guardSkins=new Map();
function guardImage(base,color){
 if(!base?.naturalWidth)return null;
 if(guardSkins.has(color))return guardSkins.get(color);
 // Tint only the cyan cloth and enamel. Steel, gold and outlines keep their shading.
 const tile=document.createElement('canvas');tile.width=base.naturalWidth;tile.height=base.naturalHeight;
 const ctx=tile.getContext('2d');ctx.drawImage(base,0,0);
 const pixels=ctx.getImageData(0,0,tile.width,tile.height),data=pixels.data;
 const channels=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16));
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],light=Math.max(b,g);
  if(g-r<22||b-r<20||Math.abs(g-b)>light*.4)continue;
  for(let k=0;k<3;k++)data[i+k]=Math.round(r+(light-r)*channels[k]/255);
 }
 ctx.putImageData(pixels,0,0);guardSkins.set(color,tile);return tile;
}
export class Board{
 constructor(canvas,onCell){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onCell=onCell;this.zoom=.53;this.pan={x:0,y:0};this.hover=null;this.pointers=new Map();this.effects=[];this.characterActions=new Map();this.birth=new Map();this.oldBoard={};this.keyboard={x:24,y:24};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.ocean=new Image();this.ocean.src='/assets/arena/ocean.webp';this.lava=new Image();this.lava.src='/assets/lava.png';this.meadow=new Image();this.meadow.onload=()=>{if(this.terrain)this.makeTerrain();};this.meadow.src='/assets/arena/meadow.webp';this.guard=new Image();this.guard.src='/assets/arena/guard.webp';window.addEventListener('kare-landscape',()=>{if(this.terrain)this.makeTerrain();});this.bind();this.resize();this.fit(true);this.drawing=false;}
 resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;}
 point(x,y){const p=project(x,y);return {x:this.w/2+this.pan.x+p.x*this.zoom,y:this.h/2+this.pan.y+(p.y-784)*this.zoom};}
 tile(sx,sy){return unproject((sx-this.w/2-this.pan.x)/this.zoom,(sy-this.h/2-this.pan.y)/this.zoom+784);}
 center(x,y,z=this.zoom){this.zoom=z;const p=project(x,y);this.pan={x:innerWidth>760?-25:0,y:innerWidth>760?10:-25};this.pan.x-=p.x*z;this.pan.y-=(p.y-784)*z;}
 fit(welcome=false){this.zoom=Math.min(this.w/(welcome?3000:2700),(this.h-130)/1850);this.pan={x:welcome&&this.w>760?210:0,y:40};}
 focus(id){const own=this.state?units(this.state,id):[];if(own.length){const k=own.find(([,u])=>u.hp)?.[0]||own[0][0];this.center(...xy(k),this.w<760?.85:1.25);}}
 zoomBy(f,sx=this.w/2,sy=this.h/2){const before={x:(sx-this.w/2-this.pan.x)/this.zoom,y:(sy-this.h/2-this.pan.y)/this.zoom};const z=Math.max(.2,Math.min(2.4,this.zoom*f));this.pan.x=sx-this.w/2-before.x*z;this.pan.y=sy-this.h/2-before.y*z;this.zoom=z;}
 setState(s,id){
  for(const p of s.players)preloadCharacter(p.generalSkin);
  if(!this.terrain||s.theme!==this.themeId){this.themeId=s.theme;this.theme=THEMES.find(t=>t.id===s.theme);this.makeTerrain();}
  const now=performance.now(), previous=this.state;
  const events=s.events.filter(e=>e.id>(this.lastSeq||0));
  this.state=s;this.id=id;
  if(!this.drawing&&!['lobby','draft'].includes(s.stage)){this.drawing=true;requestAnimationFrame(t=>this.draw(t));}
  for(const [k,u] of Object.entries(s.board)){
   if(!this.oldBoard[k]||this.oldBoard[k].owner!==u.owner)this.birth.set(k,now);
  }
  if(previous?.code===s.code&&s.stage!=='lobby'){
   const dismissed=new Map(events.filter(e=>e.type==='dismiss').map(e=>[key(e.x,e.y),e]));
   const poison=new Set(events.filter(e=>e.type==='power'&&e.power===4).flatMap(e=>e.removed||[]).map(cell=>key(...cell)));
   const shifted=new Set(events.filter(e=>e.type==='power'&&[2,6,15].includes(e.power)).flatMap(e=>[e.player,e.target]));
   for(const [k,u] of Object.entries(this.oldBoard)){
    const next=s.board[k], removed=!next||next.owner!==u.owner;
    if(!removed&&next.hp>=u.hp)continue;
    const [x,y]=xy(k), actor=previous.players.find(p=>p.id===u.owner), withdrawal=dismissed.get(k);
    const shell=events.find(e=>e.type==='missile'&&Math.abs(e.x-x)<=1&&Math.abs(e.y-y)<=1);
    const attack=events.find(e=>e.type==='hit'&&e.x===x&&e.y===y);
    const retreat=!!withdrawal || (removed&&!attack&&!shell&&!poison.has(k)&&actor?.lossRemaining>0);
    if(!retreat&&removed&&(shifted.has(u.owner)||poison.has(k)))continue;
    this.effects.push({type:retreat?'retreat':removed?'fall':'damage',x,y,hp:withdrawal?.hp??u.hp,
      skin:withdrawal?.skin??actor?.generalSkin,color:withdrawal?.color||teamColor(actor),
      variant:shell?'fire':generalById(s.players.find(p=>p.id===attack?.player)?.generalSkin)?.id.startsWith('fairy')?'arcane':'slash',
      start:now+(shell&&!this.reduced?FX_DURATION*.52:0)});
    if(removed&&!next)this.birth.delete(k);
   }
  }
  this.lastSeq=s.seq;this.oldBoard=structuredClone(s.board);
 }
 effect(e){
  if(e.player&&(['place','hit','teleport','promote'].includes(e.type)||e.type==='power'&&[7,13].includes(e.power))){
   this.characterActions??=new Map();
   this.characterActions.set(e.player,{action:['teleport','promote'].includes(e.type)?'walk':'attack',start:performance.now()});
  }
  if(['missile','teleport','hit','heal','place','promote','dismiss','turn','power'].includes(e.type)){
   const effect={...e,start:performance.now()};
   if(e.type==='place'||e.type==='dismiss'){
    const previous=this.effects.findLast(item=>item.type===e.type&&item.player===e.player&&!item.hideText&&effect.start-item.start<650);
    effect.count=(previous?.count||0)+(e.count||1);
    if(previous)previous.hideText=true;
   }
   this.effects.push(effect);
  }
 }
 diamond(c,x,y,fill,stroke){c.beginPath();c.moveTo(x,y-16);c.lineTo(x+24,y);c.lineTo(x,y+16);c.lineTo(x-24,y);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 poly(c,points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
 tree(c,x,y,size=1){c.save();c.translate(x,y);c.scale(size,size);c.fillStyle='#355d4b30';c.beginPath();c.ellipse(4,5,18,8,0,0,Math.PI*2);c.fill();c.fillStyle='#7d6742';c.fillRect(-3,-23,6,28);this.poly(c,[[-19,-14],[0,-47],[20,-14]],'#46774b');this.poly(c,[[-15,-28],[0,-55],[16,-28]],'#629157');this.poly(c,[[-11,-40],[0,-62],[12,-40]],'#81a861');this.poly(c,[[0,-55],[16,-28],[0,-25]],'#4c7c4b');c.restore();}
 makeTerrain(){this.terrain=document.createElement('canvas');this.terrain.width=2660;this.terrain.height=1850;const c=this.terrain.getContext('2d');c.translate(1330,100);
  this.poly(c,[[0,-40],[1235,784],[0,1640],[-1235,784]],'#d7c48b');this.poly(c,[[-1200,784],[0,1584],[0,1621],[-1200,820]],'#9c895c');this.poly(c,[[0,1584],[1200,784],[1200,820],[0,1621]],'#b29c6b');
  for(let sum=0;sum<99;sum++)for(let x=0;x<50;x++){const y=sum-x;if(y<0||y>=50)continue;const p=project(x,y);this.diamond(c,p.x,p.y,(x+y)%2?(this.theme?.tile||'#8aa56c'):(this.theme?.tile2||'#a3b881'),'#739c5e36');if((x*17+y*31)%71===0){c.fillStyle='#e6e9b184';c.fillRect(p.x-3,p.y-2,2,3);c.fillRect(p.x+4,p.y,2,2);}}
  const ground=globalThis.kareEnvironment?.ground();
  if(ground||(!this.theme&&this.meadow?.naturalWidth)){
   c.save();c.transform(24,16,-24,16,0,-16);
   if(ground){
    for(let x=0;x<50;x+=10)for(let y=0;y<50;y+=10)c.drawImage(ground.image,ground.x,ground.y,256,256,x,y,10,10);
   }else{c.globalAlpha=.78;c.drawImage(this.meadow,0,0,50,50);}
   for(let x=0;x<50;x++)for(let y=0;y<50;y++){
    c.fillStyle=(x+y)%2?'#f3e4a825':'#25472b24';c.fillRect(x,y,1,1);
   }
   c.strokeStyle='#223c2c78';c.lineWidth=.026;c.beginPath();
   for(let n=0;n<=50;n++){c.moveTo(n,0);c.lineTo(n,50);c.moveTo(0,n);c.lineTo(50,n);}
   c.stroke();c.restore();
  }
  if(!ground)for(let i=1;i<49;i+=2){for(const [x,y]of [[0,i],[i,49]]){const p=project(x,y);if(i%7!==0)this.tree(c,p.x,p.y,.85+(i%3)*.12);}}
  for(let i=5;i<47;i+=7){const p=project(49,i);this.poly(c,[[p.x-15,p.y+12],[p.x-4,p.y-8],[p.x+12,p.y-4],[p.x+18,p.y+9],[p.x+2,p.y+17]],'#a3aa90');this.poly(c,[[p.x-4,p.y-8],[p.x+2,p.y+17],[p.x+18,p.y+9],[p.x+12,p.y-4]],'#7c8c7a');}
  // Engrave the five-square divisions into the cached terrain, under all units.
  c.lineWidth=1.4;c.strokeStyle='#4c68454a';
  for(let n=4.5;n<49;n+=5){
   for(const [a,b] of [[project(n,-.5),project(n,49.5)],[project(-.5,n),project(49.5,n)]]){
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
   }
  }
  for(let n=0;n<50;n+=7){
   for(const [tx,ty] of [[n,-.9],[49.9,n]]){
    const q=project(tx,ty),cloth=n%2?'#9a4642':'#296b63';
    c.save();c.translate(q.x,q.y);this.diamond(c,0,0,'#ab9261','#86714e');
    this.poly(c,[[-5,0],[-5,-15],[0,-19],[5,-15],[5,0],[0,4]],'#c7ba89');
    c.fillStyle='#68533c';c.fillRect(-1.5,-48,3,37);
    this.poly(c,[[1,-46],[21,-43],[15,-38],[21,-33],[1,-35]],cloth);
    this.poly(c,[[0,-52],[3,-48],[0,-45],[-3,-48]],'#ffda7e');c.restore();
   }
  }
  // Decorative dock is outside the playable grid.
  c.save();const dock=project(13,-1);c.translate(dock.x,dock.y);c.rotate(-.59);c.fillStyle='#8e714b';c.fillRect(-20,-100,40,105);for(let i=0;i<8;i++){c.fillStyle=i%2?'#bc9864':'#c8a570';c.fillRect(-21,-99+i*13,42,11);}c.fillStyle='#765d41';c.fillRect(-24,-96,5,102);c.fillRect(20,-96,5,102);c.restore();
 }
 soldier(c,x,y,color,hp,t,{skin,action='idle',age=t,scale=1,alpha=1,showRank=true}={}){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(scale,scale);
  c.fillStyle='#10182455';c.beginPath();c.ellipse(0,3,hp?18:10,hp?7:4,0,0,Math.PI*2);c.fill();
  if(hp){
   if(showRank)this.diamond(c,0,0,color+'37',color);
   if(!drawCharacter(c,skin,action,age,0,0,{loop:action==='idle',reduced:this.reduced&&action!=='die'})){
    c.fillStyle='#546073';c.fillRect(-14,-47,28,44);c.fillStyle=color;c.fillRect(-11,-58,22,14);
   }
   if(showRank){
    const weapon=battleImage(generalById(skin)?.weapon||'bow');
    if(weapon&&action==='attack'){c.save();c.translate(18,-31);c.rotate(this.reduced?0:Math.sin(age/900*Math.PI)*1.15-.55);c.drawImage(weapon,-8,-26,38,42);c.restore();}
    c.font='900 11px system-ui';c.textAlign='center';c.strokeStyle='#142132';c.lineWidth=4;c.strokeText('♥ '+hp,0,-81);c.fillStyle='#fff8d7';c.fillText('♥ '+hp,0,-81);
   }
   c.restore();return;
  }
  const guard=guardImage(this.guard,color);
  if(guard){
   const stride=this.reduced?0:Math.sin(age/290+x*.08+y*.02)*(action==='walk'?1.7:.48);
   c.drawImage(guard,-16,-35+stride,32,37);c.restore();return;
  }
  // The same armor and equipment are used by every soldier. The helmet carries team color.
  this.poly(c,[[-7,-9],[-2,-9],[-2,3],[-7,3]],'#2a3443');
  this.poly(c,[[2,-9],[7,-9],[7,3],[2,3]],'#2a3443');
  this.poly(c,[[-10,-25],[9,-25],[8,-11],[0,-5],[-8,-11]],'#7d8e9f');
  this.poly(c,[[-10,-25],[0,-23],[0,-7],[-8,-11]],'#afbfcc');
  this.poly(c,[[-12,-24],[-8,-27],[-4,-22],[-10,-17]],'#c1ccd5');
  this.poly(c,[[12,-24],[8,-27],[4,-22],[10,-17]],'#c1ccd5');
  c.fillStyle='#202c39';c.fillRect(-7,-33,14,8);
  this.poly(c,[[-9,-33],[-7,-40],[0,-43],[7,-40],[9,-33],[4,-30],[-5,-30]],color);
  c.fillStyle='#e9f6ff';c.fillRect(-5,-32,10,1);
  const shield=battleImage('shield'),spear=battleImage('spear');
  if(shield)c.drawImage(shield,-16,-27,18,19);
  if(spear){c.save();c.translate(12,-17);c.rotate(.22);c.drawImage(spear,-9,-19,19,32);c.restore();}
  c.restore();
 }
 bind(){addEventListener('resize',()=>this.resize());const cv=this.canvas;cv.addEventListener('contextmenu',e=>e.preventDefault());cv.addEventListener('wheel',e=>{e.preventDefault();this.zoomBy(e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY);},{passive:false});
  cv.addEventListener('pointerdown',e=>{cv.focus({preventScroll:true});cv.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,touch:e.pointerType==='touch',moved:false};this.lastPaint='';if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);}if(e.button===0&&e.pointerType!=='touch')this.paint(e.clientX,e.clientY);});
  cv.addEventListener('pointermove',e=>{this.hover=this.tile(e.clientX,e.clientY);if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const [a,b]=[...this.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);this.zoomBy(d/this.pinch,(a.x+b.x)/2,(a.y+b.y)/2);this.pinch=d;this.down.moved=true;return;}const d=this.down;if(!d)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)d.moved=true;if(d.button===1||d.button===2||d.touch&&d.moved){this.pan.x+=e.clientX-d.lastX;this.pan.y+=e.clientY-d.lastY;}else if(d.button===0&&!d.touch)this.paint(e.clientX,e.clientY);d.lastX=e.clientX;d.lastY=e.clientY;});
  const up=e=>{if(this.down?.touch&&!this.down.moved&&this.pointers.size===1)this.paint(e.clientX,e.clientY);this.pointers.delete(e.pointerId);if(!this.pointers.size)this.down=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{this.pointers.delete(e.pointerId);this.down=null;});cv.addEventListener('pointerleave',()=>{if(!this.down)this.hover=null;});
  cv.addEventListener('keydown',e=>{const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(step){e.preventDefault();this.keyboard.x=Math.max(0,Math.min(49,this.keyboard.x+step[0]));this.keyboard.y=Math.max(0,Math.min(49,this.keyboard.y+step[1]));this.hover={...this.keyboard};}if(e.key==='Enter'){e.preventDefault();this.onCell(this.keyboard.x,this.keyboard.y);}if(e.key==='+'||e.key==='=')this.zoomBy(1.15);if(e.key==='-')this.zoomBy(1/1.15);const pan={w:[0,45],s:[0,-45],a:[45,0],d:[-45,0]}[e.key.toLowerCase()];if(pan){this.pan.x+=pan[0];this.pan.y+=pan[1];}});
 }
 paint(sx,sy){const t=this.tile(sx,sy),k=key(t.x,t.y);if(inside(t.x,t.y)&&this.lastPaint!==k){this.lastPaint=k;this.onCell(t.x,t.y);}}
 draw(t){if(!this.state||['lobby','draft'].includes(this.state.stage)){this.drawing=false;return;}const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=this.theme?.sky||'#426f70';c.fillRect(0,0,this.w,this.h);if(!globalThis.kareEnvironment?.draw(c,this.w,this.h,this.reduced?0:t)&&this.ocean?.naturalWidth){
  const im=this.ocean,scale=Math.max((this.w+12)/im.width,this.h/im.height);
  const sw=this.w/scale,sh=this.h/scale,ox=(im.width-sw)/2,oy=(im.height-sh)/2;
  for(let y=0;y<this.h;y+=8){
   const h=Math.min(8,this.h-y);
   const wave=this.reduced?0:(Math.sin(t/1500+y/42)*2.6+Math.sin(t/2500-y/81)*1.5)/scale;
   c.drawImage(im,ox+wave,oy+y/scale,sw,h/scale,0,y,this.w,h);
  }
 }
 c.save();c.translate(this.w/2+this.pan.x,this.h/2+this.pan.y-784*this.zoom);c.scale(this.zoom,this.zoom);c.drawImage(this.terrain,-1330,-100);
 const s=this.state,board=s?.board||{'21,20':{owner:'demo',hp:10},'22,20':{owner:'demo',hp:0},'21,21':{owner:'demo',hp:0},'22,21':{owner:'demo',hp:0},'21,22':{owner:'demo',hp:0},'22,22':{owner:'demo',hp:0},'26,26':{owner:'demo2',hp:10},'27,26':{owner:'demo2',hp:0},'26,27':{owner:'demo2',hp:0}};
 const players=s?.players||[{id:'demo',color:COLORS[0]},{id:'demo2',color:COLORS[1]}];
 const people=new Map(players.map(p=>[p.id,p]));
 const flight=this.effects.filter(e=>e.type==='teleport'&&e.formation&&e.source&&t>=e.start&&t-e.start<FX_DURATION).at(-1);
 const flying=!this.reduced&&flight?new Set(flight.formation.map(([x,y])=>key(x+flight.x-flight.source[0],y+flight.y-flight.source[1]))):new Set();
 const hidden=(k,u)=>flying.has(k)&&u.owner===flight?.player;
 for(const [k,u] of Object.entries(board)){
  if(hidden(k,u))continue;
  const p=project(...xy(k)),color=teamColor(people.get(u.owner));
  this.diamond(c,p.x,p.y,color+'88',color);
 }
 for(const [k,u] of Object.entries(board).sort((a,b)=>xy(a[0]).reduce((x,y)=>x+y)-xy(b[0]).reduce((x,y)=>x+y))){
  if(hidden(k,u))continue;
  const [x,y]=xy(k),p=project(x,y),owner=people.get(u.owner),color=teamColor(owner);
  const age=t-(this.birth.get(k)??-Infinity),pop=this.reduced?1:Math.min(1,Math.max(0,age)/260);
  const damage=u.hp&&this.effects.find(e=>e.type==='damage'&&e.x===x&&e.y===y&&t>=e.start&&t-e.start<900);
  const activity=this.characterActions?.get(u.owner);
  const action=damage?'hurt':activity&&t-activity.start<900?activity.action:'idle';
  this.soldier(c,p.x,p.y-(this.reduced?0:17*(1-pop)),color,u.hp,t,{
    skin:owner?.generalSkin,action,age:damage?t-damage.start:action==='idle'?t:t-activity.start,scale:.82+pop*.18
  });
 }
 if(flight&&flying.size){
  const progress=(t-flight.start)/FX_DURATION,motion=teleportMotion(flight,progress);
  const owner=people.get(flight.player),color=teamColor(owner);
  for(const [x,y,hp] of flight.formation){
   const tile=project(x,y),px=tile.x+motion.dx,py=tile.y+motion.dy-motion.height;
   this.diamond(c,px,py,color+'80',color);
   this.soldier(c,px,py,color,hp,t,{skin:owner?.generalSkin,action:'walk',age:t-flight.start,alpha:.84});
  }
 }
 if(this.hover&&inside(this.hover.x,this.hover.y)&&s){const {x,y}=this.hover,p=project(x,y),own=s.players.find(q=>q.id===this.id),ok=this.lossMode?dismissalPlan(s,this.id,key(x,y)).ok:(this.target==='general'?!board[key(x,y)]&&adjacent(s,this.id,x,y):this.target)||s.stage==='placement'||own&&(own.pending+own.reform)>0&&adjacent(s,this.id,x,y)&&board[key(x,y)]?.owner!==this.id;this.diamond(c,p.x,p.y,ok?'#e8f8d573':'#e17a6955',ok?'#fff7ba':'#e7826c');if(this.target==='missile'){for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(inside(x+dx,y+dy)){const q=project(x+dx,y+dy);this.diamond(c,q.x,q.y,'#df80534a','#fce4aa');}}if(s.stage==='placement')for(let dx=0;dx<2;dx++)for(let dy=0;dy<5;dy++){const q=project(x+dx,y+dy);this.diamond(c,q.x,q.y,'#fff7ba66','#fff7ba');}if(ok&&!this.target&&!this.lossMode&&s.stage==='playing'){c.globalAlpha=.6;this.soldier(c,p.x,p.y,teamColor(own),0,t,{scale:.9});c.globalAlpha=1;}}
 this.effects=this.effects.filter(e=>t-e.start<FX_DURATION);
 for(const e of this.effects){
  if(t<e.start){
   if(e.type==='fall'&&e.variant==='fire'){
    const p=project(e.x,e.y);
    this.diamond(c,p.x,p.y,e.color+'88',e.color);
    this.soldier(c,p.x,p.y,e.color,e.hp,t,{skin:e.skin});
   }
   continue;
  }
  const age=(t-e.start)/FX_DURATION;
  if(e.type==='power'){powerEffect(c,this,e,age,t);continue;}
  if(e.type==='missile'){missileEffect(c,this,e,this.reduced?.8:age);continue;}
  if(e.type==='teleport')continue;
  if(e.type==='turn'){
   c.globalAlpha=(1-age)*.34;
   const color=teamColor(people.get(e.player));
   for(const [k,u] of Object.entries(board))if(u.owner===e.player){const q=project(...xy(k));this.diamond(c,q.x,q.y,color,color);}
   c.globalAlpha=1;continue;
  }
  const p=project(e.x,e.y),color=e.color||teamColor(people.get(e.player));
  c.save();
  if(e.type==='retreat'){
   const move=this.reduced?0:age;
   this.diamond(c,p.x,p.y,color+'45',color);
   this.soldier(c,p.x-12*move,p.y-14*move,color,e.hp,t,{skin:e.skin,action:'walk',age:t-e.start,scale:1-age*.22,alpha:(1-age)*.72,showRank:false});
  }else if(e.type==='promote'){
   const from=project(e.fromX??e.x,e.fromY??e.y),q=this.reduced?1:Math.min(1,age*3);
   const x=from.x+(p.x-from.x)*q,y=from.y+(p.y-from.y)*q-Math.sin(q*Math.PI)*28;
   c.globalAlpha=1-age;c.font='900 26px system-ui';c.textAlign='center';c.fillStyle=color;c.fillText('♛',x,y-45);
   this.diamond(c,p.x,p.y,color+'44',color);
  }else if(e.type==='fall'){
   if(e.hp)this.soldier(c,p.x,p.y,color,e.hp,t,{skin:e.skin,action:'die',age:this.reduced?810:t-e.start,alpha:Math.min(1,(1-age)*2.7),showRank:false});
   else if(age<.45)this.soldier(c,p.x+(this.reduced?0:age*21),p.y,color,0,t,{scale:1-age*.82,alpha:1-age/.45});
   impact(c,p.x,p.y-18,this.reduced?.52:age,e.variant==='fire'?'#ff9360':color,e.variant);
  }else if(['damage','hit'].includes(e.type)){
   if(e.type==='hit'||e.variant==='fire')impact(c,p.x,p.y-18,this.reduced?.5:age,e.variant==='fire'?'#ff9360':color,e.variant);
   if(e.type==='damage'){
    c.globalAlpha=1-age;c.font='900 16px system-ui';c.textAlign='center';c.fillStyle='#fff4cc';
    c.fillText('−1',p.x,p.y-48-(this.reduced?0:age*16));
   }
  }else{
   c.globalAlpha=1-age;this.diamond(c,p.x,p.y,color+'28',color);c.strokeStyle=color;
   c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,9+age*36,4+age*18,0,0,Math.PI*2);c.stroke();
  }
  if(!e.hideText&&['place','hit','heal','promote','dismiss'].includes(e.type)&&age<.65){
   const text={place:'+'+(e.count||1)+' kare',hit:e.capture?'Fetih!':'−1 can',heal:'+'+(e.amount||1)+' can',promote:'General!',dismiss:'−'+(e.count||1)+' asker'}[e.type];
   c.globalAlpha=Math.min(1,(.65-age)*5);c.font='bold 15px Segoe UI';c.textAlign='center';c.lineWidth=3.5;c.strokeStyle='#17272b';
   c.fillStyle=e.type==='hit'||e.type==='dismiss'?'#ffc2ae':'#fff1bf';
   const rise=this.reduced?0:age*36;c.strokeText(text,p.x,p.y-42-rise);c.fillText(text,p.x,p.y-42-rise);
  }
  c.restore();
 }

 if(s&&this.lossMode&&this.hover){const plan=dismissalPlan(s,this.id,key(this.hover.x,this.hover.y));if(plan.transfer){const from=project(this.hover.x,this.hover.y),to=project(...xy(plan.transfer));c.strokeStyle='#00e5ff';c.lineWidth=3;c.beginPath();c.moveTo(from.x,from.y-30);c.lineTo(to.x,to.y-30);c.stroke();this.diamond(c,to.x,to.y,'#00e5ff55','#ffffff');c.fillStyle='#fff';c.font='bold 20px sans-serif';c.fillText('♛',to.x-10,to.y-45);}}c.restore();if(s&&this.hover&&inside(this.hover.x,this.hover.y)){c.fillStyle='#244e4c';c.font='11px Trebuchet MS';c.textAlign='left';c.fillText(this.lossMode?(dismissalPlan(s,this.id,key(this.hover.x,this.hover.y)).reason||'Silinebilir · general varsa rütbesi işaretli kareye aktarılır'):`Kare ${this.hover.x+1}, ${this.hover.y+1}`,this.w>760?265:15,this.w>760?this.h-22:174);}requestAnimationFrame(t=>this.draw(t));}
}
