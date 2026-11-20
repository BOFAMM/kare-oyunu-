import {ODDS,POWERS,multiplierLabel} from './rules.js';

export function installAdmin(currentRoom){
 const el=id=>document.getElementById('admin-'+id);
 const dialog=el('dialog');
 let key='',rooms=[],busy=false;
 const status=message=>{el('status').textContent=message;};
 const fill=(select,items,selected)=>{
  select.replaceChildren(...items.map(([value,label])=>new Option(label,value)));
  if(items.some(([value])=>value===selected))select.value=selected;
 };
 const room=()=>rooms.find(r=>r.code===el('room').value);
 const player=()=>room()?.players.find(p=>p.id===el('player').value);
 const showPlayer=()=>{
  const p=player(),r=room();
  el('round').value=r?.round??1;
  el('money').value=p?.money??0;el('pending').value=p?.pending??0;
  el('hp').value='';el('hp').placeholder=p?.hp.join(', ')||'General yok';
  const playing=r?.stage==='playing'&&p&&!p.eliminated;
  el('match').disabled=!playing||busy;
  el('advance').disabled=!r||!['draft','placement','countdown','playing'].includes(r.stage)||busy;
  el('room-info').textContent=r?(['lobby','draft','placement','countdown','playing','ended'].includes(r.stage)?({
   lobby:'Lobide',draft:'Güç seçiminde',placement:'Yerleşimde',countdown:'Başlıyor',playing:'Maç sürüyor',ended:'Maç bitti'
  })[r.stage]:'')+' · '+r.players.length+' oyuncu':'Henüz oda yok.';
  el('queued').textContent=p?.queued==null?'Sıradaki sonuç: rastgele.':'Sıradaki sonuç: '+multiplierLabel(p.queued)+' (tek kullanım).';
  el('roll').value=String(p?.queued??1);
 };
 const showRoom=()=>{
  const r=room();
  fill(el('player'),(r?.players||[]).map(p=>[p.id,p.name+(p.bot?' · Bot':'')+(p.eliminated?' · Elendi':p.id===r.current?' · Sırası onda':'')]),el('player').value||r?.current);
  showPlayer();
 };
 function unlocked(){
  el('login').hidden=Boolean(key);el('controls').hidden=!key;
  el('open').classList.toggle('hidden',!key);
 }
 async function request(data,success){
  if(busy||!key)return;
  const requestKey=key;
  busy=true;el('controls').disabled=true;el('sign-in').disabled=true;
  status('Sunucuya bağlanıyor…');
  try{
   const response=await fetch('/api/admin',{
    method:data?'POST':'GET', headers:{Authorization:'Bearer '+requestKey,...(data?{'Content-Type':'application/json'}:{})},
    body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(8000)
   });
   const result=await response.json();
   if(key!==requestKey)return;
   if(response.status===403||response.status===404&&!data){key='';unlocked();}
   if(!response.ok)throw Error(result.error||'İşlem tamamlanamadı.');
   rooms=result.rooms;
   fill(el('room'),rooms.map(r=>[r.code,r.code+' · '+r.players.map(p=>p.name).join(', ')]),el('room').value||currentRoom());
   unlocked();status(success);
  }catch(error){if(key===requestKey||!key)status(error.message);}
  finally{busy=false;el('controls').disabled=false;el('sign-in').disabled=false;showRoom();}
 }
 function open(){
  if(!dialog.open)dialog.showModal();
  if(key)request(null,'Odalar güncellendi.');
  else el('key').focus();
 }
 function send(type,values,message){
  if(!room())return;
  request({type,room:room().code,player:player()?.id,...values},message);
 }
 fill(el('roll'),ODDS.map(({v})=>[String(v),multiplierLabel(v)]));
 fill(el('power'),[['','Güç eklenmesin'],...POWERS.map(p=>[String(p.id),p.name])]);
 el('login').onsubmit=event=>{
  event.preventDefault();
  if(location.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
   status('Yönetici panelini HTTPS adresinden aç.');return;
  }
  const supplied=el('key').value.trim();
  el('key').value='';
  if(!/^[a-f0-9]{64}$/i.test(supplied)){status('64 haneli yönetici anahtarını gir.');return;}
  key=supplied;request(null,'Yönetici oturumu açıldı.');
 };
 el('open').onclick=open;
 el('close').onclick=()=>dialog.close();
 el('room').onchange=showRoom;
 el('player').onchange=showPlayer;
 el('refresh').onclick=()=>request(null,'Odalar güncellendi.');
 el('logout').onclick=()=>{
  key='';rooms=[];el('key').value='';unlocked();status('Yönetici oturumu kapandı.');
 };
 el('queue').onclick=()=>send('queue',{result:Number(el('roll').value)},'Sonuç sıraya alındı.');
 el('random').onclick=()=>send('queue',{result:null},'Sıradaki sonuç rastgele.');
 el('turn').onclick=()=>send('turn',{},'Oyuncunun sırası ayarlandı.');
 el('advance').onclick=()=>send('advance',{},'Aşama veya sıra ilerletildi.');
 el('setup').onsubmit=event=>{
  event.preventDefault();
  send('setup',{round:Number(el('round').value),money:Number(el('money').value),pending:Number(el('pending').value),
   hp:el('hp').value===''?undefined:Number(el('hp').value),power:el('power').value===''?undefined:Number(el('power').value)
  },'Test ayarları uygulandı.');
 };
 document.addEventListener('keydown',event=>{
  if(event.ctrlKey&&event.shiftKey&&event.code==='KeyK'){event.preventDefault();open();}
 });
 if(new URLSearchParams(location.search).has('test'))open();
}
