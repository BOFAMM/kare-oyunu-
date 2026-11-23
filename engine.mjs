import {SIEGE,SIEGE_POWERS} from './public/siege-rules.js';
import {GENERALS,generalById,teamColor} from './public/cosmetics.js';
import {ODDS,SIZE,ROLL_REVEAL_MS,POWERS,COLORS,key,xy,inside,neighbors,units,adjacent,face,shuffled,connected,dismissalPlan,multiplierLabel} from './public/rules.js';
const need=(b,m)=>{if(!b)throw Error(m);};
const integer=(v,min=0,max=1000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function createRoom(code,id,name,now=Date.now()){return {code,host:id,stage:'lobby',players:[],board:{},order:[],cursor:0,round:1,turn:0,deadline:0,logs:[],events:[],seq:0,settings:{manual:false},created:now,updated:now};}
export function addPlayer(s,id,name,bot=false){need(s.stage==='lobby','Oyun başladı.');need(s.players.length<6,'Oda dolu; en fazla 6 kişi.');need(typeof name==='string'&&name.trim().length>=1&&name.trim().length<=20,'İsim 1–20 karakter olmalı.');need(!s.players.some(p=>p.id===id),'Oyuncu zaten odada.');s.players.push({id,name:name.trim(),bot,color:COLORS[s.players.length],money:0,pending:0,reform:0,inventory:{},offers:[],chosen:false,eliminated:false,rolled:false,skip:0,visits:0,noAttackUntil:0,generalHP:10});}
function log(s,text){s.logs.unshift(text);s.logs.length=Math.min(s.logs.length,40);}
function event(s,type,data={}){s.events.push({id:++s.seq,type,...data});s.events=s.events.slice(-20);}
export function current(s){return s.players.find(p=>p.id===s.order[s.cursor]);}
function player(s,id){const p=s.players.find(p=>p.id===id);need(p,'Oyuncu bulunamadı.');return p;}
function locked(s,p){return s.lock&&s.lock!==p.id;}
export function configureTestMatch(state, options, now, rng=Math.random){
 const s=structuredClone(state);
 if(s.mode==='siege'&&s.stage==='playing')need(options.type==='setup','Kuşatmada sıra veya zar bulunmuyor.');
 if(options.type==='advance'){
  need(['draft','placement','countdown','playing'].includes(s.stage),'Bu aşamada ilerletme yapılamaz.');
  s.deadline=now;s.revealUntil=0;
  const next=tick(s,now,rng);
  log(next,'Yönetici test için aşamayı ilerletti.');
  return next;
 }
 need(s.stage==='playing','Bu ayar yalnızca maç sırasında kullanılabilir.');
 const p=player(s,options.player);
 need(!p.eliminated,'Oyuncu elendi.');
 if(options.type==='turn'){
  const cursor=s.order.indexOf(p.id);
  need(cursor>=0,'Oyuncu hamle sıralamasında yok.');
  if(current(s).id!==p.id){
   settle(s,current(s));eliminate(s);
   if(s.stage==='playing'){s.cursor=cursor;s.revealUntil=0;beginTurn(s,now);}
  }
 }else if(options.type==='effect'){
  need(['shield','double','lucky'].includes(options.effect)&&typeof options.enabled==='boolean','Geçersiz etki ayarı.');
  p[options.effect]=options.enabled;
 }else if(options.type==='rearm'){
  need(current(s).id===p.id,'Önce sırayı seçtiğin oyuncuya ver.');
  need(!p.lossRemaining,'Önce bekleyen asker kaybını tamamla.');
  p.rolled=false;s.revealUntil=0;s.deadline=now+45000;
 }else if(options.type==='setup'){
  need(integer(options.round,1,10000),'Tur 1–10000 arasında olmalı.');
  need(integer(options.money,0,1000000)&&integer(options.pending,0,1000000),'Kaynaklar 0–1000000 arasında olmalı.');
  if(options.hp!==undefined)need(integer(options.hp,1,1000000),'General canı 1–1000000 arasında olmalı.');
  const power=options.power===undefined?null:(s.mode==='siege'?SIEGE_POWERS:POWERS).find(item=>item.id===options.power);
  need(options.power===undefined||power,'Geçersiz güç.');
  s.round=options.round;p.money=options.money;p.pending=options.pending;
  if(options.hp!==undefined)for(const [,u]of units(s,p.id))if(u.hp)u.hp=options.hp;
  if(power)grant(s,p,power.id);
 }else throw Error('Bilinmeyen yönetici işlemi.');
 log(s,'Yönetici testi · '+p.name+(options.type==='turn'?' için sıra düzenlendi.':options.type==='rearm'?' için zar tekrar açıldı.':options.type==='effect'?' için güç etkisi düzenlendi.':' için kaynaklar ve tur düzenlendi.'));
 s.updated=now;
 return s;
}
function grant(s,p,id){
 if(s.mode==='siege'){
  const pow=SIEGE_POWERS.find(x=>x.id===id);
  p.inventory[id]=pow.uses<0?-1:(p.inventory[id]||0)+pow.uses;return;
 }
 const pow=POWERS.find(x=>x.id===id);p.inventory[id]=(p.inventory[id]||0)+pow.uses;if(id===1){p.money+=30;p.inventory[id]=0;}if(id===10){p.generalHP=20;for(const [,u]of units(s,p.id))if(u.hp)u.hp=20;p.inventory[id]=0;}}
function form(s,p,x,y){for(let dy=0;dy<5;dy++)for(let dx=0;dx<2;dx++)s.board[key(x+dx,y+dy)]={owner:p.id,hp:dx===0&&dy===0?p.generalHP:0};}
function reserveSpawn(s,p,requestedX,requestedY){
 need(inside(requestedX,requestedY),'Tahtadan bir kare seç.');
 let best=null,distance=Infinity;
 for(let y=0;y<=SIZE-5;y++)for(let x=0;x<=SIZE-2;x++){
  const d=(x-requestedX)**2+(y-requestedY)**2;if(d>=distance)continue;
  let free=true;for(let j=0;j<5&&free;j++)for(let i=0;i<2;i++)if(s.board[key(x+i,y+j)]){free=false;break;}
  if(free){best={x,y};distance=d;}
 }
 need(best,'Başlangıç alanı bulunamadı.');
 form(s,p,best.x,best.y);p.spawn={...best,requestedX,requestedY,moved:distance>0};p.ready=!!p.bot;
}
function prepare(s,now,rng){for(const p of s.players){if(!generalById(p.generalSkin)){const choices=GENERALS.filter(g=>!s.players.some(q=>q.generalSkin===g.id));p.generalSkin=choices[Math.floor(rng()*choices.length)].id;}p.color=teamColor(p);}s.theme=undefined;s.order=shuffled(s.players.map(p=>p.id),rng);s.cursor=0;if(s.mode==='siege'){
 s.stage='placement';s.deadline=0;
 for(const q of s.players)if(q.bot)reserveSpawn(s,q,Math.floor(rng()*(SIZE-1)),Math.floor(rng()*(SIZE-4)));
 return;
 }if(s.settings.manual){s.stage='placement';s.deadline=now+90000;log(s,'Rastgele yerleşim sırası: '+s.order.map(id=>player(s,id).name).join(' → '));}else{const starts=shuffled([[18,17],[24,17],[30,17],[18,26],[24,26],[30,26]],rng);s.players.forEach((p,i)=>form(s,p,...starts[i]));countdown(s,now);}}
function countdown(s,now){s.stage='countdown';s.deadline=now+(s.mode==='siege'?SIEGE.countdownMs:2200);event(s,'spawn');}
function beginTurn(s,now){const p=current(s);p.visits++;p.shield=false;p.double=false;p.lucky=false;p.rolled=false;if(s.lock===p.id)s.lock=null;s.deadline=now+45000;s.turn++;event(s,'turn',{player:p.id});}
function restoreReform(s,p){if(p.reform){for(const k of p.reformOriginal||[]){if(p.reform===0)break;if(!s.board[k]){s.board[k]={owner:p.id,hp:0};p.reform--;}}p.reform=0;p.reformOriginal=[];}}
function settle(s,p){finishLoss(s,p);restoreReform(s,p);if(!locked(s,p)){p.money+=p.pending;p.pending=0;}}
export function endTurn(s,now){const old=current(s);settle(s,old);eliminate(s);if(s.stage==='ended')return;let count=0;do{s.cursor++;if(s.cursor===s.order.length){s.cursor=0;s.round++;}const p=current(s);if(!p.eliminated){beginTurn(s,now);if(p.skip){p.skip--;log(s,p.name+' bu hamleyi pas geçti.');}else return;}}while(++count<s.order.length*4);}
function eliminate(s){for(const p of s.players){if(!p.eliminated&&units(s,p.id).length===0&&!p.reform){p.eliminated=true;for(const [k]of units(s,p.id))delete s.board[k];p.pending=0;p.reform=0;log(s,p.name+' ELENDİ.');event(s,'eliminate',{player:p.id});}}const alive=s.players.filter(p=>!p.eliminated);if(alive.length<=1){s.stage='ended';s.winner=alive[0]?.id||null;event(s,'win',{player:s.winner});}}
function components(s,id,exclude){const remaining=new Set(units(s,id).map(([k])=>k).filter(k=>k!==exclude));let count=0;while(remaining.size){const todo=[remaining.values().next().value];remaining.delete(todo[0]);count++;for(let i=0;i<todo.length;i++)for(const [x,y]of neighbors(...xy(todo[i]))){const k=key(x,y);if(remaining.delete(k))todo.push(k);}}return count;}
function canRemove(s,id,k){return components(s,id,k)<=components(s,id);}
function dismiss(s,p,k){
 need(p.lossRemaining>0,'Silinecek asker borcun yok.');const plan=dismissalPlan(s,p.id,k);need(plan.ok,plan.reason);const hp=s.board[k].hp;
 if(plan.transfer){(p.stats??={bestGain:0,captures:0,damage:0,rescues:0}).rescues++;s.board[plan.transfer].hp=s.board[k].hp;const [x,y]=xy(plan.transfer);event(s,'promote',{x,y,fromX:xy(k)[0],fromY:xy(k)[1],player:p.id,skin:p.generalSkin,color:teamColor(p)});}
 delete s.board[k];p.lossRemaining--;const [x,y]=xy(k);event(s,'dismiss',{x,y,player:p.id,hp,skin:p.generalSkin,color:teamColor(p)});
 if(!p.lossRemaining)log(s,p.name+' asker kaybını tamamladı; general rütbeleri korundu.');
}
function finishLoss(s,p){while(p.lossRemaining>0){const candidate=units(s,p.id).find(([k])=>dismissalPlan(s,p.id,k).ok);need(candidate,'Asker kaybı tamamlanamadı; geçerli silme karesi bulunamadı.');dismiss(s,p,candidate[0]);}}
// Remove only non-articulation cells; protected generals may require retaining their connecting soldiers.
function remove(s,id,n,rng,candidates=units(s,id).filter(([,u])=>!u.hp).map(([k])=>k),allowGeneral=false){let removed=0;const pool=shuffled(candidates,rng);while(removed<n){const index=pool.findIndex(k=>s.board[k]?.owner===id&&(allowGeneral||!s.board[k].hp)&&canRemove(s,id,k));if(index<0)break;delete s.board[pool.splice(index,1)[0]];removed++;}return removed;}
function hostile(s,p,target){if(s.mode==='siege'){need(units(s,p.id).some(([,u])=>u.hp),'Saldırı için general çağır.');need(s.siege.war,'İki dakikalık gelişim aşaması henüz bitmedi.');}else need(s.round>5,'İlk 5 tur barış var. Savaş 6. turda açılır.');need(!target.shield,'Rakip dokunulmazlıkla korunuyor.');}
function autoPlace(s,p){
 const limit=Math.min(100,p.pending+p.reform);
 need(limit>0,'Yerleştirecek askerin yok.');
 const own=units(s,p.id);
 const frontier=own.some(([,u])=>u.hp)?connected(s,p.id):new Set(own.map(([k])=>k));
 if(s.mode==='siege')return autoPlaceSiege(s,p,frontier,limit);
 let count=0,last;
 outer:for(const from of frontier)for(const [x,y] of neighbors(...xy(from))){
  if(s.board[key(x,y)]||(s.mode==='siege'&&!safeSiegeCell(s,x,y)))continue;
  place(s,p,x,y,false);frontier.add(key(x,y));last={x,y};
  if(++count===limit)break outer;
 }
 need(count>0,'Ordunun kenarında yerleşecek boş kare yok.');
 event(s,'place',{...last,player:p.id,count});
}
// Two sweeps give the Manhattan distance to the closest enemy for every square.
function siegeEnemyDistances(board,owner){
 const distance=new Uint8Array(SIZE*SIZE).fill(SIZE*2);
 for(const [k,u] of Object.entries(board))if(u.owner!==owner){
  const [x,y]=xy(k);distance[y*SIZE+x]=0;
 }
 for(let i=0;i<distance.length;i++){
  if(i%SIZE)distance[i]=Math.min(distance[i],distance[i-1]+1);
  if(i>=SIZE)distance[i]=Math.min(distance[i],distance[i-SIZE]+1);
 }
 for(let i=distance.length-1;i>=0;i--){
  if(i%SIZE<SIZE-1)distance[i]=Math.min(distance[i],distance[i+1]+1);
  if(i+SIZE<distance.length)distance[i]=Math.min(distance[i],distance[i+SIZE]+1);
 }
 return distance;
}
function siegeExposure(bounds,x,y){
 return Math.max(0,bounds.left-x,x-bounds.right)+Math.max(0,bounds.top-y,y-bounds.bottom);
}
function autoPlaceSiege(s,p,sources,limit){
 const distance=siegeEnemyDistances(s.board,p.id), candidates=new Map(),visited=new Set();
 const b=s.siege.bounds;
 function extend(first){
  const queue=[first];visited.add(first);
  for(let i=0;i<queue.length;i++)for(const [x,y] of neighbors(...xy(queue[i]))){
   const k=key(x,y),unit=s.board[k];
   if(!unit){
    const score=siegeExposure(b,x,y)*SIZE*2+distance[y*SIZE+x];
    candidates.set(k,score);
   }else if(unit.owner===p.id&&!visited.has(k)){
    visited.add(k);queue.push(k);
   }
  }
 }
 for(const k of sources)if(!visited.has(k))extend(k);
 let count=0,last;
 while(count<limit&&candidates.size){
  let choice,best=Infinity;
  for(const [k,score] of candidates)if(score<best){choice=k;best=score;}
  candidates.delete(choice);
  // Each candidate was reached by a four-way edge from the deployable army.
  s.board[choice]={owner:p.id,hp:0};
  if(p.reform)p.reform--;else p.pending--;
  last=xy(choice);count++;extend(choice);
 }
 need(count>0,'Ordunun kenarında yerleşecek boş kare yok.');
 event(s,'place',{x:last[0],y:last[1],player:p.id,count});
}
function exposedFlank(s,owner,front){
 if(s.mode!=='siege'||!s.siege?.war||!s.siege.inset)return null;
 const cells=[front],seen=new Set(cells),red=[],inside=[];
 for(let i=0;i<cells.length;i++){
  const k=cells[i],coords=xy(k);
  (safeSiegeCell(s,...coords)?inside:red).push(k);
  for(const [x,y] of neighbors(...coords)){
   const n=key(x,y);if(!seen.has(n)&&s.board[n]?.owner===owner){seen.add(n);cells.push(n);}
  }
 }
 if(!red.length)return null;
 return [...red,...inside].find(k=>s.board[k].hp>1||canRemove(s,owner,k));
}
function place(s,p,x,y,notify=true){need(inside(x,y),'Ada dışında bir kare seçtin.');need(p.pending+p.reform>0,'Yerleştirecek askerin yok.');need(adjacent(s,p.id,x,y),'Generaline bağlı bölgenin kenarına yerleştir. Köşegen sayılmaz.');const k=key(x,y),u=s.board[k];need(u?.owner!==p.id,'Bu kare zaten senin.');if(u){hostile(s,p,player(s,u.owner));need(p.pending>0,'Yeniden dizilim askerleri saldırıda harcanamaz; yeni asker hakkı gerekir.');if(u.hp>1){u.hp--;p.pending--;event(s,'hit',{x,y,player:p.id});return;}if(s.mode==='siege'&&!canRemove(s,u.owner,k)){
 const flank=exposedFlank(s,u.owner,k);need(flank,'Bu kare rakibin topraklarını bağlı tutuyor.');
 const victim=s.board[flank];if(victim.hp>1)victim.hp--;else delete s.board[flank];
 const [fx,fy]=xy(flank);p.pending--;event(s,'hit',{x:fx,y:fy,player:p.id,flank:true});log(s,'Kuşatma darbesi · Savunma hattı uçtan yıpratıldı.');eliminate(s);return;
 }need(canRemove(s,u.owner,k),'Bu kare rakibin topraklarını bağlı tutuyor. Önce dış kenarlara saldır.');}s.board[k]={owner:p.id,hp:0};if(!u&&p.reform)p.reform--;else p.pending--;if(notify)event(s,u?'hit':'place',{x,y,player:p.id,capture:Boolean(u)});if(u)eliminate(s);}
function use(s,p,a,rng,now){const before=structuredClone(s.board), army=units(s,p.id), sourceKey=(army.find(([,u])=>u.hp)||army[0])?.[0];const balance=p.money;const siege=s.mode==='siege';const pow=(siege?SIEGE_POWERS:POWERS).find(x=>x.id===a.power);need(pow,'Bilinmeyen güç.');need(siege||s.round>=3,'Güçler 3. turda açılır.');need(!locked(s,p),'Kasa kilidi sırasında güç kullanamazsın.');need(p.inventory[pow.id]!==0&&p.inventory[pow.id]!==undefined,'Bu güçten kullanım hakkın yok.');let t;if(pow.target==='player'){t=player(s,a.target);need(t!==p&&!t.eliminated,'Hayattaki bir rakibi seç.');}if(pow.hostile){hostile(s,p,t||{shield:false});}if(pow.target==='cell')need(inside(a.x,a.y),'Haritadan geçerli hedef seç.');
 if([2,6].includes(pow.id)){restoreReform(s,p);if(t)restoreReform(s,t);}
 switch(pow.id){
 case 1:if(siege)p.pending+=4;else p.money+=30;break;
 case 2:for(const u of Object.values(s.board)){if(u.owner===p.id)u.owner=t.id;else if(u.owner===t.id)u.owner=p.id;}break;
 case 3:[p.money,t.money]=[t.money,p.money];break;
 case 4:if(siege&&t.mask){t.mask=false;event(s,'mask',{player:t.id});break;}remove(s,t.id,Math.floor(units(s,t.id).filter(([,u])=>!u.hp).length/2),rng);break;
 case 5:{const targets=new Map();for(const [k,u]of Object.entries(s.board)){const [x,y]=xy(k);if(Math.abs(x-a.x)<=1&&Math.abs(y-a.y)<=1&&!player(s,u.owner).shield&&!(u.owner===p.id&&u.hp)){if(u.hp>1)u.hp-=1;else{if(u.hp)u.hp=1;if(!targets.has(u.owner))targets.set(u.owner,[]);targets.get(u.owner).push(k);}}}for(const [owner,keys]of targets){remove(s,owner,keys.length,rng,keys,true);}event(s,'missile',{x:a.x,y:a.y,player:p.id});eliminate(s);break;}
 case 6:{const own=units(s,p.id),anchor=xy((own.find(([,u])=>u.hp)||own[0])[0]),dx=a.x-anchor[0],dy=a.y-anchor[1];const moved=own.map(([k,u])=>{const [x,y]=xy(k);need(inside(x+dx,y+dy),'Dizilimin bir kısmı ada dışına taşıyor.');if(siege)need(safeSiegeCell(s,x+dx,y+dy),'Işınlanma hedefi güvenli bölgenin dışında.');const dest=key(x+dx,y+dy);need(!s.board[dest]||s.board[dest].owner===p.id,'Hedefte rakip var; ışınlanma iptal.');return [dest,u];});for(const [k]of own)delete s.board[k];for(const [k,u]of moved)s.board[k]=u;event(s,'teleport',{x:a.x,y:a.y,player:p.id,source:anchor,formation:own.map(([k,u])=>[...xy(k),u.hp])});break;}
 case 7:{const amount=Math.floor(t.money/4);t.money-=amount;p.money+=amount;p.pending+=remove(s,t.id,Math.floor(units(s,t.id).length/4),rng);break;}
 case 8:if(siege){need(!t.skipTroop,'İkmal zaten kesildi.');t.skipTroop=1;}else t.skip++;break;
 case 9:if(siege){need(!p.bonusTroops,'Çifte sevkiyat zaten etkin.');p.bonusTroops=4;break;}need(!p.rolled&&!p.double,'Zardan önce bir kez etkinleştir.');p.double=true;break;
 case 10:if(siege){const generals=army.filter(([,u])=>u.hp);need(generals.length,'Generalin yok.');for(const [,u] of generals)u.hp+=10;break;}p.generalHP=20;for(const [,u]of units(s,p.id))if(u.hp)u.hp=20;break;
 case 11:if(siege){need(!t.skipIncome,'Gelir zaten ablukada.');t.skipIncome=1;break;}need(!s.lock,'Kasa kilidi zaten etkin.');s.lock=p.id;break;
 case 12:if(siege){need(!p.mask,'Zehir maskesi zaten hazır.');p.mask=true;break;}need(!p.rolled&&!p.lucky,'Zardan önce bir kez etkinleştir.');p.lucky=true;break;
 case 13:p.pending+=remove(s,t.id,Math.floor(units(s,t.id).length/2),rng);break;
 case 14:need(!p.shield,'Kalkanın zaten açık.');p.shield=true;if(siege)p.shieldUntil=now+8000;break;
 case 15:{need(!p.reform,'Önce mevcut yeniden dizilimi tamamla.');const original=units(s,p.id).filter(([,u])=>!u.hp).map(([k])=>k);p.reform=remove(s,p.id,Math.min(original.length,Math.max(0,units(s,p.id).length-1)),rng);p.reformOriginal=original.filter(k=>!s.board[k]);p.noAttackUntil=0;break;}
 }
 if(p.inventory[pow.id]>0)p.inventory[pow.id]--;log(s,p.name+': '+pow.name);event(s,'power',{power:pow.id,player:p.id,target:t?.id,source:sourceKey?xy(sourceKey):null,destination:pow.target==='cell'?[a.x,a.y]:t?xy((Object.entries(before).find(([,u])=>u.owner===t.id&&u.hp)||Object.entries(before).find(([,u])=>u.owner===t.id))?.[0]||sourceKey):null,removed:pow.id===4?Object.entries(before).filter(([k,u])=>!s.board[k]&&u.owner===t.id).map(([k])=>xy(k)):undefined,money:pow.id===7?p.money-balance:undefined});
}
// Commands commit a clone: a rejected action cannot partially spend resources or damage the board.
export function act(state,id,a,{now=Date.now(),rng=Math.random,forcedRoll}={}){const siege=state.mode==='siege';if(siege&&state.stage==='playing')state=siegeTick(state,now,rng);const s=structuredClone(state);const p=player(s,id);need(a&&typeof a.type==='string','Geçersiz hamle.');
 if(a.type==='rematch'){need(s.stage==='ended'&&s.host===id,'Rövanşı maç sonunda oda kurucusu başlatır.');const fresh=createRoom(s.code,s.host,p.name,now);if(siege)fresh.mode='siege';fresh.settings={...s.settings};fresh.seq=s.seq;fresh.updated=now;for(const q of s.players)addPlayer(fresh,q.id,q.name,q.bot);return fresh;}
 else if(a.type==='settings'){need(s.host===id&&s.stage==='lobby','Ayarları lobide yalnızca kurucu değiştirir.');s.settings.manual=!siege&&a.manual===true;}
 else if(a.type==='start'){need(s.host===id&&s.stage==='lobby','Oyunu lobide kurucu başlatır.');need(s.players.length>=2,'En az iki oyuncu veya bir bot gerekir.');s.stage='draft';s.deadline=now+90000;for(const q of s.players){q.offers=shuffled((siege?SIEGE_POWERS:POWERS).map(x=>x.id),rng).slice(0,3);if(q.bot){q.offers.slice(0,2).forEach(x=>grant(s,q,x));q.chosen=true;}}log(s,'Her komutan 3 karttan 2 güç seçiyor.');}
 else if(a.type==='cosmetic'){need(s.stage==='draft'&&!p.chosen,'Seçim aşaması kapandı.');need(a.theme===undefined,'Tema seçimi kaldırıldı.');if(a.skin!==undefined){need(generalById(a.skin),'Geçersiz general.');need(!s.players.some(q=>q.id!==id&&q.generalSkin===a.skin),'Bu general başka bir oyuncuda.');p.generalSkin=a.skin;p.color=teamColor(p);}}
 else if(a.type==='choose'){need(s.stage==='draft'&&!p.chosen,'Kart seçimi açık değil.');need(Array.isArray(a.powers)&&a.powers.length===2&&new Set(a.powers).size===2&&a.powers.every(x=>p.offers.includes(x)),'Sunulan üç karttan iki farklı güç seç.');a.powers.forEach(x=>grant(s,p,x));p.chosen=true;if(s.players.every(q=>q.chosen))prepare(s,now,rng);}
 else if(siege&&a.type==='setup'){need(s.stage==='placement'&&!p.spawn,'Başlangıç alanın zaten seçildi.');reserveSpawn(s,p,a.x,a.y);}
 else if(siege&&a.type==='ready'){need(s.stage==='placement'&&p.spawn,'Önce başlangıç yerini seç.');p.ready=true;if(s.players.every(q=>q.ready))countdown(s,now);}
 else if(a.type==='setup'){need(s.stage==='placement'&&current(s).id===id,'Yerleşim sırası sende değil.');need(inside(a.x,a.y)&&inside(a.x+1,a.y+4),'2×5 dizilim ada içinde olmalı.');for(let y=0;y<5;y++)for(let x=0;x<2;x++)need(!s.board[key(a.x+x,a.y+y)],'Dizilim başka bir oyuncuyla çakışıyor.');form(s,p,a.x,a.y);s.cursor++;s.deadline=now+90000;if(s.cursor===s.order.length){s.cursor=0;countdown(s,now);}}
 else {need(s.stage==='playing'&&!p.eliminated,'Oyun hamle aşamasında değil.');if(siege){
  need(['place','auto-place','heal','general','power','buy','recruit','move-general','sell-troop'].includes(a.type),'Bu işlem Kuşatma modunda kullanılamaz.');
  need(s.siege.inset<SIZE/2,'Güvenli alan kalmadı. Son zehir darbeleri maçı belirleyecek.');
  const product=a.type==='buy'?a.power:['recruit','heal','general'].includes(a.type)?a.type:null;
  if(product!==null){
   p.cooldowns??={};need(!(p.cooldowns[product]>now),'Aynı ürünü tekrar almak için 30 saniye bekle.');
   p.cooldowns[product]=now+SIEGE.repurchaseMs;
  }
  if(a.type==='place')need(a.expectedOwner===(s.board[key(a.x,a.y)]?.owner??null),'Bu kare değişti. Askerin korunuyor; hedefi tekrar seç.');
 }else{need(current(s).id===id,'Sıra sende değil.');need(now<s.deadline,'Hamle süresi doldu.');need(now>=(s.revealUntil||0),'Zar sonucu gösteriliyor; animasyonun bitmesini bekle.');need(!p.lossRemaining||['dismiss','auto-dismiss','end'].includes(a.type),'Önce eksi çarpanın gerektirdiği askerleri sil.');}
 switch(a.type){
 case 'sell-troop':{
  const k=key(a.x,a.y),unit=s.board[k];
  need(siege&&inside(a.x,a.y)&&unit?.owner===id&&!unit.hp,'Kendi normal askerini seç.');
  need(units(s,id).length>1,'Son birliğini terhis edemezsin.');
  delete s.board[k];p.money++;event(s,'sell-troop',{x:a.x,y:a.y,player:id});break;
 }
 case 'move-general':{
  const source=key(a.x,a.y),destination=key(a.toX,a.toY),general=s.board[source];
  need(siege&&inside(a.x,a.y)&&general?.owner===id&&general.hp>0,'Kendi generalini seç.');
  need(inside(a.toX,a.toY)&&!s.board[destination],'Generalin için boş bir kare seç.');
  delete s.board[source];s.board[destination]=general;
  if(safeSiegeCell(s,a.toX,a.toY))delete general.zoneDamage;
  event(s,'move-general',{player:id,fromX:a.x,fromY:a.y,x:a.toX,y:a.toY});break;
 }
 case 'roll':{need(!p.rolled,'Bu hamlede zaten zar attın.');need(!p.reform,'Zardan önce yeniden dizilimi tamamla.');need(integer(a.money,0,p.money)&&integer(a.troops,0,units(s,id).length),'Bahis mevcut dolar ve asker miktarını aşamaz.');need(a.money+a.troops>0,'En az bir birim bahis seç.');need(!a.money||!locked(s,p),'Kasa kilitli; yalnızca asker bahsi yapabilirsin.');const test=ODDS.some(o=>o.v===forcedRoll),value=test?forcedRoll:face(rng());p.rolled=true;let gain=0,lostMoney=0,lostTroops=0;if(value>0){gain=(a.money+a.troops)*value*(p.double?2:1);p.pending+=gain;}else if(!p.lucky){lostMoney=Math.min(p.money,a.money*-value);p.money-=lostMoney;lostTroops=Math.min(a.troops*-value,units(s,id).filter(([,u])=>!u.hp).length);p.lossRemaining=lostTroops;}s.revealUntil=now+ROLL_REVEAL_MS;s.deadline+=ROLL_REVEAL_MS;s.roll={id:s.seq+1,player:id,value,gain,lostMoney,lostTroops,test};event(s,'roll',s.roll);log(s,p.name+' '+multiplierLabel(value)+' attı. '+(test?'[Yönetici testi] ':'')+(gain?gain+' asker kazandı.':lostTroops+' asker seçilecek, '+lostMoney+'$ kayıp.'));break;}
 case 'dismiss':need(inside(a.x,a.y),'Ada dışında bir kare seçtin.');dismiss(s,p,key(a.x,a.y));break;
 case 'auto-dismiss':finishLoss(s,p);break;
 case 'place':place(s,p,a.x,a.y);break;
 case 'auto-place':autoPlace(s,p);break;
 case 'convert':{need(!locked(s,p),'Kasa kilidi açıkken dolara çeviremezsin.');need([25,50,75,100].includes(a.percent),'Dönüşüm yüzdesi geçersiz.');const n=Math.floor(p.pending*a.percent/100);need(n>0,'Dönüştürülecek en az 1 asker olmalı.');p.pending-=n;p.money+=n;event(s,'convert',{player:id,amount:n});break;}
 case 'recruit':need(!locked(s,p),'Kasa kilitli.');need(integer(a.amount,1,p.money),'Yeterli dolar yok.');p.money-=a.amount;p.pending+=a.amount;event(s,'recruit',{player:id,amount:a.amount});break;
 case 'heal':{const u=s.board[key(a.x,a.y)];need(u?.owner===id&&u.hp>0,'Kendi generalini seç.');const resource=siege?'money':'pending';need(integer(a.amount,1,p[resource]),siege?'Yeterli dolar yok.':'Yeterli kazanılmış asker yok.');u.hp+=a.amount;p[resource]-=a.amount;event(s,'heal',{x:a.x,y:a.y,player:id,amount:a.amount});break;}
 case 'general':{need(siege||units(s,id).some(([,u])=>u.hp),'Generalin kalmadığı için yeni general alamazsın.');need(!locked(s,p),'Kasa kilitli.');const u=s.board[key(a.x,a.y)],cost=(units(s,id).filter(([,v])=>v.hp).length+1)*10;need(integer(a.x,0,SIZE-1)&&integer(a.y,0,SIZE-1),'Geçersiz kare.');need(!u&&adjacent(s,id,a.x,a.y),'Orduna kenardan bağlı boş bir kare seç.');need(p.money>=cost,'General için '+cost+'$ gerekiyor.');p.money-=cost;s.board[key(a.x,a.y)]={owner:id,hp:siege?cost:p.generalHP};event(s,'promote',{x:a.x,y:a.y,player:p.id});break;}
 case 'buy':{const pow=(siege?SIEGE_POWERS:POWERS).find(x=>x.id===a.power);need(pow,'Güç bulunamadı.');need(!locked(s,p),'Kasa kilitli.');need(p.money>=pow.price,'Yeterli dolar yok.');need(pow.id!==15||p.inventory[15]!==-1,'Bu güce zaten sahipsin.');need(pow.id!==10||p.generalHP!==20,'Çelik yürek zaten etkin.');p.money-=pow.price;grant(s,p,pow.id);event(s,'buy',{player:id,power:pow.id});if(!siege&&[1,10].includes(pow.id)){const general=units(s,p.id).find(([,u])=>u.hp);event(s,'power',{power:pow.id,player:p.id,source:general?xy(general[0]):null});}break;}
 case 'power':use(s,p,a,rng,now);break;
 case 'end':endTurn(s,now);break;
 default:throw Error('Bilinmeyen hamle.');
 }}if(state.stage==='playing'&&a.type!=='rematch'){
 const stats=p.stats??={bestGain:0,captures:0,damage:0,rescues:0};
 if(a.type==='roll')stats.bestGain=Math.max(stats.bestGain,s.roll.gain);

 for(const [k,u]of Object.entries(state.board)){const v=s.board[k];if(u.owner!==id){if(v?.owner===id&&a.type==='place')stats.captures++;if(a.type==='place'||a.type==='power'&&a.power===5){const damage=u.hp?Math.max(0,u.hp-(v?.owner===u.owner?v.hp:0)):(!v||v.owner!==u.owner?1:0);if(damage&&!(s.players.find(q=>q.id===u.owner)?.eliminated&&!u.hp))stats.damage+=damage;}}}
 }if(s.stage==='playing'){eliminate(s);if(!siege&&s.stage==='playing'&&current(s)?.eliminated)endTurn(s,now);}s.updated=now;return s;
}
export function tick(state,now=Date.now(),rng=Math.random){if(state.mode==='siege'&&state.stage==='placement')return state;if(state.mode==='siege'&&state.stage==='playing')return siegeTick(state,now,rng);if(now<state.deadline||['lobby','ended'].includes(state.stage))return state;let s=structuredClone(state);if(s.stage==='draft'){for(const p of s.players)if(!p.chosen){p.offers.slice(0,2).forEach(x=>grant(s,p,x));p.chosen=true;}prepare(s,now,rng);}else if(s.stage==='placement'){const p=current(s);outer:for(let y=15;y<45;y++)for(let x=15;x<45;x++){let ok=true;for(let dy=0;dy<5;dy++)for(let dx=0;dx<2;dx++)if(s.board[key(x+dx,y+dy)])ok=false;if(ok){s=act(s,p.id,{type:'setup',x,y},{now,rng});break outer;}}}else if(s.stage==='countdown'){s.stage='playing';if(s.mode==='siege')startSiege(s,now,rng);else beginTurn(s,now);}else endTurn(s,now);s.updated=now;return s;}
export function botStep(s,now=Date.now(),rng=Math.random,forcedRoll){if(s.mode==='siege'&&s.stage==='playing')return siegeBotStep(s,now,rng);const p=current(s);if(!p?.bot)return s;if(s.stage==='placement')return tick({...s,deadline:now},now,rng);if(s.stage!=='playing'||now<(s.revealUntil||0))return s;let a;
 if(!p.rolled&&!p.reform)a={type:'roll',troops:Math.max(1,Math.ceil(units(s,p.id).length*.35)),money:locked(s,p)?0:Math.min(p.money,3)};
 else if(p.lossRemaining>0){const candidate=units(s,p.id).find(([k])=>dismissalPlan(s,p.id,k).ok);need(candidate,'Bot için silinebilecek kare bulunamadı.');const [x,y]=xy(candidate[0]);a={type:'dismiss',x,y};}
 else if(p.pending+p.reform>0){let candidates=[];for(const [k]of units(s,p.id))for(const [x,y]of neighbors(...xy(k))){const u=s.board[key(x,y)];if(!u||u.owner!==p.id&&s.round>5&&!player(s,u.owner).shield&&p.pending>0)candidates.push([x,y,u]);}const enemy=Object.entries(s.board).filter(([,u])=>u.owner!==p.id&&u.hp);candidates=shuffled(candidates,rng).sort((a,b)=>{const score=c=>c[2]?-100:Math.min(100,...enemy.map(([k])=>{const [x,y]=xy(k);return Math.abs(x-c[0])+Math.abs(y-c[1]);}));return score(a)-score(b);});const target=candidates.find(([x,y,u])=>adjacent(s,p.id,x,y)&&(!u||u.hp>1||canRemove(s,u.owner,key(x,y))));a=target?{type:'place',x:target[0],y:target[1]}:{type:'end'};}
 else a={type:'end'};return act(s,p.id,a,{now,rng,forcedRoll});}
function chooseSiegeFocus(rng,bounds){
 const {left,top,right,bottom}=bounds;
 if(rng()<.25)return {x:rng()<.5?left:right,y:rng()<.5?top:bottom};
 return {x:left+Math.floor(rng()*(right-left+1)),y:top+Math.floor(rng()*(bottom-top+1))};
}
function startSiege(s,now,rng){
 const warAt=now+SIEGE.peaceMs;
 s.siege={start:now,warAt,nextIncome:now+SIEGE.incomeMs,nextShrink:warAt+SIEGE.shrinkMs,war:false,inset:0,bounds:{left:0,top:0,right:SIZE-1,bottom:SIZE-1}};
 s.siege.focus=chooseSiegeFocus(rng,s.siege.bounds);
 s.siege.marketVersion=2;
 for(const p of s.players){
  p.pending=SIEGE.startTroops;p.money=SIEGE.startMoney;
 }
 s.deadline=warAt;
}
function paySiege(s,until){
 const zone=s.siege;
 const incomes=Math.max(0,1+Math.floor((until-zone.nextIncome)/SIEGE.incomeMs));
 zone.nextIncome+=incomes*SIEGE.incomeMs;
 for(const p of s.players){
  if(p.eliminated)continue;
  const withheld=Math.min(incomes,p.skipIncome||0);
  p.skipIncome=(p.skipIncome||0)-withheld;p.money+=(incomes-withheld)*SIEGE.income;
  if(p.shield&&p.shieldUntil<=until)p.shield=false;
 }
}
function nextSiegeBounds(bounds,focus){
 const width=bounds.right-bounds.left-1;
 const nextEdge=(edge,target)=>Math.min(edge+2,Math.max(edge,target-Math.floor((width-1)/2)));
 const left=nextEdge(bounds.left,focus.x),top=nextEdge(bounds.top,focus.y);
 return {left,top,right:left+width-1,bottom:top+width-1};
}
function pulseZone(s,rng){
 const zone=s.siege,prev=zone.bounds;
 if(zone.inset<SIZE/2){
  zone.focus??=chooseSiegeFocus(rng,prev);
  zone.bounds=nextSiegeBounds(prev,zone.focus);zone.inset++;
 }
 const removed=[],damaged=[];
 for(const [k,u] of Object.entries(s.board)){
  const [x,y]=xy(k);
  if(safeSiegeCell(s,x,y)){delete u.zoneDamage;continue;}
  const damage=u.zoneDamage||5;
  if(u.hp>damage){u.hp-=damage;u.zoneDamage=damage*2;damaged.push([x,y]);}
  else{delete s.board[k];removed.push([x,y]);}
 }
 for(const p of s.players)if(!units(s,p.id).length)p.reform=0;
 event(s,'zone',{inset:zone.inset,removed,damaged});eliminate(s);
}
function siegeTick(state,now,rng){
 const z=state.siege,alive=state.players.filter(p=>!p.eliminated);
 const due=Math.min(z.nextIncome,z.war?z.nextShrink:z.warAt,...alive.filter(p=>p.shield).map(p=>p.shieldUntil||Infinity));
 if(now<due)return state;
 const s=structuredClone(state),zone=s.siege;
 if(!zone.war&&now>=zone.warAt){zone.war=true;event(s,'war');log(s,'Gelişim tamamlandı. Kuşatma başladı!');}
 while(s.stage==='playing'&&now>=zone.nextShrink){
  const at=zone.nextShrink;
  paySiege(s,at);zone.nextShrink=at+SIEGE.shrinkMs;pulseZone(s,rng);
 }
 if(s.stage==='playing')paySiege(s,now);
 s.deadline=zone.war?zone.nextShrink:zone.warAt;s.updated=now;
 return s;
}
function safeSiegeCell(s,x,y){
 if(!inside(x,y))return false;
 const b=s.siege.bounds;if(b)return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;
 const n=s.siege.inset;return x>=n&&y>=n&&x<SIZE-n&&y<SIZE-n;
}
function siegeMissileTarget(s,p,opponents){
 const scores=new Int16Array(SIZE*SIZE);
 // Accumulate splash value once per occupied cell, accounting for friendly fire.
 for(const [k,u] of Object.entries(s.board)){
  const self=u.owner===p.id,enemy=opponents.get(u.owner);
  if(self&&(u.hp||p.shield)||!self&&(!enemy||enemy.shield))continue;
  const [x,y]=xy(k),value=self?-3:u.hp===1?5:u.hp?2:1;
  for(let j=Math.max(0,y-1);j<=Math.min(SIZE-1,y+1);j++)
   for(let i=Math.max(0,x-1);i<=Math.min(SIZE-1,x+1);i++)scores[j*SIZE+i]+=value;
 }
 let best=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;
 return {x:best%SIZE,y:Math.floor(best/SIZE),value:scores[best]};
}
function siegeBotPower(s,p,army,generals,opponents,enemyDistance,now){
 if(!s.siege.war||!generals.length)return null;
 const choices=[];
 function consider(power,value,target={}){
  const owned=(p.inventory[power]||0)>0;
  const price=SIEGE_POWERS.find(card=>card.id===power).price;
  if(!owned&&(p.cooldowns?.[power]>now||p.money-price<12||value<7))return;
  if(value>0)choices.push({value:owned?value:value*.55,action:owned?{type:'power',power,...target}:{type:'buy',power}});
 }
 const troops=new Map();
 for(const u of Object.values(s.board))if(!u.hp)troops.set(u.owner,(troops.get(u.owner)||0)+1);
 for(const enemy of opponents.values()){
  if(enemy.shield)continue;
  const count=troops.get(enemy.id)||0;
  if(count>=2&&!enemy.mask)consider(4,Math.floor(count/2),{target:enemy.id});
  if(count>=4||enemy.money>=8)consider(7,Math.floor(count/4)+Math.floor(enemy.money/4)*.55,{target:enemy.id});
  if(!enemy.skipIncome&&s.siege.nextIncome-now<9000)consider(11,enemy.money<25?8:4,{target:enemy.id});
 }
 if(p.inventory[5]>0||p.money>=57){
  const {x,y,value}=siegeMissileTarget(s,p,opponents);
  if(value>=2)consider(5,value,{x,y});
 }
 if(!p.shield&&generals.some(([k])=>{const [x,y]=xy(k);return enemyDistance[y*SIZE+x]<=2;}))consider(14,10);
 if(generals.some(([,u])=>u.hp<=6))consider(10,12);
 if(!p.mask&&army.length-generals.length>=8)consider(12,5);
 choices.sort((a,b)=>b.value-a.value);
 return choices[0]?.action;
}
function siegeBotDecision(s,p,now){
 const army=units(s,p.id),generals=army.filter(([,u])=>u.hp);
 const opponents=new Map(s.players.filter(q=>q.id!==p.id&&!q.eliminated).map(q=>[q.id,q]));
 const zone=s.siege,b=zone.bounds,distance=siegeEnemyDistances(s.board,p.id);
 const focus=zone.focus||{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
 const toward=(x,y)=>Math.abs(x-focus.x)+Math.abs(y-focus.y);
 const sources=generals.length?connected(s,p.id):new Set(army.map(([k])=>k));
 const cells=new Map();
 for(const k of sources)for(const [x,y] of neighbors(...xy(k))){
  const cell=key(x,y),unit=s.board[cell];
  if(unit?.owner===p.id||cells.has(cell))continue;
  const exposure=siegeExposure(b,x,y);
  const score=exposure*SIZE*4+toward(x,y)*(zone.war?1.25:.45)+distance[y*SIZE+x];
  cells.set(cell,{x,y,unit,score});
 }
 const vacancies=[...cells.values()].filter(c=>!c.unit).sort((a,b)=>a.score-b.score);
 if(!generals.length&&vacancies.length&&p.money>=10&&!(p.cooldowns?.general>now)){
  const {x,y}=vacancies[0];return {type:'general',x,y};
 }
 // When the next pulse is imminent, evacuate before it can kill a weakened general.
 let refuge=b;
 if(zone.war&&zone.nextShrink-now<=4500&&zone.focus&&b.right-b.left>=3)
  refuge=nextSiegeBounds(b,focus);
 const endangered=generals.find(([k])=>siegeExposure(refuge,...xy(k))>0);
 if(endangered){
  let best=null,bestScore=Infinity;
  for(let y=refuge.top;y<=refuge.bottom;y++)for(let x=refuge.left;x<=refuge.right;x++){
   const cell=key(x,y);if(s.board[cell])continue;
   const support=neighbors(x,y).some(([i,j])=>s.board[key(i,j)]?.owner===p.id);
   const score=toward(x,y)+(support?0:SIZE*2)+8*Math.max(0,4-distance[y*SIZE+x]);
   if(score<bestScore){best={toX:x,toY:y};bestScore=score;}
  }
  if(best){const [x,y]=xy(endangered[0]);return {type:'move-general',x,y,...best};}
 }
 const power=siegeBotPower(s,p,army,generals,opponents,distance,now);
 if(power)return power;
 const wounded=generals.find(([,u])=>u.hp<=5);
 if(wounded&&p.money>=8&&!(p.cooldowns?.heal>now)){
  const [x,y]=xy(wounded[0]);return {type:'heal',x,y,amount:Math.min(p.money-3,12)};
 }
 if(!p.pending&&generals.length&&p.money>0&&!(p.cooldowns?.recruit>now)){
  const reserve=p.money>15?10:0;
  return {type:'recruit',amount:Math.min(26,p.money-reserve)};
 }
 if(!p.pending)return null;
 if(generals.length&&zone.war){
  const targets=[...cells.values()].filter(c=>c.unit&&!opponents.get(c.unit.owner)?.shield&&safeSiegeCell(s,c.x,c.y));
  // A one-hit general is worth taking even if a normal troop is closer to the next zone.
  targets.sort((a,b)=>(b.unit.hp===1)-(a.unit.hp===1)||Number(!!b.unit.hp)-Number(!!a.unit.hp)||a.unit.hp-b.unit.hp||a.score-b.score);
  for(const {x,y,unit} of targets)if(unit.hp>1||canRemove(s,unit.owner,key(x,y))||exposedFlank(s,unit.owner,key(x,y)))
   return {type:'place',x,y,expectedOwner:unit.owner};
 }
 if(vacancies.length){const {x,y}=vacancies[0];return {type:'place',x,y,expectedOwner:null};}
 return null;
}
function siegeBotStep(state,now,rng){
 let s=siegeTick(state,now,rng);
 for(const id of state.players.filter(p=>p.bot).map(p=>p.id)){
  const p=player(s,id);
  if(p.eliminated||s.stage!=='playing'||s.siege.inset>=SIZE/2||now<(p.botNext||0))continue;
  let action=siegeBotDecision(s,p,now);
  if(action){
   s=act(s,id,action,{now,rng});
   // Deliver a paid reserve and deploy its first unit in the same decision.
   if(action.type==='recruit'&&s.stage==='playing'){
    const deploy=siegeBotDecision(s,player(s,id),now);
    if(deploy?.type==='place')s=act(s,id,deploy,{now,rng});
   }
  }else if(s===state)s=structuredClone(s);
  player(s,id).botNext=now+(action?1150:2200);
 }
 return s;
}

export function migrateSiegeRoom(s){
 if(s.mode!=='siege')return s;
 const allowed=SIEGE_POWERS.map(c=>c.id);
 for(const p of s.players){
  p.offers=p.offers.filter(id=>allowed.includes(id));
  if(s.stage==='draft')for(const id of allowed){if(p.offers.length>=3)break;if(!p.offers.includes(id))p.offers.push(id);}
  for(const id of Object.keys(p.inventory))if(!allowed.includes(Number(id)))delete p.inventory[id];
 }
 if(s.siege&&!s.siege.bounds){
  const z=s.siege,n=z.inset;
  z.bounds={left:n,top:n,right:SIZE-1-n,bottom:SIZE-1-n};z.nextIncome=Date.now()+SIEGE.incomeMs;
  if(!z.war)z.warAt=z.start+SIEGE.peaceMs;
  z.nextShrink=(z.war?Date.now():z.warAt)+SIEGE.shrinkMs;
  s.deadline=z.war?z.nextShrink:z.warAt;
 }
 if(s.siege&&!s.siege.focus&&s.siege.inset<SIZE/2)s.siege.focus=chooseSiegeFocus(Math.random,s.siege.bounds);
 if(s.siege&&s.siege.marketVersion!==2){
  for(const p of s.players){
   p.cooldowns={};
   if(p.saleUnlocked)p.money+=100;
   delete p.saleUnlocked;delete p.saleReady;delete p.soldTroops;
  }
  s.siege.marketVersion=2;
 }
 return s;
}
