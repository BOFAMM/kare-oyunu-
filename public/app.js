import {GENERALS,generalById,teamColor} from './cosmetics.js';
import {FX_DURATION} from './battle-fx.js';
import {betPreview,POWERS,units,multiplierLabel,REEL_DURATION_MS,REEL_PITCH,reelPlan,reelEase} from './rules.js';
import {Board} from './board.js';
import {installAdmin} from './admin.js';
import {icon,powerIcon,installArena,menuMotion,setPane,moment,announce} from './arena.js';

// Carry existing room sessions and preferences through the title change.
for(const [storage,key] of [[sessionStorage,'session'],[localStorage,'sound'],[localStorage,'coach']]){
 const value=storage.getItem('ada-'+key);
 if(value!==null&&storage.getItem('kare-'+key)===null)storage.setItem('kare-'+key,value);
 if(value!==null)storage.removeItem('ada-'+key);
}
const $=id=>document.getElementById(id),show=(id,on=true)=>$(id).classList.toggle('hidden',!on);
let state=null,myId=null,token=sessionStorage.getItem('kare-session'),seen=0,target=null,picks=[],draftKey='',queue=Promise.resolve(),animating=false,polling=false,leaving=false,soundOn=localStorage.getItem('kare-sound')!=='off',audio=null,toastTimer,previousStage='',endedShown=false,connectionFailures=0;
let lastPlaceSound=0,lastBet=null;
let reelQueue=Promise.resolve();
const board=new Board($('board'),cell);
const me=()=>state?.players.find(p=>p.id===myId),turn=()=>state?.players.find(p=>p.id===state.order[state.cursor]);
const myTurn=()=>state?.stage==='playing'&&turn()?.id===myId&&!me()?.eliminated;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3700);}
function tone(kind='click'){if(kind==='place'){if(Date.now()-lastPlaceSound<90)return;lastPlaceSound=Date.now();}if(!soundOn)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();const sounds={block:[95,.3],buff:[1050,.35],click:[520,.04],place:[700,.07],hit:[130,.15],win:[880,.4],lose:[170,.3],tick:[900,.025],power:[440,.25],turn:[650,.16],missile:[80,.65]};const [f,d]=sounds[kind]||sounds.click;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=kind==='missile'?'sawtooth':kind==='place'?'triangle':'sine';osc.frequency.setValueAtTime(f,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(kind==='lose'||kind==='missile'?40:f*1.3,audio.currentTime+d);gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.08,audio.currentTime+.005);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);osc.start();osc.stop(audio.currentTime+d+.01);}catch{/* Audio is optional when the browser has no AudioContext. */}}
async function request(path,data){const r=await fetch('/api/'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(8000)});const result=await r.json();if(!r.ok){if(r.status===401){sessionStorage.removeItem('kare-session');token=null;}throw Error(result.error||'Sunucuya ulaşılamadı.');}return result;}
function update(result,initial=false){
 const next=result.state;
 if(state&&next.code===state.code&&next.updated<state.updated)return;
 myId=result.id;state=next;
 const fresh=initial?[]:state.events.filter(e=>e.id>seen);
 board.setState(state,myId);
 for(const e of fresh){
  board.effect(e);
  if(e.type==='roll')reelQueue=reelQueue.then(()=>reel(e)).catch(err=>toast('Çark gösterimi tamamlanamadı: '+err.message));
  if(e.type==='missile'){
   battleSound('launch','missile');const room=state.code;
   setTimeout(()=>{if(state?.code===room)battleSound('impact','hit');},board.reduced?0:FX_DURATION*.52);
  }
  if(e.type==='hit')battleSound('step','hit');
  if(e.type==='place')tone('place');
  if(e.type==='turn'&&e.player===myId)tone('turn');
  if(e.type==='power'&&e.power!==5)battleSound([8,11,12].includes(e.power)?'lock':[9,10].includes(e.power)?'charge':e.power===6?'beam':'step');
 }
 seen=state.seq;
 if(target&&!myTurn())clearTarget();
 if(previousStage!==state.stage){
  menuMotion(false);document.body.dataset.stage=state.stage;
  if(state.stage==='lobby'){
   show('arena-callout',false);show('reel-result',false);endedShown=false;draftKey='';picks=[];$('modal').close();
  }
  if(['playing','placement','countdown'].includes(state.stage)){board.focus(myId);setPane('map');}
  previousStage=state.stage;
 }
 if(state.stage==='playing')announce(moment(fresh,state,myId));
 document.body.dataset.myTurn=String(Boolean(myTurn()));
 render();
}
function command(a,{quiet=false}={}){const work=queue.then(async()=>{try{const result=await request('action',a);update(result);return true;}catch(e){if(!quiet)toast(e.message);return false;}});queue=work.catch(()=>{});return work;}
async function connect(mode,solo=false){if(leaving)return;leaving=true;for(const id of ['quick-play','create','join'])$(id).disabled=true;try{tone();const result=await request(mode,{name:$('name').value.trim(),code:$('code').value.trim()});token=result.token;sessionStorage.setItem('kare-session',token);update(result,true);if(solo){await command({type:'bot'});await command({type:'bot'});await command({type:'start'});}}catch(e){toast(e.message);}finally{leaving=false;for(const id of ['quick-play','create','join'])$(id).disabled=false;}}
function modal(title,html){$('modal-title').textContent=title;$('modal-body').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function powerCard(pow,button='',extra=''){return `<article class="power-card"><span class="power-icon power-${pow.id}">${powerIcon(pow.id)}</span><h3>${esc(pow.name)}</h3><p>${esc(pow.desc)}</p>${extra}${button}</article>`;}
function render(){const p=me(),s=state;if(!s)return;const waiting=animating||Date.now()<(s.revealUntil||0);show('welcome',false);show('exit');show('lobby',s.stage==='lobby');show('roster',s.stage!=='lobby');show('actions',['playing','ended'].includes(s.stage));show('hud',s.stage!=='lobby');show('map-controls',s.stage!=='lobby');show('draft',s.stage==='draft');show('countdown',s.stage==='countdown');$('room-label').textContent='Oda '+s.code;$('copy-code').textContent=s.code;
 if(s.stage==='lobby'){$('lobby-players').innerHTML=s.players.map(q=>`<div class="lobby-person"><span class="avatar" style="--color:${teamColor(q)}">${icon(q.bot?'helm':'flag')}</span><b>${esc(q.name)}</b><span class="muted">${q.bot?'Bot':q.id===s.host?'Oda kurucusu':'Hazır'}</span></div>`).join('');show('host-settings',s.host===myId);show('wait-host',s.host!==myId);$('manual').checked=s.settings.manual;$('start').disabled=s.players.length<2;$('bot').disabled=s.players.length>=6;}
 $('players').innerHTML=s.players.map(q=>{const u=units(s,q.id),hp=u.filter(([,v])=>v.hp).map(([,v])=>v.hp);const face=generalById(q.generalSkin);return `<div class="player ${turn()?.id===q.id?'active':''} ${q.eliminated?'eliminated':''}" style="--color:${teamColor(q)}"><div class="player-top"><span class="avatar">${face?'<img src="'+face.portrait+'" alt="">':icon('helm')}</span><div><div class="player-name">${esc(q.name)} ${q.id===myId?'· Sen':''}</div><div class="player-status">${q.eliminated?'ELENDİ':q.shield?'⬡ Korunuyor':q.bot?'Bot':turn()?.id===q.id?'Hamle sırası':'Komutan'}</div></div></div><div class="player-stats"><span>${icon('flag')} ${u.length}</span><span>${icon('coin')} ${q.money}$</span><span>♥ ${hp.join(' / ')||'—'}</span></div><div class="health"><i style="width:${Math.min(100,(hp[0]||0)/q.generalHP*100)}%"></i></div><div class="player-status" title="Seçilmiş ve satın alınmış güçler">${Object.entries(q.inventory).filter(([,n])=>n!==0).map(([id,n])=>{const pow=POWERS.find(x=>x.id===+id);return '<span class="mini-power" title="'+esc(pow.name)+'">'+powerIcon(pow.id)+' '+(n<0?'∞':n)+'</span>';}).join(' · ')||'Aktif güç yok'}</div></div>`;}).join('');$('logs').innerHTML=s.logs.slice(0,12).map(l=>'<li>'+esc(l)+'</li>').join('');
 if(s.stage==='draft'){renderCosmetics();const dk=p.offers.join(',');if(draftKey!==dk){draftKey=dk;picks=[];$('draft-cards').innerHTML=p.offers.map(id=>{const pow=POWERS.find(x=>x.id===id);return `<button type="button" class="power-card" data-pick="${id}" aria-pressed="false"><span class="power-icon power-${pow.id}">${powerIcon(pow.id)}</span><h3>${esc(pow.name)}</h3><p>${esc(pow.desc)}</p></button>`;}).join('');}show('confirm-powers',!p.chosen);$('confirm-powers').disabled=p.chosen||picks.length!==2;$('draft-wait').textContent=p.chosen?'Seçimin tamam. Diğer komutanlar bekleniyor…':'90 saniye içinde seçilmezse ilk iki kart alınır.';}
 if(s.stage==='placement'){setHint(turn()?.id===myId?'SIRA SENDE: 2×5 ordunun başlangıcını seç. İlk kare generalin olacak.':turn()?.name+' yerleşiyor. Sıra: '+s.order.map(id=>s.players.find(q=>q.id===id)?.name).join(' → '));}else if(myTurn()&&p.lossRemaining&&!waiting){setHint(p.lossRemaining+' asker seçip sil. General rütbesi kalan askere aktarılır.');}else if(!target)setHint('');
 if(p){$('your-name').textContent=p.name;$('money').textContent=p.money+'$';$('pending').textContent=p.pending+p.reform;show('loss-tools',Boolean(p.lossRemaining));$('loss-count').textContent=(p.lossRemaining||0)+' asker daha seçilecek.';$('auto-loss').disabled=!myTurn()||waiting;board.lossMode=Boolean(myTurn()&&p.lossRemaining&&!waiting);$('turn-label').textContent=p.eliminated?'Elendin. Adayı izleyebilirsin.':myTurn()?'Sıra sende':(turn()?.name||'Komutan')+' oynuyor…';$('bet-troops').max=units(s,myId).length;$('bet-money').max=p.money;show('bet-section',!p.rolled);show('placement-tools',!p.lossRemaining&&p.pending+p.reform>0);$('roll').disabled=!myTurn()||p.rolled||waiting;for(const id of ['end','shop','powers','heal','auto-place'])$(id).disabled=!myTurn()||waiting||Boolean(p.lossRemaining&&id!=='end');document.querySelectorAll('[data-convert]').forEach(b=>b.disabled=!myTurn()||!p.pending||p.lossRemaining>0||waiting||Boolean(s.lock&&s.lock!==myId));show('last-result',p.rolled&&s.roll?.player===myId);if(s.roll?.player===myId)$('last-result').textContent=multiplierLabel(s.roll.value)+' → '+(s.roll.gain?s.roll.gain+' yeni asker':s.roll.lostTroops+' asker kaybı ('+(p.lossRemaining||0)+' seçim kaldı), '+s.roll.lostMoney+'$ kayıp');}
 if(s.stage==='ended'&&!endedShown){endedShown=true;const winner=s.players.find(q=>q.id===s.winner);modal('Maç sonucu',`<div class="win"><img class="trophy" src="/assets/arena/crown.png" alt=""><h1>${winner?esc(winner.name):'Beraberlik'}</h1><p>${s.round}. tur · Maç tamamlandı.</p>${summary(s)}<button id="rematch" class="primary" ${s.host!==myId?'disabled':''}>Aynı odada rövanş</button><p>${s.host!==myId?'Oda kurucusu rövanşı başlatabilir.':''}</p><button id="new-game">Ana menü</button></div>`);$('new-game').onclick=reset;$('rematch').onclick=()=>command({type:'rematch'});tone('win');}preview();coach();timer();}
function timer(){if(!state)return;const seconds=Math.max(0,Math.ceil((state.deadline-Date.now()-Math.max(0,(state.revealUntil||0)-Date.now()))/1000));$('hud').innerHTML=`<div class="turn-owner ${myTurn()?'is-mine':''}">${state.stage==='placement'?'Yerleşim sırası':state.stage==='playing'?'Hamle sırası':'Oyun durumu'}<strong>${['playing','placement'].includes(state.stage)?(turn()?.id===myId?'SIRA SENDE':esc(turn()?.name||'Bekleniyor')):state.stage==='ended'?'Oyun bitti':state.stage==='draft'?'Güç seçimi':'Hazırlık'}</strong></div><div>Tur<strong>${state.round}</strong></div><div>${state.round<=5?'Barış dönemi':'Savaş başladı'}<strong>${state.round<=5?(6-state.round)+' tur sonra savaş':'⚔ Alanını koru'}</strong></div><div class="timer">${state.stage==='draft'?'Kart seçimi':state.stage==='placement'?'Yerleşim':'Hamle süresi'}<strong>${seconds} sn</strong></div>`;if(state.stage==='countdown')document.querySelector('#countdown strong').textContent=seconds||'Başla!';}
function setHint(text){show('target-hint',!!text);document.querySelector('#target-hint span').textContent=text;show('cancel-target',!!target);}
function setTarget(t,text){target=t;board.target=t?.power===5?'missile':t?.type;setHint(text);setPane('map');$('modal').close();}
function clearTarget(){target=null;board.target=null;setHint('');}
async function cell(x,y){if(animating||Date.now()<(state?.revealUntil||0))return;if(state?.stage==='placement'){if(turn()?.id===myId)await command({type:'setup',x,y});return;}if(!myTurn())return;if(me().lossRemaining){await command({type:'dismiss',x,y});return;}if(target){const t=target;let a;if(t.type==='heal')a={type:'heal',x,y,amount:t.amount};else if(t.type==='general')a={type:'general',x,y};else a={type:'power',power:t.power,x,y};if(await command(a))clearTarget();}else if(me().pending+me().reform>0)await command({type:'place',x,y},{quiet:false});}
const sounds=new Map(), lastSample=new Map();
function battleSound(sample,fallback='power'){
 if(!soundOn)return;
 if(typeof Audio==='undefined'){tone(fallback);return;}
 if(!sounds.has(sample)){const clip=new Audio('/assets/battle/'+sample+'.ogg');clip.volume=.34;sounds.set(sample,clip);}
 const clip=sounds.get(sample),now=Date.now();
 if(now-(lastSample.get(sample)||0)<125)return;
 lastSample.set(sample,now);clip.currentTime=0;
 clip.play().catch(()=>tone(fallback));
}
let resultTimer;
function diceResult(e){
 const face=multiplierLabel(e.value);
 const summary=e.gain?e.gain+' asker kazandı':e.lostTroops?e.lostTroops+' asker geri çekilecek · '+(e.lostMoney||0)+' $ kayıp':e.lostMoney?e.lostMoney+' $ kayıp':'Kayıp yok';

 const result=$('reel-result');result.dataset.value=face;result.dataset.tone=e.value<0?'loss':e.value>=5?'rare':'win';
 result.textContent=face+' · '+(state.players.find(p=>p.id===e.player)?.name||'Komutan')+' · '+summary+(e.test?' · Yönetici testi':'');
 show('reel-result');clearTimeout(resultTimer);resultTimer=setTimeout(()=>show('reel-result',false),3000);
 battleSound(e.value<0?'lock':e.value>=5?'charge':'impact',e.value<0?'lose':'win');
}
async function reel(e){
 animating=true;
 const clicks=[];
 let animation;
 try{
  $('modal').close();clearTarget();render();
  show('reel-overlay');show('reel-result',false);show('arena-callout',false);
  const name=state.players.find(p=>p.id===e.player)?.name||'Komutan';
  $('reel-title').textContent=name+' çarkı çevirdi'+(e.test?' · Yönetici testi':'');
  const plan=reelPlan(e.value),track=$('reel-track'),move=px=>'translateX(-'+px+'px)';
  track.innerHTML=plan.cards.map((value,i)=>'<div id="reel-card-'+i+'" class="reel-card'+(value<0?' negative':'')+(Math.abs(value)===5?' rare':'')+(value===10?' legendary':'')+'">'+multiplierLabel(value)+'</div>').join('');
  const distance=plan.stopX-plan.startX;
  const duration=board.reduced?180:REEL_DURATION_MS-420;
  track.style.transform=move(plan.startX);
  if(!board.reduced){
   const frames=Array.from({length:121},(_,i)=>({offset:i/120,transform:move(plan.startX+distance*reelEase(i/120))}));
   animation=track.animate(frames,{duration,easing:'linear',fill:'forwards'});
   for(let edge=(Math.floor(plan.startX/REEL_PITCH)+1)*REEL_PITCH;edge<=plan.stopX;edge+=REEL_PITCH){
    const time=duration*(1-(1-(edge-plan.startX)/distance)**.25);
    clicks.push(setTimeout(()=>tone('tick'),time));
   }
  }
  await new Promise(resolve=>setTimeout(resolve,duration));
  track.style.transform=move(plan.stopX);animation?.cancel();animation=null;
  $('reel-card-'+plan.stop).classList.add('winner');
  diceResult(e);
  if(!board.reduced)await new Promise(resolve=>setTimeout(resolve,420));
 }finally{
  for(const timer of clicks)clearTimeout(timer);
  animation?.cancel();show('reel-overlay',false);animating=false;render();
 }
}

function shop(){if(!myTurn())return;const generals=units(state,myId).filter(([,u])=>u.hp).length;modal('Cephanelik',`<p class="shop-intro">Kasanda <b>${me().money}$</b> var. Sadece kendi hamlende alışveriş yapabilirsin.</p><div class="split" style="margin-bottom:20px"><button id="buy-general">${icon('helm')} General · ${(generals+1)*10}$</button><button id="recruit-open">${icon('flag')} 1 asker = 1$</button></div><div class="shop-grid">${POWERS.map(pow=>powerCard(pow,`<button data-buy="${pow.id}" ${me().money<pow.price?'disabled':''}>${pow.price}$ · Satın al</button>`)).join('')}</div>`);$('buy-general').disabled=generals===0;$('buy-general').title=generals===0?'Generalin kalmadığı için satın alamazsın.':'';$('buy-general').onclick=()=>setTarget({type:'general'},'Yeni general için orduna kenardan bağlı boş bir kare seç.');$('recruit-open').onclick=()=>{modal('Takviye çağır',`<p>Kasandan 1$ karşılığında 1 yerleştirme hakkı al.</p><label style="margin-top:15px">Asker sayısı<input id="recruit-amount" type="number" min="1" max="${me().money}" value="1"></label><button id="recruit-confirm" class="primary">Takviyeyi al</button>`);$('recruit-confirm').onclick=async()=>{if(await command({type:'recruit',amount:Number($('recruit-amount').value)})){$('modal').close();toast('Takviyeler hazır. Haritada kenardan büyü.');}};};document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{b.disabled=true;if(await command({type:'buy',power:Number(b.dataset.buy)})){tone('power');shop();}else b.disabled=false;});}
function inventory(){const p=me();modal('Güç çantası',`<p class="shop-intro">Güçler 3. turda, rakibe etki eden güçler 6. turda açılır. Hedefe tıklamadan kullanım hakkı harcanmaz.</p><div class="shop-grid">${POWERS.filter(pow=>p.inventory[pow.id]).map(pow=>powerCard(pow,`<button data-power="${pow.id}" ${powerBlocked(pow)?'disabled':''}>Kullan · ${p.inventory[pow.id]<0?'∞':p.inventory[pow.id]} hak</button>${powerBlocked(pow)?'<p role="status">'+esc(powerBlocked(pow))+'</p>':''}`)).join('')||'<p>Çantan boş. Cephanelikna uğrayabilirsin.</p>'}</div>`);document.querySelectorAll('[data-power]').forEach(b=>b.onclick=()=>activate(Number(b.dataset.power)));}
function powerBlocked(pow){if(!myTurn())return 'Sıra sende değil.';if(me().lossRemaining)return 'Önce kaybedilecek askerleri seç.';if(animating||Date.now()<(state.revealUntil||0))return 'Zar animasyonunun bitmesini bekle.';if(state.round<3)return 'Bu güç 3. turda açılır.';if(state.lock&&state.lock!==myId)return 'Kasa kilidi sırasında güç kullanamazsın.';if(pow.hostile&&state.round<=5)return 'Rakibe etki eden güçler 6. turda açılır.';if([9,12].includes(pow.id)&&me().rolled)return 'Bu gücü zardan önce kullan.';return ''; }
async function activate(id){const pow=POWERS.find(x=>x.id===id);const reason=powerBlocked(pow);if(reason){toast(reason);return;}if(pow.target==='cell'){setTarget({type:'power',power:id},pow.id===5?'3×3 alanın merkezini seç: birim başına 1 hasar; kendi generallerin korunur.': 'Generalinin taşınacağı boş kareyi seç. Formasyon korunur.');}else if(pow.target==='player'){modal(pow.name,`<p class="shop-intro">${esc(pow.desc)}</p>`+state.players.filter(p=>p.id!==myId&&!p.eliminated).map(p=>`<button class="target-player" data-player="${p.id}">${esc(p.name)} · ${units(state,p.id).length} asker · ${p.money}$</button>`).join(''));document.querySelectorAll('[data-player]').forEach(b=>b.onclick=async()=>{if(await command({type:'power',power:id,target:b.dataset.player}))$('modal').close();});}else if(await command({type:'power',power:id})){$('modal').close();if(id===15)toast('Askerlerini yeniden diz. Süre sonunda kalanlar eski karelerine döner.');}}
function rules(){modal('Oyun rehberi',`<ol class="rules-list"><li>Her komutan 1 general ve 9 askerle başlar. <b>Son karesini kaybeden elenir.</b> General olmadan oynamaya devam edebilirsin ama yeni general alamazsın. General zarla ölmez.</li><li>Her tam tur, hayattaki herkesin bir hamlesidir. Hamle 45 saniye. İlk 5 tur barış; savaş 6. turda.</li><li>Bahisteki asker ve dolar oyun içi kaynaktır. İkisini birlikte kullanabilirsin. Kazanç çarpanında toplam bahis × çarpan kadar asker kazanırsın. Bahis teminatı korunur. Eksi sonuçta her kaynak bahis × çarpan kadar azalır; mevcut miktarla sınırlıdır.</li><li><b>+1 %45 · −1 %35 · +2 %7,5 · −2 %7,5 · +5 %2 · −5 %2 · +10 %1.</b> Zar sonucu sunucuda belirlenir. Şerit, sunucunun belirlediği sonucu gösterir.</li><li>Kendi bağlı bölgenin kenarına asker koy; general yokken de büyüyebilirsin. Sol tuşla sürükleyerek çiz. Köşegen bağlantı sayılmaz. Eksi çarpanda silinecek askerleri sen seçersin. Generalin karesini silersen rütbesi mevcut canıyla en yakın normal askere geçer. Bağlantıyı koparamazsın; general sayısı korunur. Süre sonunda veya hamleyi bitirince kalan kayıp otomatik tamamlanır. Savaşta da bağlantıyı koparan kare yerine dış kenarlara saldır.</li><li>Rakip askerin karesine 1 asker koyarak ele geçir. Generaline her yerleştirme 1 hasar verir. General düştüğünde diğer birlikler kalır; son kare kaybedilince elenirsin.</li><li>Kazanılan 1 asker = 1$. %25/50/75/100 ile dönüştür. Süre sonunda kalan kazanç dolara döner. Kasa kilitliyse bekleyen asker olarak korunur.</li><li>Mağazadan orduna bağlı boş kareye yeni general yerleştir: (general sayısı + 1) × 10$. Kazançla kendi generalini iyileştirebilirsin; can tavanı yok.</li><li>3 karttan 2 güç seç. Güç kitabında 15 gücün etkilerini görebilirsin. Güçler 3. turda açılır; rakibe etki edenler barışta kullanılamaz.</li><li><b>Kontroller:</b> tekerlekle yakınlaştır, orta/sağ tuşla haritayı sürükle. Telefonda dokunarak yerleştir, sürükleyerek gezin, iki parmakla yakınlaştır. Harita odaklıyken oklar + Enter ile yerleştir, WASD ile gezin.</li><li>Oda kodunu yalnızca aynı sunucuya bağlananlar kullanabilir. Sekme oturumu yenilemede geri gelir. Kurucu 30 saniye yoksa bağlı başka bir oyuncu kurucu olur.</li></ol><p class="muted">Zehir ve hırsızlık generalleri öldürmez. Yeniden dizilim generalleri ve aralarındaki zorunlu bağlantıları sabit tutar; bitmeyen dizilim eski boş karelere geri yüklenir. Oyun son hayatta kalan komutanla biter; tur sınırı yok.</p><p class="muted">Sesler: Helton Yan, FREE Retro Mecha SFX (CC BY 4.0); oyun için kısaltıldı ve Ogg biçimine dönüştürüldü. Modeller: Kay Lousberg. Efekt uyarlaması: Binbun3D.</p>`);}
async function reset(){if(state?.stage==='lobby')await command({type:'leave'});sessionStorage.removeItem('kare-session');location.reload();}
$('create').onclick=()=>connect('create');$('join-form').onsubmit=e=>{e.preventDefault();connect('join');};$('join-open').onclick=()=>{const open=$('join-form').classList.contains('hidden');show('join-form',open);$('join-open').setAttribute('aria-expanded',String(open));if(open)$('code').focus();};$('bot').onclick=()=>command({type:'bot'});$('start').onclick=()=>command({type:'start'});$('manual').onchange=()=>command({type:'settings',manual:$('manual').checked});$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(state.code);toast('Oda kodu kopyalandı.');}catch{toast('Oda kodu: '+state.code);}};
$('draft-cards').onclick=e=>{const b=e.target.closest('[data-pick]');if(!b||me()?.chosen)return;const id=Number(b.dataset.pick);if(picks.includes(id))picks=picks.filter(x=>x!==id);else if(picks.length<2)picks.push(id);document.querySelectorAll('[data-pick]').forEach(c=>{const chosen=picks.includes(Number(c.dataset.pick));c.classList.toggle('selected',chosen);c.setAttribute('aria-pressed',String(chosen));});$('confirm-powers').disabled=picks.length!==2;$('confirm-powers').textContent=picks.length===2?'Seçimi onayla':'İki güç seç';tone();};$('confirm-powers').onclick=async()=>{$('confirm-powers').disabled=true;if(!await command({type:'choose',powers:picks}))$('confirm-powers').disabled=picks.length!==2;};
$('auto-loss').onclick=()=>command({type:'auto-dismiss'});
$('roll').onclick=async()=>{lastBet={troops:Number($('bet-troops').value),money:Number($('bet-money').value)};tone();$('roll').disabled=true;await command({type:'roll',troops:Number($('bet-troops').value),money:Number($('bet-money').value)});render();};$('end').onclick=async()=>{clearTarget();await command({type:'end'});};document.querySelectorAll('[data-convert]').forEach(b=>b.onclick=()=>command({type:'convert',percent:Number(b.dataset.convert)}));$('shop').onclick=shop;$('powers').onclick=inventory;$('help').onclick=rules;$('close-modal').onclick=()=>$('modal').close();$('cancel-target').onclick=clearTarget;
$('heal').onclick=()=>{modal('Generaline can ver',`<p>Her kazanılmış asker generaline 1 can ekler.</p><label style="margin-top:15px">Verilecek can<input id="heal-amount" type="number" min="1" max="${me().pending}" value="1"></label><button id="heal-next" class="primary">Haritadan general seç</button>`);$('heal-next').onclick=()=>{const amount=Number($('heal-amount').value);if(!Number.isInteger(amount)||amount<1||amount>me().pending){toast('Geçerli bir can miktarı gir.');return;}setTarget({type:'heal',amount},amount+' can vermek için kendi generalini seç.');};};
$('auto-place').onclick=async()=>{$('auto-place').disabled=true;await command({type:'auto-place'});render();};
$('focus').onclick=()=>board.focus(myId);$('fit').onclick=()=>board.fit();$('zoom-in').onclick=()=>board.zoomBy(1.25);$('zoom-out').onclick=()=>board.zoomBy(1/1.25);$('sound').onclick=()=>{soundOn=!soundOn;localStorage.setItem('kare-sound',soundOn?'on':'off');$('sound').innerHTML=icon(soundOn?'sound':'muted');$('sound').setAttribute('aria-pressed',String(soundOn));toast(soundOn?'Ses açık':'Ses kapalı');tone();};$('sound').innerHTML=icon(soundOn?'sound':'muted');$('sound').setAttribute('aria-pressed',String(soundOn));$('exit').onclick=()=>{modal('Maçtan ayrıl',`<p>Aktif oyunda sıran süre dolunca geçer. Bu sekmeyi kapatmak oturumunu hemen silmez. Ana menüye dönersen yeni bir komutan olarak başlayacaksın.</p><button id="exit-confirm" style="margin-top:20px">Ana menüye dön</button>`);$('exit-confirm').onclick=reset;};
async function poll(){if(!token||polling)return;polling=true;try{const r=await request('state');if(connectionFailures){document.querySelector('.connection')?.remove();toast('Bağlantı geri geldi.');}connectionFailures=0;update(r,!state);}catch(e){connectionFailures++;if(connectionFailures===2){const el=document.createElement('div');el.className='connection';el.textContent='Bağlantı bekleniyor… Oyun sunucusunu açık tut.';document.body.appendChild(el);}if(!token){state=null;previousStage='';document.body.dataset.stage='menu';menuMotion(true);for(const id of ['lobby','draft','countdown','hud','roster','actions','map-controls','exit','target-hint','arena-callout'])show(id,false);show('welcome');$('modal').close();toast(e.message);}}finally{polling=false;}}
setInterval(poll,420);setInterval(timer,250);if(token)void poll();

