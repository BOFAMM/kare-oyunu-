import {GENERALS,generalById,teamColor} from './public/cosmetics.js';
import {ODDS,SIZE,ROLL_REVEAL_MS,POWERS,COLORS,key,xy,inside,neighbors,units,adjacent,face,shuffled,dismissalPlan,multiplierLabel} from './public/rules.js';
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
 }else if(options.type==='setup'){
  need(integer(options.round,1,10000),'Tur 1–10000 arasında olmalı.');
  need(integer(options.money,0,1000000)&&integer(options.pending,0,1000000),'Kaynaklar 0–1000000 arasında olmalı.');
  if(options.hp!==undefined)need(integer(options.hp,1,1000000),'General canı 1–1000000 arasında olmalı.');
  const power=options.power===undefined?null:POWERS.find(item=>item.id===options.power);
  need(options.power===undefined||power,'Geçersiz güç.');
  s.round=options.round;p.money=options.money;p.pending=options.pending;
  if(options.hp!==undefined)for(const [,u]of units(s,p.id))if(u.hp)u.hp=options.hp;
  if(power)grant(s,p,power.id);
 }else throw Error('Bilinmeyen yönetici işlemi.');
 log(s,'Yönetici testi · '+p.name+(options.type==='turn'?' için sıra düzenlendi.':' için kaynaklar ve tur düzenlendi.'));
 s.updated=now;
 return s;
}
function grant(s,p,id){const pow=POWERS.find(x=>x.id===id);p.inventory[id]=(p.inventory[id]||0)+pow.uses;if(id===1){p.money+=30;p.inventory[id]=0;}if(id===10){p.generalHP=20;for(const [,u]of units(s,p.id))if(u.hp)u.hp=20;p.inventory[id]=0;}}
function form(s,p,x,y){for(let dy=0;dy<5;dy++)for(let dx=0;dx<2;dx++)s.board[key(x+dx,y+dy)]={owner:p.id,hp:dx===0&&dy===0?p.generalHP:0};}
function prepare(s,now,rng){for(const p of s.players){if(!generalById(p.generalSkin)){const choices=GENERALS.filter(g=>!s.players.some(q=>q.generalSkin===g.id));p.generalSkin=choices[Math.floor(rng()*choices.length)].id;}p.color=teamColor(p);}s.theme=undefined;s.order=shuffled(s.players.map(p=>p.id),rng);s.cursor=0;if(s.settings.manual){s.stage='placement';s.deadline=now+90000;log(s,'Rastgele yerleşim sırası: '+s.order.map(id=>player(s,id).name).join(' → '));}else{const starts=shuffled([[18,17],[24,17],[30,17],[18,26],[24,26],[30,26]],rng);s.players.forEach((p,i)=>form(s,p,...starts[i]));countdown(s,now);}}
function countdown(s,now){s.stage='countdown';s.deadline=now+4000;event(s,'spawn');}
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
function hostile(s,p,target){need(s.round>5,'İlk 5 tur barış var. Savaş 6. turda açılır.');need(!target.shield,'Rakip dokunulmazlıkla korunuyor.');}
function place(s,p,x,y){need(inside(x,y),'Ada dışında bir kare seçtin.');need(p.pending+p.reform>0,'Yerleştirecek askerin yok.');need(adjacent(s,p.id,x,y),'Generaline bağlı bölgenin kenarına yerleştir. Köşegen sayılmaz.');const k=key(x,y),u=s.board[k];need(u?.owner!==p.id,'Bu kare zaten senin.');if(u){hostile(s,p,player(s,u.owner));need(p.pending>0,'Yeniden dizilim askerleri saldırıda harcanamaz; yeni asker hakkı gerekir.');if(u.hp>1){u.hp--;p.pending--;event(s,'hit',{x,y,player:p.id});return;}need(canRemove(s,u.owner,k),'Bu kare rakibin topraklarını bağlı tutuyor. Önce dış kenarlara saldır.');}s.board[k]={owner:p.id,hp:0};if(!u&&p.reform)p.reform--;else p.pending--;event(s,u?'hit':'place',{x,y,player:p.id});if(u)eliminate(s);}
function use(s,p,a,rng){const before=structuredClone(s.board), army=units(s,p.id), sourceKey=(army.find(([,u])=>u.hp)||army[0])?.[0];const balance=p.money;const pow=POWERS.find(x=>x.id===a.power);need(pow,'Bilinmeyen güç.');need(s.round>=3,'Güçler 3. turda açılır.');need(!locked(s,p),'Kasa kilidi sırasında güç kullanamazsın.');need(p.inventory[pow.id]!==0&&p.inventory[pow.id]!==undefined,'Bu güçten kullanım hakkın yok.');let t;if(pow.target==='player'){t=player(s,a.target);need(t!==p&&!t.eliminated,'Hayattaki bir rakibi seç.');}if(pow.hostile){hostile(s,p,t||{shield:false});}if(pow.target==='cell')need(inside(a.x,a.y),'Haritadan geçerli hedef seç.');
 if([2,6].includes(pow.id)){restoreReform(s,p);if(t)restoreReform(s,t);}
 switch(pow.id){
 case 1:p.money+=30;break;
 case 2:for(const u of Object.values(s.board)){if(u.owner===p.id)u.owner=t.id;else if(u.owner===t.id)u.owner=p.id;}break;
 case 3:[p.money,t.money]=[t.money,p.money];break;
 case 4:remove(s,t.id,Math.floor(units(s,t.id).filter(([,u])=>!u.hp).length/2),rng);break;
 case 5:{const targets=new Map();for(const [k,u]of Object.entries(s.board)){const [x,y]=xy(k);if(Math.abs(x-a.x)<=1&&Math.abs(y-a.y)<=1&&!player(s,u.owner).shield&&!(u.owner===p.id&&u.hp)){if(u.hp>1)u.hp-=1;else{if(u.hp)u.hp=1;if(!targets.has(u.owner))targets.set(u.owner,[]);targets.get(u.owner).push(k);}}}for(const [owner,keys]of targets){remove(s,owner,keys.length,rng,keys,true);}event(s,'missile',{x:a.x,y:a.y,player:p.id});eliminate(s);break;}
 case 6:{const own=units(s,p.id),anchor=xy((own.find(([,u])=>u.hp)||own[0])[0]),dx=a.x-anchor[0],dy=a.y-anchor[1];const moved=own.map(([k,u])=>{const [x,y]=xy(k);need(inside(x+dx,y+dy),'Dizilimin bir kısmı ada dışına taşıyor.');const dest=key(x+dx,y+dy);need(!s.board[dest]||s.board[dest].owner===p.id,'Hedefte rakip var; ışınlanma iptal.');return [dest,u];});for(const [k]of own)delete s.board[k];for(const [k,u]of moved)s.board[k]=u;event(s,'teleport',{x:a.x,y:a.y,player:p.id,source:anchor,formation:own.map(([k,u])=>[...xy(k),u.hp])});break;}
 case 7:{const amount=Math.floor(t.money/4);t.money-=amount;p.money+=amount;p.pending+=remove(s,t.id,Math.floor(units(s,t.id).length/4),rng);break;}
 case 8:t.skip++;break;
 case 9:need(!p.rolled&&!p.double,'Zardan önce bir kez etkinleştir.');p.double=true;break;
 case 10:p.generalHP=20;for(const [,u]of units(s,p.id))if(u.hp)u.hp=20;break;
 case 11:need(!s.lock,'Kasa kilidi zaten etkin.');s.lock=p.id;break;
 case 12:need(!p.rolled&&!p.lucky,'Zardan önce bir kez etkinleştir.');p.lucky=true;break;
 case 13:p.pending+=remove(s,t.id,Math.floor(units(s,t.id).length/2),rng);break;
 case 14:need(!p.shield,'Kalkanın zaten açık.');p.shield=true;break;
 case 15:{need(!p.reform,'Önce mevcut yeniden dizilimi tamamla.');const original=units(s,p.id).filter(([,u])=>!u.hp).map(([k])=>k);p.reform=remove(s,p.id,Math.min(original.length,Math.max(0,units(s,p.id).length-1)),rng);p.reformOriginal=original.filter(k=>!s.board[k]);p.noAttackUntil=0;break;}
 }
 if(p.inventory[pow.id]>0)p.inventory[pow.id]--;log(s,p.name+': '+pow.name);event(s,'power',{power:pow.id,player:p.id,target:t?.id,source:sourceKey?xy(sourceKey):null,destination:pow.target==='cell'?[a.x,a.y]:t?xy((Object.entries(before).find(([,u])=>u.owner===t.id&&u.hp)||Object.entries(before).find(([,u])=>u.owner===t.id))?.[0]||sourceKey):null,removed:pow.id===4?Object.entries(before).filter(([k,u])=>!s.board[k]&&u.owner===t.id).map(([k])=>xy(k)):undefined,money:pow.id===7?p.money-balance:undefined});
}
// Commands commit a clone: a rejected action cannot partially spend resources or damage the board.
export function act(state,id,a,{now=Date.now(),rng=Math.random,forcedRoll}={}){const s=structuredClone(state);const p=player(s,id);need(a&&typeof a.type==='string','Geçersiz hamle.');
 if(a.type==='rematch'){need(s.stage==='ended'&&s.host===id,'Rövanşı maç sonunda oda kurucusu başlatır.');const fresh=createRoom(s.code,s.host,p.name,now);fresh.settings={...s.settings};fresh.seq=s.seq;fresh.updated=now;for(const q of s.players)addPlayer(fresh,q.id,q.name,q.bot);return fresh;}
 else if(a.type==='settings'){need(s.host===id&&s.stage==='lobby','Ayarları lobide yalnızca kurucu değiştirir.');s.settings.manual=a.manual===true;}
 else if(a.type==='start'){need(s.host===id&&s.stage==='lobby','Oyunu lobide kurucu başlatır.');need(s.players.length>=2,'En az iki oyuncu veya bir bot gerekir.');s.stage='draft';s.deadline=now+90000;for(const q of s.players){q.offers=shuffled(POWERS.map(x=>x.id),rng).slice(0,3);if(q.bot){q.offers.slice(0,2).forEach(x=>grant(s,q,x));q.chosen=true;}}log(s,'Her komutan 3 karttan 2 güç seçiyor.');}
 else if(a.type==='cosmetic'){need(s.stage==='draft'&&!p.chosen,'Seçim aşaması kapandı.');need(a.theme===undefined,'Tema seçimi kaldırıldı.');if(a.skin!==undefined){need(generalById(a.skin),'Geçersiz general.');need(!s.players.some(q=>q.id!==id&&q.generalSkin===a.skin),'Bu general başka bir oyuncuda.');p.generalSkin=a.skin;p.color=teamColor(p);}}
 else if(a.type==='choose'){need(s.stage==='draft'&&!p.chosen,'Kart seçimi açık değil.');need(Array.isArray(a.powers)&&a.powers.length===2&&new Set(a.powers).size===2&&a.powers.every(x=>p.offers.includes(x)),'Sunulan üç karttan iki farklı güç seç.');a.powers.forEach(x=>grant(s,p,x));p.chosen=true;if(s.players.every(q=>q.chosen))prepare(s,now,rng);}
 else if(a.type==='setup'){need(s.stage==='placement'&&current(s).id===id,'Yerleşim sırası sende değil.');need(inside(a.x,a.y)&&inside(a.x+1,a.y+4),'2×5 dizilim ada içinde olmalı.');for(let y=0;y<5;y++)for(let x=0;x<2;x++)need(!s.board[key(a.x+x,a.y+y)],'Dizilim başka bir oyuncuyla çakışıyor.');form(s,p,a.x,a.y);s.cursor++;s.deadline=now+90000;if(s.cursor===s.order.length){s.cursor=0;countdown(s,now);}}
 else {need(s.stage==='playing'&&!p.eliminated,'Oyun hamle aşamasında değil.');need(current(s).id===id,'Sıra sende değil.');need(now<s.deadline,'Hamle süresi doldu.');need(now>=(s.revealUntil||0),'Zar sonucu gösteriliyor; animasyonun bitmesini bekle.');need(!p.lossRemaining||['dismiss','auto-dismiss','end'].includes(a.type),'Önce eksi çarpanın gerektirdiği askerleri sil.');
 switch(a.type){
 case 'roll':{need(!p.rolled,'Bu hamlede zaten zar attın.');need(!p.reform,'Zardan önce yeniden dizilimi tamamla.');need(integer(a.money,0,p.money)&&integer(a.troops,0,units(s,id).length),'Bahis mevcut dolar ve asker miktarını aşamaz.');need(a.money+a.troops>0,'En az bir birim bahis seç.');need(!a.money||!locked(s,p),'Kasa kilitli; yalnızca asker bahsi yapabilirsin.');const test=ODDS.some(o=>o.v===forcedRoll),value=test?forcedRoll:face(rng());p.rolled=true;let gain=0,lostMoney=0,lostTroops=0;if(value>0){gain=(a.money+a.troops)*value*(p.double?2:1);p.pending+=gain;}else if(!p.lucky){lostMoney=Math.min(p.money,a.money*-value);p.money-=lostMoney;lostTroops=Math.min(a.troops*-value,units(s,id).filter(([,u])=>!u.hp).length);p.lossRemaining=lostTroops;}s.revealUntil=now+ROLL_REVEAL_MS;s.deadline+=ROLL_REVEAL_MS;s.roll={id:s.seq+1,player:id,value,gain,lostMoney,lostTroops,test};event(s,'roll',s.roll);log(s,p.name+' '+multiplierLabel(value)+' attı. '+(test?'[Yönetici testi] ':'')+(gain?gain+' asker kazandı.':lostTroops+' asker seçilecek, '+lostMoney+'$ kayıp.'));break;}
 case 'dismiss':need(inside(a.x,a.y),'Ada dışında bir kare seçtin.');dismiss(s,p,key(a.x,a.y));break;
 case 'auto-dismiss':finishLoss(s,p);break;
 case 'place':place(s,p,a.x,a.y);break;
 case 'convert':{need(!locked(s,p),'Kasa kilidi açıkken dolara çeviremezsin.');need([25,50,75,100].includes(a.percent),'Dönüşüm yüzdesi geçersiz.');const n=Math.floor(p.pending*a.percent/100);need(n>0,'Dönüştürülecek en az 1 asker olmalı.');p.pending-=n;p.money+=n;break;}
 case 'recruit':need(!locked(s,p),'Kasa kilitli.');need(integer(a.amount,1,p.money),'Yeterli dolar yok.');p.money-=a.amount;p.pending+=a.amount;break;
 case 'heal':{const u=s.board[key(a.x,a.y)];need(u?.owner===id&&u.hp>0,'Kendi generalini seç.');need(integer(a.amount,1,p.pending),'Yeterli kazanılmış asker yok.');u.hp+=a.amount;p.pending-=a.amount;event(s,'heal',{x:a.x,y:a.y});break;}
 case 'general':{need(units(s,id).some(([,u])=>u.hp),'Generalin kalmadığı için yeni general alamazsın.');need(!locked(s,p),'Kasa kilitli.');const u=s.board[key(a.x,a.y)],cost=(units(s,id).filter(([,v])=>v.hp).length+1)*10;need(integer(a.x,0,SIZE-1)&&integer(a.y,0,SIZE-1),'Geçersiz kare.');need(!u&&adjacent(s,id,a.x,a.y),'Orduna kenardan bağlı boş bir kare seç.');need(p.money>=cost,'General için '+cost+'$ gerekiyor.');p.money-=cost;s.board[key(a.x,a.y)]={owner:id,hp:p.generalHP};event(s,'promote',{x:a.x,y:a.y,player:p.id});break;}
 case 'buy':{const pow=POWERS.find(x=>x.id===a.power);need(pow,'Güç bulunamadı.');need(!locked(s,p),'Kasa kilitli.');need(p.money>=pow.price,'Yeterli dolar yok.');need(pow.id!==15||p.inventory[15]!==-1,'Bu güce zaten sahipsin.');need(pow.id!==10||p.generalHP!==20,'Çelik yürek zaten etkin.');p.money-=pow.price;grant(s,p,pow.id);if([1,10].includes(pow.id)){const general=units(s,p.id).find(([,u])=>u.hp);event(s,'power',{power:pow.id,player:p.id,source:general?xy(general[0]):null});}break;}
 case 'power':use(s,p,a,rng);break;
 case 'end':endTurn(s,now);break;
 default:throw Error('Bilinmeyen hamle.');
 }}if(state.stage==='playing'&&a.type!=='rematch'){
 const stats=p.stats??={bestGain:0,captures:0,damage:0,rescues:0};
 if(a.type==='roll')stats.bestGain=Math.max(stats.bestGain,s.roll.gain);

 for(const [k,u]of Object.entries(state.board)){const v=s.board[k];if(u.owner!==id){if(v?.owner===id&&a.type==='place')stats.captures++;if(a.type==='place'||a.type==='power'&&a.power===5){const damage=u.hp?Math.max(0,u.hp-(v?.owner===u.owner?v.hp:0)):(!v||v.owner!==u.owner?1:0);if(damage&&!(s.players.find(q=>q.id===u.owner)?.eliminated&&!u.hp))stats.damage+=damage;}}}
 }if(s.stage==='playing'){eliminate(s);if(s.stage==='playing'&&current(s)?.eliminated)endTurn(s,now);}s.updated=now;return s;
}
export function tick(state,now=Date.now(),rng=Math.random){if(now<state.deadline||['lobby','ended'].includes(state.stage))return state;let s=structuredClone(state);if(s.stage==='draft'){for(const p of s.players)if(!p.chosen){p.offers.slice(0,2).forEach(x=>grant(s,p,x));p.chosen=true;}prepare(s,now,rng);}else if(s.stage==='placement'){const p=current(s);outer:for(let y=15;y<45;y++)for(let x=15;x<45;x++){let ok=true;for(let dy=0;dy<5;dy++)for(let dx=0;dx<2;dx++)if(s.board[key(x+dx,y+dy)])ok=false;if(ok){s=act(s,p.id,{type:'setup',x,y},{now,rng});break outer;}}}else if(s.stage==='countdown'){s.stage='playing';beginTurn(s,now);}else endTurn(s,now);s.updated=now;return s;}
export function botStep(s,now=Date.now(),rng=Math.random,forcedRoll){const p=current(s);if(!p?.bot)return s;if(s.stage==='placement')return tick({...s,deadline:now},now,rng);if(s.stage!=='playing'||now<(s.revealUntil||0))return s;let a;
 if(!p.rolled&&!p.reform)a={type:'roll',troops:Math.max(1,Math.ceil(units(s,p.id).length*.35)),money:locked(s,p)?0:Math.min(p.money,3)};
 else if(p.lossRemaining>0){const candidate=units(s,p.id).find(([k])=>dismissalPlan(s,p.id,k).ok);need(candidate,'Bot için silinebilecek kare bulunamadı.');const [x,y]=xy(candidate[0]);a={type:'dismiss',x,y};}
 else if(p.pending+p.reform>0){let candidates=[];for(const [k]of units(s,p.id))for(const [x,y]of neighbors(...xy(k))){const u=s.board[key(x,y)];if(!u||u.owner!==p.id&&s.round>5&&!player(s,u.owner).shield&&p.pending>0)candidates.push([x,y,u]);}const enemy=Object.entries(s.board).filter(([,u])=>u.owner!==p.id&&u.hp);candidates=shuffled(candidates,rng).sort((a,b)=>{const score=c=>c[2]?-100:Math.min(100,...enemy.map(([k])=>{const [x,y]=xy(k);return Math.abs(x-c[0])+Math.abs(y-c[1]);}));return score(a)-score(b);});const target=candidates.find(([x,y,u])=>adjacent(s,p.id,x,y)&&(!u||u.hp>1||canRemove(s,u.owner,key(x,y))));a=target?{type:'place',x:target[0],y:target[1]}:{type:'end'};}
 else a={type:'end'};return act(s,p.id,a,{now,rng,forcedRoll});}
