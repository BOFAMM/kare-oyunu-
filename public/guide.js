import {neighbors,units,connected} from './rules.js';
const $=id=>document.getElementById(id);
const panel=$('live-guide'),hand=$('guide-hand'),toggle=$('guide-switch'),body=$('guide-body'),find=$('guide-find');
let read,enabled=localStorage.getItem('kare-coach')!=='done',destination,lesson='',seenPower=false;
globalThis.kareGuide=provider=>{read=provider;refresh();};
toggle.onclick=()=>{enabled=!enabled;localStorage.setItem('kare-coach',enabled?'on':'done');refresh();};
find.onclick=()=>destination?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
function advice({state:s,p,mine,target,picks,board,animating}){
 const stage=s.stage;
 if(stage==='draft'){
  if(p.chosen)return ['Takım hazır. Diğer komutanların seçimleri bekleniyor.'];
  if(!p.generalSkin)return ['Önce ordunun başına bir general seç.','[data-skin]:not(:disabled)'];
  if(picks.length<2)return [picks.length?'Bir güç daha seç.':'Üç karttan ilk gücünü seç.','[data-pick][aria-pressed=false]'];
  return ['Seçimini onayla ve arenaya gir.','#confirm-powers'];
 }
 if(s.mode==='siege'&&stage==='playing'){
  if(p.eliminated)return ['Ordun elendi. Mücadeleyi haritadan takip edebilirsin.'];
  if(target)return [$('target-hint').textContent||'Haritada hedefini seç.','#board'];
  if(p.pending||p.reform)return [s.siege?.war?'Savaş başladı. Lazerin içine doğru yerleş veya rakibin dış kenarına saldır.':'Gelişme zamanı. Ordunun kenarındaki boş kareye dokunarak asker yerleştir.','#siege-auto'];
  return ['Yeni asker hazırlanıyor. Marketi açarak kaynaklarını ve kart seçeneklerini incele.','#siege-market'];
 }
 if(!mine)return [p.eliminated?'Ordun elendi. Kalan komutanların hamlelerini izleyebilirsin.':'Şimdi rakibin sırası. Sıra sana geçtiğinde ilk hamleni göstereceğim.'];
 if(stage==='placement')return ['Ordun için boş bir 2 × 5 alan seç. İlk kare generalinin yeri.','#board'];
 if(animating||Date.now()<s.revealUntil)return ['Çark durunca sonucu ve yapabileceğin hamleyi burada göreceksin.'];
 if(target)return [$('target-hint').textContent||'Haritada gücün için bir hedef seç.','#board'];
 if(p.lossRemaining)return [p.lossRemaining+' asker kaybın var. Dış kenardan seç veya otomatik kayıp düğmesini kullan.','#auto-loss'];
 if(p.pending||p.reform){
  const army=units(s,p.id),front=army.some(([,u])=>u.hp)?connected(s,p.id):new Set(army.map(([k])=>k));
  const mobilePane=matchMedia('(max-width:860px)').matches&&document.body.dataset.pane!=='map';
  if(mobilePane)return ['Kazandığın askeri yerleştirmek için Harita sekmesine geç.','#mobile-dock [data-pane=map]'];
  for(const key of front){const [x,y]=key.split(',').map(Number);
   for(const [nx,ny] of neighbors(x,y)){if(nx<0||ny<0||nx>=50||ny>=50||s.board[nx+','+ny])continue;
    const pt=board.point(nx,ny);
    if(document.elementFromPoint(pt.x,pt.y)===$('board'))return ['Gösterilen boş kareye dokun. Ordun kenardan bir kare büyür.','#board',pt];
   }
  }
  return ['Ordunu ekrana ortala, sonra kenarından büyüt.','#focus'];
 }
 if(!p.rolled){
  if(!(Number($('bet-troops').value)+Number($('bet-money').value)))return ['Kaç askeri riske edeceğini seç. İlk deneme için 1 asker yeterli.','#bet-troops'];
  return ['Bahsin hazır. Çarkı çevir ve sonucu izle.','#roll'];
 }
 if(s.round>=3&&!seenPower&&Object.values(p.inventory||{}).some(v=>v!==0))return ['Güç çantanı incele. Kartı kullanabilir veya turu bitirebilirsin.','#powers'];
 return ['Hamlen tamam. Sırayı sonraki komutana ver.','#end'];
}
$('powers').addEventListener('click',()=>{seenPower=true;});
function refresh(){
 hand.hidden=true;
 const data=read?.(),stage=document.body.dataset.stage;
 const dialog=document.querySelector('dialog[open]'),title=$('modal-title').textContent;
 const modalAdvice=dialog?.id==='modal'&&(
  title==='Cephanelik'?['Takviye almak için asker sayısını seç veya aşağıdaki kartlardan birini satın al.','#recruit-open']:
  title==='Takviye çağır'?['Asker sayısını gir ve takviyeyi onayla.','#recruit-confirm']:
  title==='Güç çantası'?(document.querySelector('[data-power]:not(:disabled)')?['Kullanılabilir bir güce dokun. Hedef gerekirse sonraki adımda seçersin.','[data-power]:not(:disabled)']:['Şu anda kullanılabilir güç yok. Maça dön.','#close-modal']):
  dialog.querySelector('.target-player')?['Gücün uygulanacağı rakibi seç.','.target-player']:null);
 panel.hidden=!data?.p||!['draft','placement','playing'].includes(stage)||Boolean(dialog&&!modalAdvice);
 if(panel.hidden)return;
 const parent=modalAdvice?dialog:stage==='draft'?document.querySelector('.draft-wrap'):document.body;
 if(panel.parentNode!==parent){if(modalAdvice)parent.querySelector('.modal-head').after(panel);else if(stage==='draft')parent.prepend(panel);else parent.append(panel);}
 if(hand.parentNode!==(dialog||document.body))(dialog||document.body).append(hand);
 toggle.setAttribute('aria-expanded',String(enabled));body.hidden=!enabled;
 if(!enabled)return;
 let [text,selector,point]=modalAdvice||advice(data);
 let el=selector&&document.querySelector(selector);
 if(el?.closest('#actions')&&matchMedia('(max-width:860px)').matches&&document.body.dataset.pane!=='actions'){
  text='Hamle sekmesini aç. '+text;el=document.querySelector('#mobile-dock [data-pane=actions]');
 }
 if(lesson!==text){$('guide-step').textContent=text;lesson=text;}
 destination=el;find.hidden=true;if(!el)return;
 const r=el.getBoundingClientRect(),x=point?.x??(r.left+r.width*.45),y=point?.y??(r.top+r.height*.5);
 if(!el.contains(document.elementFromPoint(x,y))){find.hidden=!r.width;return;}
 hand.style.left=Math.min(innerWidth-34,Math.max(0,x))+'px';hand.style.top=Math.min(innerHeight-42,Math.max(0,y))+'px';hand.hidden=false;
}
setInterval(refresh,240);