function preview(){if(!state||!me())return;const limit=units(state,myId).length,p=me(),locked=state.lock&&state.lock!==myId;$('troop-slider').max=limit;$('money-slider').max=locked?0:p.money;$('troop-slider').value=$('bet-troops').value;$('money-slider').value=$('bet-money').value;const disabled=!myTurn()||p.rolled||animating||Date.now()<(state.revealUntil||0)||Boolean(p.lossRemaining);for(const id of ['troop-slider','money-slider','preset-1','preset-2','preset-3','preset-4','last-bet','skip-roll'])$(id).disabled=disabled;$('bet-badges').textContent=[p.double?'×2 Çifte kazanç':'',p.lucky?'Eksi kaybı korunuyor':'',locked?'Kasa kilitli':''].filter(Boolean).join(' · ');$('bet-formula').textContent='('+ $('bet-troops').value+' + '+$('bet-money').value+') × 2'+(p.double?' × 2':'')+' = '+((Number($('bet-troops').value)+Number($('bet-money').value))*2*(p.double?2:1))+' asker (+2 sonucu)';document.body.dataset.theme=state.theme||'technology';const rows=betPreview(state,myId,Number($('bet-troops').value),Number($('bet-money').value));$('bet-preview').innerHTML=rows?rows.map(v=>'<span><b>'+multiplierLabel(v.value)+'</b> '+(v.value>0?v.gain+' asker kazan':'−'+v.loss+' asker / −'+v.money+'$')+'</span>').join(''):'Geçerli bir bahis gir.';}
$('bet-troops').oninput=preview;$('bet-money').oninput=preview;
function summary(s){return '<div class="match-summary">'+s.players.map(p=>{const q=p.stats||{};return '<p><b>'+esc(p.name)+'</b><br>En büyük kazanç: '+(q.bestGain||0)+' · Ele geçirilen kare: '+(q.captures||0)+' · Hasar: '+(q.damage||0)+' · General aktarımı: '+(q.rescues||0)+'</p>';}).join('')+'</div>';}
function coach(){if(localStorage.getItem('kare-coach')==='done'||!state)return;const p=me();show('coach',['placement','playing'].includes(state.stage));$('coach-text').textContent=state.stage==='placement'?'1 · Sıran gelince boş bir alana dokun: 1 general ve 9 asker yerleşir.':p.lossRemaining?'Kaybı seç: bağlantıyı koparmayan bir askere dokun. General aktarımını haritada izle.':p.pending?'Yerleştir: haritada ordunun kenarındaki boş karelere dokun.':!p.rolled?'Asker veya dolar seç. Olası sonuçları inceleyip çarkı çevir.':'Güç çantasını aç. Uygun bir gücü seç; hedef isteyen güçte haritaya dokun. Güçler 3. turda açılır.';}
$('coach-hide').onclick=()=>{localStorage.setItem('kare-coach','done');show('coach',false);};

