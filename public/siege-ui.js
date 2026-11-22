import {SIEGE,SIEGE_POWERS} from './siege-rules.js';
import {units} from './rules.js';
const $=id=>document.getElementById(id);
const pic=(key,cls='')=>'<img class="'+cls+'" alt="" src="/assets/siege/'+key+'.webp">';
const time=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
export function setupSiege({read,command,modal,setTarget,activate,powerBlocked,esc,toast,select}){
 let classicBook;
 let offset=0,handKey='',wasWar=null,room='',alarmTimeout,view='';
 function mode(siege){
  classicBook??=$('guide-powers').onclick;
  $('guide-powers').onclick=siege?()=>modal('Kuşatma güç kitabı','<div class="siege-catalog">'+SIEGE_POWERS.map(c=>'<article>'+pic('card-'+c.id)+'<div><h3>'+esc(c.name)+'</h3><p>'+esc(c.desc)+'</p><small>'+c.price+' $</small></div></article>').join('')+'</div>'):classicBook;
  select(siege?'siege':'classic');document.body.dataset.selection=siege?'siege':'classic';
  $('mode-siege').setAttribute('aria-pressed',String(siege));$('mode-classic').setAttribute('aria-pressed',String(!siege));
  $('quick-play').querySelector('strong').textContent=siege?'Kuşatmaya gir':'Meydana çık';
  document.querySelector('.camp-facts span:nth-child(2)').lastChild.textContent=siege?'2 dk hazırlık':'45 sn / hamle';
 }
 $('mode-siege').onclick=()=>mode(true);$('mode-classic').onclick=()=>mode(false);
 function sync(now){if(Number.isFinite(now))offset=now-Date.now();}
 function rules(){
  modal('Kuşatma kılavuzu','<ol class="rules-list"><li><b>Hazırlık · 2 dakika</b> — Herkes aynı anda oynar. Ordunun kenarına dokun, kart satın al, generallerini güçlendir.</li><li><b>İkmal</b> — Her 20 saniyede 40 $ gelir. Her 4 saniyede bir asker hazır olur. Marketten 600 $ karşılığı üretim süresini 2 saniyeye indir.</li><li><b>Savaş</b> — Rakibin bitişik karesine asker yerleştir. Bir ordunun bağlantısını koparan kareyi ele geçiremezsin.</li><li><b>Lazer sınırı</b> — Her 15 saniyede dört kenardan bir kare daralır. İki katman dışarıda kalan asker ölür. General her zehir darbesinde 5 can kaybeder.</li><li><b>General</b> — Yeni general ödediğin dolar kadar canla doğar. Marketten 1 $ karşılığı generaline 1 can ekleyebilirsin.</li></ol>');
 }
 function clock(){
  const {s,p}=read(),zone=s?.siege;if(!zone||!p)return;
  const now=Date.now()+offset,seconds=end=>Math.max(0,Math.ceil((end-now)/1000));
  const interval=(p.haste?SIEGE.troopMs/2:SIEGE.troopMs)/1000;
  for(const [kind,period,end,label] of [['income',SIEGE.incomeMs/1000,zone.nextIncome,'+40 $'],['troop',interval,p.nextTroop,p.bonusTroops?'+2 asker':'+1 asker']]){
   const bar=$('siege-'+kind),remain=seconds(end);
   bar.max=period;bar.value=Math.max(0,period-remain);
   $('siege-'+kind+'-text').textContent=label+' · '+remain+' sn';
  }
  const next=zone.war?zone.nextShrink:zone.warAt;
  $('hud').innerHTML='<div><strong>'+(zone.inset>=25?'Son zehir':zone.war?'Lazer sınırı':'Hazırlık')+'</strong></div><div><strong>'+time(seconds(next))+'</strong></div>';
 }
 function summary(){
  const {s}=read();return '<ul class="siege-report">'+s.players.map(q=>'<li>'+esc(q.name)+' · '+units(s,q.id).length+' kare · '+q.money+' $</li>').join('')+'</ul>';
 }
 function render(){
  const {s,p,id}=read(),playing=s.stage==='playing'&&!!s.siege;
  $('siege-deck').hidden=!playing;
  if(s.stage==='lobby')document.querySelector('#lobby h2').textContent='Kuşatma kampı';
  if(!playing){wasWar=null;handKey='';return;}
  if(room!==s.code){room=s.code;wasWar=null;handKey='';}
  if(s.siege.war&&wasWar===false){$('siege-alarm').hidden=false;clearTimeout(alarmTimeout);alarmTimeout=setTimeout(()=>{$('siege-alarm').hidden=true;},2400);}
  wasWar=s.siege.war;
  const army=units(s,id),generals=army.filter(([,u])=>u.hp>0).length;
  $('siege-cash').textContent=p.money;$('siege-army').textContent=army.length-generals;$('siege-generals').textContent=generals;
  $('siege-reserve').textContent=p.pending+p.reform;
  $('siege-auto').disabled=p.eliminated||s.siege.inset>=25||!(p.pending+p.reform);
  $('siege-market').disabled=p.eliminated||s.siege.inset>=25;
  const hand=SIEGE_POWERS.filter(card=>p.inventory[card.id]);
  const signature=hand.map(card=>[card.id,p.inventory[card.id],powerBlocked(card)]).join('|');
  if(signature!==handKey||!$('siege-hand').childElementCount){
   handKey=signature;
   $('siege-hand').innerHTML=hand.map(c=>'<button class="siege-hand-card" data-card="'+c.id+'" aria-label="'+esc(c.name)+', '+(p.inventory[c.id]<0?'sınırsız':p.inventory[c.id])+' kullanım">'+pic('card-'+c.id)+'<span>'+esc(c.name)+'</span><b>'+(p.inventory[c.id]<0?'∞':p.inventory[c.id])+'</b></button>').join('')||'<small class="siege-empty">Kart almak için markete dokun.</small>';
  }
  if(view==='market'&&$('modal').open)prices();
  clock();
 }
 function prices(){
  const {s,p,id}=read(),count=units(s,id).filter(([,u])=>u.hp).length;
  for(const b of $('modal-body').querySelectorAll('[data-price]')){
   const price=b.id==='siege-buy-general'?(count+1)*10:Number(b.dataset.price);
   b.disabled=p.eliminated||s.siege.inset>=25||p.money<price||(b.id==='siege-haste'&&p.haste);
   if(b.id==='siege-buy-general')b.querySelector('small').textContent=price+' $ · '+price+' can';
   if(b.id==='siege-haste'&&p.haste)b.querySelector('small').textContent='2× üretim etkin';
  }
  const cash=$('siege-wallet');if(cash)cash.textContent=p.money+' $';
 }
 function shop(){
  const {s,p}=read();if(p.eliminated||s.stage!=='playing')return;
  const item=(id,img,name,label,price)=>'<button id="'+id+'" data-price="'+price+'">'+pic(img)+'<span>'+name+'<small>'+label+'</small></span></button>';
  modal('Saha marketi','<p class="siege-wallet">'+pic('cash')+' Kasa <b id="siege-wallet"></b></p><div class="siege-market-grid">'+item('siege-haste','upgrade','Çifte üretim','600 $ · kalıcı',600)+item('siege-buy-general','general','General çağır','',10)+item('siege-heal','general','General iyileştir','1 $ / can',1)+item('siege-recruit','soldier','Asker al','1 $ / asker',1)+'</div><h3>Güç kartları</h3><div class="siege-catalog">'+SIEGE_POWERS.map(c=>'<article>'+pic('card-'+c.id)+'<div><h3>'+esc(c.name)+'</h3><p>'+esc(c.desc)+'</p><button data-buy="'+c.id+'" data-price="'+c.price+'">'+c.price+' $ · Satın al</button></div></article>').join('')+'</div>');
  view='market';prices();
  $('siege-haste').onclick=async e=>{e.currentTarget.disabled=true;if(await command({type:'haste'}))toast('Asker üretimi iki kat hızlandı.');prices();};
  $('siege-buy-general').onclick=()=>setTarget({type:'general'},'General için orduna bağlı boş kareyi seç.');
  $('siege-recruit').onclick=()=>quantity(false);$('siege-heal').onclick=()=>quantity(true);
  for(const b of $('modal-body').querySelectorAll('[data-buy]'))b.onclick=async()=>{b.disabled=true;if(await command({type:'buy',power:Number(b.dataset.buy)}))toast('Kart satın alındı.');prices();};
 }
 function quantity(heal){
  view='';const {p}=read();modal(heal?'Generaline can ver':'Takviye satın al','<form id="siege-quantity"><label>'+(heal?'Can miktarı':'Asker sayısı')+'<input type="number" inputmode="numeric" required min="1" step="1" max="'+p.money+'" value="1"></label><p>Her birim 1 $. Kasanda '+p.money+' $ var.</p><button class="primary">'+(heal?'Generali seç':'Takviye al')+'</button></form>');
  $('siege-quantity').onsubmit=async e=>{e.preventDefault();const amount=Number(e.target.querySelector('input').value);
   if(heal)setTarget({type:'heal',amount},'İyileştirmek için kendi generaline dokun.');
   else if(await command({type:'recruit',amount}))$('modal').close();
  };
 }
 $('siege-market').onclick=shop;
 $('siege-orders').onclick=()=>modal('Sahadaki ordular',summary());
 $('siege-auto').onclick=()=>command({type:'auto-place'});
 $('siege-hand').onclick=e=>{
  const b=e.target.closest('[data-card]');if(!b)return;const c=SIEGE_POWERS.find(c=>c.id===Number(b.dataset.card)),reason=powerBlocked(c);view='';
  modal(c.name,'<div class="siege-card-detail">'+pic('card-'+c.id)+'<div><p>'+esc(c.desc)+'</p><button id="siege-use" class="primary" '+(reason?'disabled':'')+'>Gücü kullan</button>'+(reason?'<p>'+esc(reason)+'</p>':'')+'</div></div>');
  $('siege-use').onclick=()=>activate(c.id);
 };
 $('modal').addEventListener('close',()=>{view='';});
 function feedback(events){
  const {s,id}=read();
  // Personal action feedback stays readable while other armies place simultaneously.
  const event=events.filter(e=>e.type==='eliminate'||(e.player===id&&['power','buy','hit','heal','promote','haste','place','recruit'].includes(e.type))).at(-1);
  if(!event)return null;
  const card=SIEGE_POWERS.find(c=>c.id===event.power);
  const names={power:[card?.name||'Güç kullanıldı','spark'],buy:['Kart alındı','chest'],hit:[event.capture?'Kare ele geçirildi!':'İsabet!','sword'],heal:['General iyileşti','heart'],promote:['Yeni general!','helm'],haste:['Çifte üretim!','time'],place:['Alan genişledi!','grid'],recruit:['Takviye hazır!','flag'],eliminate:['Komutan elendi','shield']};
  const [title,badge]=names[event.type],owner=s.players.find(p=>p.id===event.player)?.name||'Komutan';
  return {title,badge,detail:event.type==='place'?owner+' · +'+(event.count||1)+' kare':event.type==='buy'?card?.name||owner:owner,tone:['hit','eliminate'].includes(event.type)?'danger':'gold'};
 }
 return {sync,render,clock,summary,shop,rules,feedback};
}
