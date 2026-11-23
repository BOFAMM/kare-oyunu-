import http from 'node:http';
import {createHash,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,rename,mkdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRoom,addPlayer,act,tick,botStep,current,migrateSiegeRoom,configureTestMatch} from './engine.mjs';
import {ODDS,units} from './public/rules.js';
const root=path.dirname(fileURLToPath(import.meta.url)), rooms=new Map(), sessions=new Map();
const random=()=>randomInt(0,1000000000)/1000000000;
const adminKey=process.env.GAME_ADMIN_KEY?.trim();
const digest=value=>createHash('sha256').update(value).digest();
const adminDigest=/^[a-f0-9]{64}$/i.test(adminKey||'')?digest(adminKey):null;
const queuedRolls=new Map(), checkpoints=new Map();
function commit(s){
 s.revision=(rooms.get(s.code)?.revision||0)+1;
 rooms.set(s.code,s);dirty=true;
}
function acceptedRoll(before,after){
 const roll=after.roll;
 if(roll?.test&&roll.id!==before.roll?.id)queuedRolls.get(after.code)?.delete(roll.player);
}
function adminRooms(){
 return {rooms:[...rooms.values()].map(s=>({
  mode:s.mode||'classic',checkpoint:checkpoints.has(s.code),code:s.code,stage:s.stage,round:s.round,current:current(s)?.id,
  players:s.players.map(p=>{
   const army=units(s,p.id);
   return {id:p.id,name:p.name,bot:p.bot,eliminated:p.eliminated,tiles:army.length,
    effects:{shield:!!p.shield,double:!!p.double,lucky:!!p.lucky},money:p.money,pending:p.pending,position:army.find(([,u])=>u.hp)?.[0]||army[0]?.[0],hp:army.filter(([,u])=>u.hp).map(([,u])=>u.hp),
    queued:queuedRolls.get(s.code)?.get(p.id)??null};
  })
 }))};
}
const dataDir=path.join(root,process.env.KARE_OWNER_LAB==='1'?'.owner-lab':'.data');let dirty=false,saving=false;
await mkdir(dataDir,{recursive:true});
try{const data=JSON.parse(await readFile(path.join(dataDir,'rooms.json'),'utf8'));for(const [k,v]of data.rooms)rooms.set(k,migrateSiegeRoom(v));for(const [k,v]of data.sessions)sessions.set(k,v);}catch(e){if(e.code!=='ENOENT'){console.error('Kayıt okunamadı; dosyayı korumak için sunucu durdu.',e.message);process.exit(1);}}
async function save(){if(!dirty||saving)return;saving=true;dirty=false;try{await writeFile(path.join(dataDir,'rooms.tmp'),JSON.stringify({rooms:[...rooms],sessions:[...sessions]}));await rename(path.join(dataDir,'rooms.tmp'),path.join(dataDir,'rooms.json'));}catch(e){dirty=true;console.error('Kayıt yazılamadı:',e.message);}finally{saving=false;}}
function view(s,id){const copy=structuredClone(s);for(const p of copy.players)if(p.id!==id){p.offers=[];if(s.mode==='siege')p.inventory={};}return copy;}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){let str='';for await(const chunk of req){str+=chunk;if(str.length>8192)throw Error('İstek çok büyük.');}return JSON.parse(str||'{}');}
const lastSeen=new Map(),limiter=new Map();
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return reply(res,403,{error:'Farklı kaynaktan istek reddedildi.'});
  const ip=req.socket.remoteAddress,now=Date.now(),rate=limiter.get(ip)||{start:now,n:0};if(now-rate.start>1000){rate.start=now;rate.n=0;}limiter.set(ip,rate);if(++rate.n>100)return reply(res,429,{error:'Çok hızlı işlem. Biraz bekle.'});
  if(url.pathname==='/api/admin'){
   if(!adminDigest)return reply(res,404,{error:'Yönetici testi bu sunucuda kapalı.'});
   const key=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
   if(!key||!timingSafeEqual(adminDigest,digest(key)))return reply(res,403,{error:'Yönetici anahtarı geçersiz.'});
   if(req.method==='GET')return reply(res,200,adminRooms());
   if(req.method!=='POST')return reply(res,405,{error:'Yöntem desteklenmiyor.'});
   const a=await body(req);
   const s=rooms.get(a?.room);
   if(!s)return reply(res,404,{error:'Oda bulunamadı.'});
   if(a.type==='snapshot'){
    if(s.stage!=='playing')throw Error('Kontrol noktası için maçı başlat.');
    checkpoints.set(s.code,{state:structuredClone(s),rolls:new Map(queuedRolls.get(s.code)),at:Date.now()});
   }else if(a.type==='simulate'){
    const move=a.move;
    if(s.stage!=='playing'||!['power','place','dismiss','heal','general','buy','recruit','convert','auto-place','auto-dismiss','roll','end'].includes(move?.type))throw Error('Geçersiz test hamlesi.');
    if(s.mode==='siege'&&move.type==='place')move.expectedOwner=s.board[move.x+','+move.y]?.owner??null;
    const after=act(s,a.player,move,{now:Date.now(),rng:random,forcedRoll:queuedRolls.get(s.code)?.get(a.player)});
    acceptedRoll(s,after);after.logs.unshift('Yönetici panelinden test hamlesi uygulandı.');
    commit(after);
   }else if(a.type==='restore'){
    const saved=checkpoints.get(s.code);
    if(!saved||s.players.map(p=>p.id).join()!==saved.state.players.map(p=>p.id).join())throw Error('Uygun kontrol noktası bulunamadı.');
    const restored=structuredClone(saved.state),now=Date.now();
    if(restored.mode==='siege'&&restored.siege){
     const shift=now-saved.at;
     for(const field of ['start','warAt','nextIncome','nextShrink'])if(Number.isFinite(restored.siege[field]))restored.siege[field]+=shift;
     for(const player of restored.players){for(const field of ['nextTroop','shieldUntil','botNext','saleReady'])if(player[field])player[field]+=shift;for(const card of Object.keys(player.cooldowns||{}))player.cooldowns[card]+=shift;}
    }
    restored.deadline=now+Math.max(1000,restored.deadline-saved.at);
    restored.revealUntil=0;restored.updated=now;restored.seq=Math.max(restored.seq,s.seq);
    restored.events=[];restored.logs.unshift('Yönetici test kontrol noktasına döndü.');
    commit(restored);queuedRolls.set(s.code,new Map(saved.rolls));dirty=true;
   }else if(a.type==='queue'){
    if(s.mode==='siege')throw Error('Kuşatmada zar kullanılmaz.');
    const p=s.players.find(p=>p.id===a.player&&!p.eliminated);
    if(!p||s.stage!=='playing')throw Error('Oynayan bir oyuncu seç.');
    if(a.result!==null&&!ODDS.some(o=>o.v===a.result))throw Error('Geçersiz çark sonucu.');
    if(a.result===null)queuedRolls.get(s.code)?.delete(p.id);
    else{
     if(!queuedRolls.has(s.code))queuedRolls.set(s.code,new Map());
     queuedRolls.get(s.code).set(p.id,a.result);
    }
   }else{
    commit(configureTestMatch(s,a,Date.now(),random));
   }
   return reply(res,200,adminRooms());
  }
  if(req.method==='POST'&&['/api/create','/api/join'].includes(url.pathname)){
   const a=await body(req);if(rooms.size>=100&&url.pathname==='/api/create')throw Error('Sunucudaki oda sınırına ulaşıldı.');const id=randomBytes(8).toString('hex'),token=randomBytes(32).toString('hex');let s;
   if(url.pathname==='/api/create'){let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));if(a.mode!==undefined&&!['classic','siege'].includes(a.mode))throw Error('Geçersiz oyun modu.');s=createRoom(code,id,a.name);if(a.mode==='siege')s.mode='siege';addPlayer(s,id,a.name);}else{s=rooms.get(String(a.code));if(!s)throw Error('Oda bulunamadı. 6 haneli kodu kontrol et.');addPlayer(s,id,a.name);}
   commit(s);sessions.set(token,{id,code:s.code});lastSeen.set(id,now);dirty=true;return reply(res,200,{token,id,serverNow:Date.now(),state:view(s,id)});
  }
  const token=req.headers.authorization?.replace(/^Bearer /,''),session=sessions.get(token);if(!session)return reply(res,401,{error:'Oturum bulunamadı. Lobiye tekrar gir.'});let s=rooms.get(session.code);if(!s)return reply(res,404,{error:'Oda artık yok.'});lastSeen.set(session.id,now);
  if(url.pathname==='/api/state'&&req.method==='GET')return reply(res,200,{id:session.id,serverNow:Date.now(),state:view(s,session.id)});
  if(url.pathname==='/api/action'&&req.method==='POST'){
   const a=await body(req);s=tick(rooms.get(session.code),Date.now(),random);
   if(a.type==='bot'){if(s.host!==session.id||s.stage!=='lobby')throw Error('Botu lobide kurucu ekler.');addPlayer(s,randomBytes(8).toString('hex'),['Misket','Fındık','Poyraz','Mercan','Çakıl'][s.players.filter(p=>p.bot).length]||'Bot',true);}
   else if(a.type==='leave'){const p=s.players.find(p=>p.id===session.id);if(s.stage!=='lobby')throw Error('Oyun sırasında çıkış: sekmeyi kapatabilirsin; süren dolunca sıra geçer.');s.players=s.players.filter(p=>p!==p);if(s.host===p.id)s.host=s.players.find(p=>!p.bot)?.id||s.players[0]?.id;sessions.delete(token);}
   else {
    const before=s;
    const forcedRoll=a.type==='roll'?queuedRolls.get(s.code)?.get(session.id):undefined;
    s=act(s,session.id,a,{now:Date.now(),rng:random,forcedRoll});
    acceptedRoll(before,s);
    if(a.type==='rematch')queuedRolls.delete(s.code);
   }
   commit(s);return reply(res,200,{id:session.id,serverNow:Date.now(),state:view(s,session.id)});
  }return reply(res,404,{error:'İşlem bulunamadı.'});
 }
 if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Yöntem desteklenmiyor.'});
 if(url.pathname.startsWith('/worlds/')){
  const file=url.pathname.slice(8);
  if(!/^(worlds\.js|worlds\.css|(?:volcanic|technology|fantasy|forest|ice|desert|space|actors|materials)\.webp)$/.test(file))return reply(res,404,{error:'Dosya bulunamadı.'});
  try{const content=await readFile(path.join(root,'public','worlds',file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/webp','X-Content-Type-Options':'nosniff'});return res.end(req.method==='HEAD'?undefined:content);}
  catch(e){if(e.code==='ENOENT')return reply(res,404,{error:'Yama kurulu değil.'});throw e;}
 }
 const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/rules.js':'rules.js','/board.js':'board.js','/cosmetics.js':'cosmetics.js','/assets/lava.png':'assets/lava.png'};
 const characterPath=/^\/assets\/characters\/(elf|fairy)-[1-3]\/(idle|walk|attack|hurt|die|portrait)\.png$/.test(url.pathname);const battlePath=/^\/assets\/battle\/(?:(?:bow|sword|staff|wand|shield|spear)\.png|(?:impact|launch|beam|lock|charge|step|chime)\.ogg)$/.test(url.pathname);const arenaFile=['guide-hand.webp','ocean.webp','citadel.webp','meadow.webp','guard.webp','crest.svg','sigils.svg','crown.png','sun-rune.png','moon-rune.png','ruby.png','ember.webp','jade.webp','amethyst.webp','timber.webp','hide.webp','steel.webp','sapphire.webp','ranger.webp','sprite.webp','frame.png','EricaOne-Regular.ttf','Outfit-Regular.ttf','Outfit-Bold.ttf'].some(file=>url.pathname==='/assets/arena/'+file);const modulePath=['/siege-ui.js','/siege-ui.css','/siege-rules.js','/touch-values.js','/guide.js','/scrollcraft.js','/arena.js','/sprites.js','/admin.js','/battle-fx.js'].includes(url.pathname);const siegeArt=/^\/assets\/siege\/[a-z0-9-]+\.(?:svg|webp|png)$/.test(url.pathname);const name=siegeArt||modulePath||battlePath||arenaFile?url.pathname.slice(1):characterPath?url.pathname.slice(1):files[url.pathname];if(!name)return reply(res,404,{error:'Dosya bulunamadı.'});let content=await readFile(path.join(root,'public',name));
 if(name==='index.html'){
  try{await access(path.join(root,'public/worlds/worlds.js'));content=content.toString().replace('</head>','<link rel="stylesheet" href="/worlds/worlds.css"><script type="module" src="/worlds/worlds.js"></script></head>');}
  catch(e){if(e.code!=='ENOENT')throw e;}
 }
 res.writeHead(200,{'Content-Type':name.endsWith('.ttf')?'font/ttf':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.webp')?'image/webp':name.endsWith('.png')?'image/png':name.endsWith('.ogg')?'audio/ogg':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){reply(res,400,{error:e.message||'İşlem tamamlanamadı.'});}});
const timer=setInterval(()=>{const now=Date.now();for(const [code,original]of rooms){try{let s=tick(original,now,random);const host=s.players.find(p=>p.id===s.host);if(host&&!host.bot&&now-(lastSeen.get(host.id)||s.created)>30000){const next=s.players.find(p=>!p.bot&&now-(lastSeen.get(p.id)||0)<5000);if(next&&next.id!==s.host){s=structuredClone(s);s.host=next.id;dirty=true;}}if((s.mode==='siege'&&s.stage==='playing'&&s.players.some(p=>p.bot&&!p.eliminated))||current(s)?.bot){const before=s;s=botStep(s,now,random,queuedRolls.get(code)?.get(current(s).id));acceptedRoll(before,s);}if(s!==original)commit(s);}catch(e){console.error('Oda işlemi başarısız:',code,e.message);}}void save();},360);
const port=Number(process.env.PORT||3000);server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Kare Oyunu hazır: http://localhost:${server.address().port}`));
async function shutdown(){clearInterval(timer);await save();server.close(()=>process.exit(0));}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