function renderCosmetics(){
 const p=me(),container=$('cosmetic-selection');
 const occupied=state.players.filter(q=>q.id!==p.id).map(q=>q.generalSkin);
 const signature=[p.generalSkin,p.chosen,...occupied].join(':');
 if(container.dataset.selection===signature)return;
 container.dataset.selection=signature;
 const generals=GENERALS.map(g=>'<button data-skin="'+g.id+'" '+(p.chosen||occupied.includes(g.id)?'disabled ':'')+'aria-pressed="'+(p.generalSkin===g.id)+'" style="--unit-color:'+g.color+'"><img src="'+g.portrait+'" alt="" width="128" height="128"><b>'+g.name+'</b>'+(occupied.includes(g.id)?'<small>Seçildi</small>':'')+'</button>');
 container.innerHTML='<h2>Generalini seç</h2><div class="general-options">'+generals.join('')+'</div>';
 container.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>command({type:'cosmetic',skin:b.dataset.skin}));
}

function setBet(t,m){if(!me())return;const locked=state.lock&&state.lock!==myId;$('bet-troops').value=Math.max(0,Math.min(units(state,myId).length,Math.floor(t)||0));$('bet-money').value=locked?0:Math.max(0,Math.min(me().money,Math.floor(m)||0));preview();}
$('troop-slider').oninput=()=>setBet(Number($('troop-slider').value),Number($('bet-money').value));$('money-slider').oninput=()=>setBet(Number($('bet-troops').value),Number($('money-slider').value));
for(let i=1;i<=4;i++)$('preset-'+i).onclick=()=>setBet(units(state,myId).length*i/4,me().money*i/4);
$('last-bet').onclick=()=>{if(lastBet)setBet(lastBet.troops,lastBet.money);else toast('Bu oturumda henüz bahis yok.');};$('skip-roll').onclick=()=>command({type:'end'});
$('bet-section').onkeydown=e=>{if(!myTurn()||me().rolled||animating||e.altKey||e.ctrlKey||e.metaKey)return;const id=e.target.id;if(e.key==='Enter'){if(e.target.tagName==='BUTTON'||e.target.tagName==='SUMMARY')return;e.preventDefault();if(!$('roll').disabled)$('roll').onclick();return;}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const money=['money-slider','bet-money'].includes(id),delta=(e.key==='ArrowRight'?1:-1)*(e.shiftKey?5:1);setBet(Number($('bet-troops').value)+(money?0:delta),Number($('bet-money').value)+(money?delta:0));}else if(!['bet-troops','bet-money'].includes(id)){if(/^[1-4]$/.test(e.key)){e.preventDefault();$('preset-'+e.key).onclick();}if(e.key.toLowerCase()==='r'){e.preventDefault();$('last-bet').onclick();}}};

installArena({modal,rules,powerCard,play:() => connect('create',true)});
installAdmin(()=>state?.code);
