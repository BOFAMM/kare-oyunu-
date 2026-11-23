import {guideAdvice} from './guide-model.js';
import {POWERS,units} from './rules.js';
import {SIEGE_POWERS} from './siege-rules.js';
const $=id=>document.getElementById(id);
const panel=$('live-guide'),hand=$('guide-hand'),toggle=$('guide-switch'),body=$('guide-body'),find=$('guide-find');
const face=$('guide-face'),headline=$('guide-title'),step=$('guide-step'),spoken=$('guide-spoken');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let read,enabled=localStorage.getItem('kare-coach')!=='done',destination,tile,lastLine='',frame=0,room,sequence,reply,cache;
globalThis.kareGuide=provider=>{read=provider;refresh();};
toggle.onclick=()=>{
 enabled=!enabled;localStorage.setItem('kare-coach',enabled?'on':'done');
 if(!enabled){cancelAnimationFrame(frame);lastLine='';}
 refresh();
};
find.onclick=()=>{
 if(tile){const b=read()?.board;if(b)b.center(...tile,Math.max(.75,b.zoom));}
 else destination?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 refresh();
};
const cue=(title,text,selector,mood='calm')=>({title,text,selector,mood});
function modalLesson(dialog,data){
 if(dialog.id!=='modal')return null;
 const title=$('modal-title').textContent,s=data.state,p=data.p;
 if(s.stage==='ended')return guideAdvice(data);
 if($('siege-quantity'))return cue('Takviye miktarı','Artı ve eksi düğmeleriyle istediğin miktarı ayarla. Hazır olunca altın düğmeye dokun.','#siege-quantity button[type=submit]');
 if($('siege-recruit')){
  const choice=!units(s,p.id).some(([,u])=>u.hp)&&!$('siege-buy-general').disabled?'#siege-buy-general':!$('siege-recruit').disabled?'#siege-recruit':null;
  return choice?cue('Saha marketi',choice==='#siege-recruit'?'Asker al düğmesi yedek birliğini doldurur. Aynı ürünü tekrar almak için 30 saniye gerekir.':'Sahada generalin yok. General çağır düğmesine dokun, sonra haritada yerini seç.',choice):cue('Market rafı','Alınabilecek ürünlerin üzerinde fiyatları var. Hazır kartın varsa çantandan hemen kullanabilirsin.','#close-modal');
 }
 if($('siege-use'))return $('siege-use').disabled?cue('Kart beklemede',$('siege-use-note').textContent||'Bu kartın koşulu henüz sağlanmadı.','#close-modal'):cue('Kart elinde','Gücü kullan düğmesine dokun. Kart hedef istiyorsa sonraki adımı haritada göstereceğim.','#siege-use','happy');
 if(dialog.querySelector('.target-player')){
  const card=(s.mode==='siege'?SIEGE_POWERS:POWERS).find(c=>c.name===title);
  const targets=s.players.filter(t=>t.id!==p.id&&!t.eliminated&&!(card?.hostile&&t.shield)&&!(card?.id===11&&t.skipIncome));
  const score=t=>[3,7,11].includes(card?.id)?t.money:units(s,t.id).length;
  targets.sort((a,b)=>score(b)-score(a));
  return targets.length?cue('Rakibini seç',targets[0].name+' bu kart için uygun bir rakip. Portresini ve ordu rengini kontrol edip dokun.','.target-player[data-player="'+CSS.escape(targets[0].id)+'"]','alert'):cue('Kalkanlar açık','Uygun rakip kalmadı. Gücünü sonraki fırsata sakla.','#close-modal');
 }
 if(title==='Cephanelik')return cue('Cephanelik','Asker takviyesi almak için çağırma düğmesine, bir güç almak için kartının fiyatına dokun.','#recruit-open');
 if($('recruit-confirm'))return cue('Birliğini hazırla','Asker sayını seç ve alımı onayla.','#recruit-confirm');
 if(title==='Güç çantası')return dialog.querySelector('[data-power]:not(:disabled)')?cue('Güç çantası','Kullanabildiğin kartı seç. Rakip ya da kare gerekiyorsa birlikte hedef belirleyeceğiz.','[data-power]:not(:disabled)'):cue('Çanta beklemede','Kullanılabilir kart görünmüyor. Sahaya dönüp sıradaki hamleyi inceleyelim.','#close-modal');
 if($('heal-next'))return cue('Generalini iyileştir','Kullanacağın asker miktarını belirle, sonra iyileştireceğin generale dokun.','#heal-next');
 return null;
}
function reaction(s,p){
 if(room!==s.code||s.seq<sequence){room=s.code;sequence=s.seq;reply=null;return;}
 if(s.seq===sequence)return;
 const recent=(s.events||[]).filter(e=>e.id>sequence);sequence=s.seq;
 for(const e of recent){
  if(e.type==='zone'&&e.damaged?.some(([x,y])=>s.board[x+','+y]?.owner===p.id))reply={title:'Lazer vurdu!',mood:'alert'};
  if(e.player!==p.id)continue;
  if(e.type==='roll')reply={title:e.value>0?'Çark bizden yana!':'Birlikler geri çekiliyor!',mood:e.value>0?'happy':'alert'};
  if(['place','recruit','heal','promote','power','hit','move-general'].includes(e.type))
   reply={title:({place:'Mevzi bizim!',recruit:'Takviye geldi!',heal:'General toparlandı!',promote:'Komutan sahada!',power:'Gücün işledi!',hit:'İsabet!', 'move-general':'Yeni mevzideyiz!'})[e.type],mood:'happy'};
 }
 if(reply&&!reply.until)reply.until=performance.now()+1550;
}
function write(line){
 if(lastLine===line)return;
 lastLine=line;spoken.textContent=line;cancelAnimationFrame(frame);
 if(media.matches){step.textContent=line;return;}
 step.textContent='';const start=performance.now(),duration=Math.max(320,Math.min(1050,line.length*12));
 function reveal(t){
  const end=Math.ceil(line.length*Math.min(1,(t-start)/duration));
  step.textContent=line.slice(0,end);
  if(end<line.length)frame=requestAnimationFrame(reveal);
 }
 frame=requestAnimationFrame(reveal);
}
function refresh(){
 hand.hidden=true;destination=null;tile=null;
 const data=read?.(),s=data?.state,stage=document.body.dataset.stage;
 if(!data?.p||stage!==s?.stage||!['lobby','draft','placement','countdown','playing','ended'].includes(stage)){
  panel.hidden=true;return;
 }
 const dialog=document.querySelector('dialog[open]'),mobile=matchMedia('(max-width:860px)').matches;
 if(mobile&&document.body.dataset.pane==='roster'&&!dialog){panel.hidden=true;return;}
 const modalAdvice=dialog&&modalLesson(dialog,data);
 if(dialog&&!modalAdvice){panel.hidden=true;return;}
 const parent=dialog||(stage==='draft'?document.querySelector('.draft-wrap'):stage==='countdown'?$('countdown'):stage==='lobby'?$('lobby'):document.body);
 if(panel.parentNode!==parent){
  if(dialog)dialog.querySelector('.modal-head').after(panel);
  else if(stage==='draft')parent.prepend(panel);
  else parent.append(panel);
 }
 if(hand.parentNode!==(dialog||document.body))(dialog||document.body).append(hand);
 panel.hidden=false;body.hidden=!enabled;toggle.setAttribute('aria-expanded',String(enabled));toggle.title=enabled?'Rehberi kapat':'Rehberi aç';toggle.setAttribute('aria-label',toggle.title);
 toggle.setAttribute('aria-label',toggle.title);panel.classList.toggle('guide-folded',!enabled);
 if(!enabled)return;
 reaction(s,data.p);
 const now=Date.now(),bet=Number($('bet-troops').value)+Number($('bet-money').value)>0;
 const signature=[data.mine,data.animating,data.picks.join(','),bet,s.revealUntil>now,data.p.cooldowns?.recruit>now,data.p.cooldowns?.general>now].join('|');
 if(cache?.state!==s||cache?.target!==data.target||cache?.signature!==signature)
  cache={state:s,target:data.target,signature,advice:guideAdvice(data,{bet},now)};
 const tip=modalAdvice||cache.advice;
 const response=tip.mood!=='alert'&&stage==='playing'&&reply?.until>performance.now()?reply:tip;
 const emotion=response.mood||'calm';
 if(panel.dataset.emotion!==emotion){panel.dataset.emotion=emotion;face.src='/assets/arena/coach-'+emotion+'.webp';}
 headline.textContent=response.title;
 let text=tip.text,el=tip.selector&&document.querySelector(tip.selector);
 tile=tip.tile||null;
 if(!dialog&&el&&mobile&&s.mode!=='siege'&&stage==='playing'){
  const pane=el.closest('#actions')?'actions':el===$('board')?'map':null;
  if(pane&&pane!==document.body.dataset.pane){
   el=document.querySelector('#mobile-dock [data-pane='+pane+']');tile=null;
   text=(pane==='map'?'Harita':'Hamle')+' sekmesini aç. '+text;
  }
 }
 write(text);
 destination=el;find.hidden=true;if(!el||el.disabled)return;
 const box=el.getBoundingClientRect();
 const point=tile?data.board.point(...tile):{x:box.left+box.width*.48,y:box.top+box.height*.5};
 if(!el.contains(document.elementFromPoint(point.x,point.y))){find.hidden=!box.width;return;}
 hand.style.left=point.x+'px';hand.style.top=point.y+'px';hand.hidden=false;
}
setInterval(refresh,250);
