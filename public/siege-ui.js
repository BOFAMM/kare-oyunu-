import {SIEGE,SIEGE_POWERS} from './siege-rules.js';
import {units} from './rules.js';
const $=id=>document.getElementById(id);
const pic=(key,cls='')=>'<img class="'+cls+'" alt="" src="/assets/siege/'+key+'.webp">';
const time=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
export function setupSiege({read,command,modal,setTarget,activate,powerBlocked,esc,toast,tone,select}){
 let classicBook;
 let offset=0,handKey='',wasWar=null,room='',alarmTimeout,view='';
 function mode(siege){
  classicBook??=$('guide-powers').onclick;
  $('guide-powers').onclick=siege?()=>modal('Kuşatma güç kitabı','<div class="siege-catalog">'+SIEGE_POWERS.map(c=>'<article>'+pic('card-'+c.id)+'<div><h3>'+esc(c.name)+'</h3><p>'+esc(c.desc)+'</p><small>'+c.price+' $</small></div></article>').join('')+'</div>'):classicBook;
  select(siege?'siege':'classic');document.body.dataset.selection=siege?'siege':'classic';
  $('mode-siege').setAttribute('aria-pressed',String(siege));$('mode-classic').setAttribute('aria-pressed',String(!siege));
  $('quick-play').querySelector('strong').textContent=siege?'Kuşatmaya gir':'Meydana çık';
  document.querySelector('.camp-facts span:nth-child(2)').lastChild.textContent=siege?'3 dk hazırlık':'45 sn / hamle';
 }
 $('mode-siege').onclick=()=>mode(true);$('mode-classic').onclick=()=>mode(false);
 function sync(now){if(Number.isFinite(now))offset=now-Date.now();}
 function rules(){
  modal('Kuşatma kılavuzu','<ol class="rules-list"><li>Herkes karargâhını aynı anda seçer. İlk seçim yerini alır. Çakışan ordu en yakın uygun alana yerleşir.</li><li>Herkes hazır olunca 10 saniyelik geri sayım başlar. Ardından üç dakika boyunca asker satın alabilir, yerleşebilir ve generallerini iyileştirebilirsin.</li><li>25 saniyede 20 $ gelir. Asker üretimi yoktur. Bir asker veya bir can 1 $ tutar.</li><li>Savaşta saldırmak için sahada generalin olmalı. General kaybedersen marketten yenisini çağır.</li><li>Lazer 45 saniyede bir farklı bir odağa doğru daralır. İki halka dışarıda kalan asker ölür; general her darbede 5 can kaybeder.</li></ol>');
 }
 let lastSecond=-1,stage='',notice='';
 function alarm(title,detail){
  const el=$('siege-alarm');el.querySelector('strong').textContent=title;el.querySelector('span').textContent=detail;
  el.hidden=false;clearTimeout(alarmTimeout);alarmTimeout=setTimeout(()=>el.hidden=true,3400);
  tone('turn');setTimeout(()=>tone('win'),190);
 }
 function blockAttack(){
  const {s,id,p}=read();if(p.eliminated||units(s,id).some(([,u])=>u.hp>0))return false;
  const el=$('siege-general-warning');el.hidden=false;el.animate([{transform:'translateX(0)'},{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'translateX(0)'}],{duration:280});tone('block');return true;
 }
 $('siege-ready').onclick=()=>command({type:'ready'});
 function clock(){
  const {s,p}=read();if(!s||!p)return;
  const now=Date.now()+offset,seconds=end=>Math.max(0,Math.ceil((end-now)/1000));
  if(s.stage==='countdown'){
   const n=seconds(s.deadline),el=$('countdown').querySelector('strong');
   if(n!==lastSecond){el.textContent=n;lastSecond=n;tone('tick');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:350});}
   return;
  }
  if(s.stage==='placement'){$('hud').textContent=s.players.filter(q=>q.ready).length+' / '+s.players.length+' hazır';return;}
  const zone=s.siege;if(!zone)return;
  const bar=$('siege-income'),remain=seconds(zone.nextIncome);bar.max=SIEGE.incomeMs/1000;bar.value=Math.max(0,bar.max-remain);
  $('siege-income-text').textContent='+20 $ · '+remain+' sn';
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
  const placing=s.stage==='placement',prior=stage;stage=s.stage;
  $('siege-spawn').hidden=!placing;
  if(placing){
   const sp=p.spawn,chosen=!!sp;
   $('siege-ready').hidden=!chosen;$('siege-ready').disabled=!!p.ready;$('siege-ready').textContent=p.ready?'Hazırsın':'Hazırım';
   $('siege-spawn-note').textContent=p.ready?'Diğer komutanlar hazırlanıyor.':!chosen?'Haritada ordunun yerleşeceği kareye dokun.':sp.moved?'Seçtiğin ('+(sp.requestedX+1)+', '+(sp.requestedY+1)+') alanı önceki komutanın karargâhıyla çakıştı. Ordun en yakın boş konuma taşındı: ('+(sp.x+1)+', '+(sp.y+1)+'). Konumunu onayla.':'Karargâhın yerleşti. Başlamak için hazır olduğunu bildir.';
   $('siege-spawn').classList.toggle('relocated',!!sp?.moved&&!p.ready);
   const key=s.code+':'+sp?.x+','+sp?.y;if(sp&&notice!==key){notice=key;if(sp.moved)tone('block');}
  }
  if(!playing){wasWar=null;handKey='';$('siege-general-warning').hidden=true;if(s.stage!=='countdown')lastSecond=-1;clock();return;}
  if(room!==s.code){room=s.code;wasWar=null;handKey='';}
  if(prior==='countdown'&&!s.siege.war)alarm('Savaş başladı!','I · HAZIRLIK · 3 dakika · Saldırılar kapalı');
  if(s.siege.war&&wasWar===false)alarm('Savaş başladı!','II · ÇARPIŞMA · Saldırılar açıldı · Lazer 45 saniyede daralır');
  wasWar=s.siege.war;
  const army=units(s,id),generals=army.filter(([,u])=>u.hp>0).length;
  $('siege-general-warning').hidden=p.eliminated||generals>0;
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
   b.disabled=p.eliminated||s.siege.inset>=25||p.money<price||(b.id==='siege-heal'&&count===0);
   if(b.id==='siege-buy-general')b.querySelector('small').textContent=price+' $ · '+price+' can';
  }
  const cash=$('siege-wallet');if(cash)cash.textContent=p.money+' $';
 }
 function shop(){
  const {s,p}=read();if(p.eliminated||s.stage!=='playing')return;
  const item=(id,img,name,label,price)=>'<button id="'+id+'" data-price="'+price+'">'+pic(img)+'<span>'+name+'<small>'+label+'</small></span></button>';
  modal('Saha marketi','<p class="siege-wallet">'+pic('cash')+' Kasa <b id="siege-wallet"></b></p><div class="siege-market-grid">'+item('siege-buy-general','general','General çağır','',10)+item('siege-heal','general','General iyileştir','1 $ / can',1)+item('siege-recruit','soldier','Asker al','1 $ / asker',1)+'</div><h3>Güç kartları</h3><div class="siege-catalog">'+SIEGE_POWERS.map(c=>'<article>'+pic('card-'+c.id)+'<div><h3>'+esc(c.name)+'</h3><p>'+esc(c.desc)+'</p><button data-buy="'+c.id+'" data-price="'+c.price+'">'+c.price+' $ · Satın al</button></div></article>').join('')+'</div>');
  view='market';prices();
  $('siege-buy-general').onclick=()=>setTarget({type:'general'},'General için orduna bağlı boş kareyi seç.');
  $('siege-recruit').onclick=()=>quantity(false);$('siege-heal').onclick=()=>quantity(true);
  for(const b of $('modal-body').querySelectorAll('[data-buy]'))b.onclick=async()=>{b.disabled=true;if(await command({type:'buy',power:Number(b.dataset.buy)}))toast('Kart satın alındı.');prices();};
 }
 function quantity(heal){
  view='';const {p}=read();let amount=1;modal(heal?'Generaline can ver':'Takviye satın al','<form id="siege-quantity"><div class="siege-counter">'+pic(heal?'general':'soldier')+'<output>1</output><b>'+(heal?'can':'asker')+'</b></div><div class="siege-steps">'+[-10,-1,1,10].map(n=>'<button type="button" data-delta="'+n+'">'+(n>0?'+':'')+n+'</button>').join('')+'<button type="button" data-all>Tümü</button></div><p>Her birim 1 $. Kasanda '+p.money+' $ var.</p><button type="submit" class="primary">'+(heal?'Generali seç':'Takviye al')+'</button></form>');
  const form=$('siege-quantity'),out=form.querySelector('output');
  form.onclick=e=>{const button=e.target.closest('[data-delta],[data-all]');if(!button)return;const max=read().p.money;amount=button.hasAttribute('data-all')?max:Math.min(max,Math.max(1,amount+Number(button.dataset.delta)));out.textContent=amount;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)out.animate([{scale:'1.17'},{scale:'1'}],{duration:150});};
  form.onsubmit=async e=>{e.preventDefault();if(amount<1||amount>read().p.money)return;
   if(heal)setTarget({type:'heal',amount},'İyileştirmek için kendi generaline dokun.');
   else if(await command({type:'recruit',amount}))$('modal').close();
  };
 }
 $('siege-market').onclick=shop;
 $('siege-orders').onclick=()=>modal('Sahadaki ordular',summary());
 $('siege-auto').onclick=()=>command({type:'auto-place'});
 $('siege-hand').onclick=e=>{
  const b=e.target.closest('[data-card]');if(!b)return;const c=SIEGE_POWERS.find(c=>c.id===Number(b.dataset.card));if(c.hostile&&blockAttack())return;const reason=powerBlocked(c);view='';
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
 return {blockAttack,sync,render,clock,summary,shop,rules,feedback};
}
