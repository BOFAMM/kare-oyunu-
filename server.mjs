import http from 'node:http';
import {randomBytes,randomInt} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRoom,addPlayer,act,tick,botStep,current} from './engine.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)), rooms=new Map(), sessions=new Map();
const random=()=>randomInt(0,1000000000)/1000000000;
const dataDir=path.join(root,'.data');let dirty=false,saving=false;
await mkdir(dataDir,{recursive:true});
try{const data=JSON.parse(await readFile(path.join(dataDir,'rooms.json'),'utf8'));for(const [k,v]of data.rooms)rooms.set(k,v);for(const [k,v]of data.sessions)sessions.set(k,v);}catch(e){if(e.code!=='ENOENT'){console.error('Kayıt okunamadı; dosyayı korumak için sunucu durdu.',e.message);process.exit(1);}}
async function save(){if(!dirty||saving)return;saving=true;dirty=false;try{await writeFile(path.join(dataDir,'rooms.tmp'),JSON.stringify({rooms:[...rooms],sessions:[...sessions]}));await rename(path.join(dataDir,'rooms.tmp'),path.join(dataDir,'rooms.json'));}catch(e){dirty=true;console.error('Kayıt yazılamadı:',e.message);}finally{saving=false;}}
function view(s,id){const copy=structuredClone(s);for(const p of copy.players)if(p.id!==id)p.offers=[];return copy;}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){let str='';for await(const chunk of req){str+=chunk;if(str.length>8192)throw Error('İstek çok büyük.');}return JSON.parse(str||'{}');}
const lastSeen=new Map(),limiter=new Map();
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return reply(res,403,{error:'Farklı kaynaktan istek reddedildi.'});
  const ip=req.socket.remoteAddress,now=Date.now(),rate=limiter.get(ip)||{start:now,n:0};if(now-rate.start>1000){rate.start=now;rate.n=0;}limiter.set(ip,rate);if(++rate.n>100)return reply(res,429,{error:'Çok hızlı işlem. Biraz bekle.'});
  if(req.method==='POST'&&['/api/create','/api/join'].includes(url.pathname)){
   const a=await body(req);if(rooms.size>=100&&url.pathname==='/api/create')throw Error('Sunucudaki oda sınırına ulaşıldı.');const id=randomBytes(8).toString('hex'),token=randomBytes(32).toString('hex');let s;
   if(url.pathname==='/api/create'){let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));s=createRoom(code,id,a.name);addPlayer(s,id,a.name);rooms.set(code,s);}else{s=rooms.get(String(a.code));if(!s)throw Error('Oda bulunamadı. 6 haneli kodu kontrol et.');addPlayer(s,id,a.name);}
   sessions.set(token,{id,code:s.code});lastSeen.set(id,now);dirty=true;return reply(res,200,{token,id,state:view(s,id)});
  }
  const token=req.headers.authorization?.replace(/^Bearer /,''),session=sessions.get(token);if(!session)return reply(res,401,{error:'Oturum bulunamadı. Lobiye tekrar gir.'});let s=rooms.get(session.code);if(!s)return reply(res,404,{error:'Oda artık yok.'});lastSeen.set(session.id,now);
  if(url.pathname==='/api/state'&&req.method==='GET')return reply(res,200,{id:session.id,state:view(s,session.id)});
  if(url.pathname==='/api/action'&&req.method==='POST'){
   const a=await body(req);s=tick(s,now,random);
   if(a.type==='bot'){if(s.host!==session.id||s.stage!=='lobby')throw Error('Botu lobide kurucu ekler.');addPlayer(s,randomBytes(8).toString('hex'),['Misket','Fındık','Poyraz','Mercan','Çakıl'][s.players.filter(p=>p.bot).length]||'Bot',true);}
   else if(a.type==='leave'){const p=s.players.find(p=>p.id===session.id);if(s.stage!=='lobby')throw Error('Oyun sırasında çıkış: sekmeyi kapatabilirsin; süren dolunca sıra geçer.');s.players=s.players.filter(p=>p!==p);if(s.host===p.id)s.host=s.players.find(p=>!p.bot)?.id||s.players[0]?.id;sessions.delete(token);}
   else s=act(s,session.id,a,{now,rng:random});rooms.set(s.code,s);dirty=true;return reply(res,200,{id:session.id,state:view(s,session.id)});
  }return reply(res,404,{error:'İşlem bulunamadı.'});
 }
 if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Yöntem desteklenmiyor.'});
 const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/rules.js':'rules.js','/board.js':'board.js','/cosmetics.js':'cosmetics.js','/assets/lava.png':'assets/lava.png'};
 const name=files[url.pathname];if(!name)return reply(res,404,{error:'Dosya bulunamadı.'});const content=await readFile(path.join(root,'public',name));res.writeHead(200,{'Content-Type':name.endsWith('.png')?'image/png':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){reply(res,400,{error:e.message||'İşlem tamamlanamadı.'});}});
const timer=setInterval(()=>{const now=Date.now();for(const [code,original]of rooms){try{let s=tick(original,now,random);const host=s.players.find(p=>p.id===s.host);if(host&&!host.bot&&now-(lastSeen.get(host.id)||s.created)>30000){const next=s.players.find(p=>!p.bot&&now-(lastSeen.get(p.id)||0)<5000);if(next&&next.id!==s.host){s=structuredClone(s);s.host=next.id;dirty=true;}}if(current(s)?.bot)s=botStep(s,now,random);if(s!==original){rooms.set(code,s);dirty=true;}}catch(e){console.error('Oda işlemi başarısız:',code,e.message);}}void save();},600);
const port=Number(process.env.PORT||3000);server.listen(port,'0.0.0.0',()=>console.log(`Ada Muhafızları hazır: http://localhost:${port}`));
async function shutdown(){clearInterval(timer);await save();server.close(()=>process.exit(0));}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
