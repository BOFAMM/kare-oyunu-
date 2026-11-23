import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,act,tick,botStep,configureTestMatch,migrateSiegeRoom} from '../engine.mjs';
import {SIEGE,SIEGE_POWERS} from '../public/siege-rules.js';
const start=10100, rng=()=>.37;
function fixture(focus={x:24,y:24}){
 let s=createRoom('ROOM','a','Al',0);s.mode='siege';
 addPlayer(s,'a','Al');addPlayer(s,'b','Mor');
 s=act(s,'a',{type:'start'},{now:0,rng});
 for(const p of s.players)s=act(s,p.id,{type:'choose',powers:p.offers.slice(0,2)},{now:100,rng});
 assert.equal(s.stage,'placement');
 for(const id of ['b','a'])s=act(s,id,{type:'setup',x:10,y:10},{now:100,rng});
 assert.equal(s.players[1].spawn.moved,false);assert.equal(s.players[0].spawn.moved,true);
 assert.equal(s.players[0].spawn.x,8);
 s=act(s,'a',{type:'ready'},{now:100,rng});assert.equal(tick(s,1e9).stage,'placement');
 s=act(s,'b',{type:'ready'},{now:100,rng});assert.equal(tick(s,start-1).stage,'countdown');
 s=tick(s,start,rng);if(focus)s.siege.focus=focus;
 s.board={'10,10':{owner:'a',hp:10},'12,10':{owner:'b',hp:10}};
 return s;
}
const run=(s,id,a,ms=0)=>act(s,id,a,{now:start+ms,rng});
test('placement waits for both confirmations, then ten seconds; only money accrues',()=>{
 let s=fixture();assert.equal(s.siege.warAt,start+120000);
 for(const type of ['roll','end','convert','dismiss','haste'])assert.throws(()=>run(s,'a',{type}));
 assert.deepEqual(s.players.map(p=>[p.money,p.pending]),[[80,0],[80,0]]);
 s=tick(s,start+24999);assert.equal(s.players[0].money,80);
 s=tick(s,start+75000);assert.equal(s.players[0].money,140);assert.equal(s.players[0].pending,0);
 s=run(s,'a',{type:'recruit',amount:3},75000);assert.equal(s.players[0].pending,3);assert.equal(s.players[0].money,137);
});
test('concurrent intents do not turn a stale empty-cell click into an attack or spend a reserve',()=>{
 let s=fixture(),move={type:'place',x:11,y:10,expectedOwner:null};
 for(const p of s.players)p.pending=5;
 s=run(s,'b',move);assert.throws(()=>run(s,'a',move),/değişti/);
 assert.equal(s.players[0].pending,5);assert.equal(s.board['11,10'].owner,'b');
 assert.throws(()=>run(s,'a',{...move,expectedOwner:'b'},119999),/gelişim/);
 s=run(s,'a',{...move,expectedOwner:'b'},120000);assert.equal(s.board['11,10'].owner,'a');
});
test('siege attacks preserve defenders bridges; general purchase HP equals price; heal only targets generals',()=>{
 let s=fixture();s.players[0].pending=1;s.board['11,10']={owner:'b',hp:0};s.board['11,11']={owner:'b',hp:0};
 assert.throws(()=>run(s,'a',{type:'place',x:11,y:10,expectedOwner:'b'},120000),/bağlı/);
 s=run(s,'a',{type:'general',x:10,y:11});assert.deepEqual(s.board['10,11'],{owner:'a',hp:20});assert.equal(s.players[0].money,60);
 s=run(s,'a',{type:'heal',amount:5,x:10,y:11});assert.equal(s.board['10,11'].hp,25);assert.equal(s.players[0].money,55);
 s=run(s,'a',{type:'place',x:9,y:10,expectedOwner:null});
 assert.throws(()=>run(s,'a',{type:'heal',amount:1,x:9,y:10},30000),/general/);
});
test('each laser sweep immediately kills newly exposed troops and hits exposed generals',()=>{
 let s=fixture();s.board['0,5']={owner:'a',hp:0};s.board['1,5']={owner:'a',hp:0};s.board['0,6']={owner:'a',hp:12};
 s=tick(s,start+120000,rng);assert.equal(s.siege.war,true);assert.equal(s.siege.inset,0);
 s=tick(s,start+165000,rng);assert.equal(s.board['0,5'],undefined);assert.ok(s.board['1,5']);assert.equal(s.board['0,6'].hp,7);
 s=tick(s,start+210000,rng);assert.equal(s.board['1,5'],undefined);assert.equal(s.board['0,6'],undefined);
});

test('all seven siege cards can be granted, bought and used with their mode-specific targets',()=>{
 for(const card of SIEGE_POWERS){
  let s=fixture();s.players[0].money=1000;s.players[0].inventory={};
  s=run(s,'a',{type:'buy',power:card.id});assert.equal(s.players[0].inventory[card.id],card.uses,card.name);
  s.board['10,11']={owner:'a',hp:0};s.board['12,11']={owner:'b',hp:0};
  const move={type:'power',power:card.id,target:'b',x:card.id===6?15:12,y:10};
  if(card.hostile)assert.throws(()=>run(s,'a',move,40000),/gelişim/);
  s=run(s,'a',move,120000);
  assert.equal(s.players[0].inventory[card.id],card.uses===-1?-1:card.uses-1,card.name);
 }
});
test('asymmetric boundaries stay nested; eliminated general blocks attacks, replacement permits them',()=>{
 let s=fixture();s.players[0].pending=3;s.board['10,10'].hp=0;s.board['11,10']={owner:'b',hp:0};
 const move={type:'place',x:11,y:10,expectedOwner:'b'};
 assert.throws(()=>run(s,'a',move,120000),/general/);
 s=run(s,'a',{type:'general',x:9,y:10},120000);
 assert.equal(run(s,'a',move,120000).board['11,10'].owner,'a');
 s.siege.focus={x:49,y:49};s=tick(s,start+165000,()=>.99);
 assert.deepEqual(s.siege.bounds,{left:2,right:49,top:2,bottom:49});
 assert.deepEqual(SIEGE_POWERS.map(p=>p.id),[4,5,7,10,11,12,14]);
 for(const id of [1,2,3,6,8,9,13,15])assert.throws(()=>run(s,'a',{type:'buy',power:id},165000));
});
test('center eventually becomes toxic; simultaneous wipe draws and rematch keeps mode',()=>{
 let s=fixture();s.board={'24,24':{owner:'a',hp:10},'25,25':{owner:'b',hp:10}};
 s=tick(s,start+SIEGE.peaceMs+1000*SIEGE.shrinkMs,rng);assert.equal(s.stage,'ended');assert.equal(s.winner,null);
 s=run(s,'a',{type:'rematch'});assert.equal(s.mode,'siege');assert.equal(s.stage,'lobby');
});
test('bot acts even when the turn cursor points at a human; classic admin turn controls rejected',()=>{
 let s=fixture();s.order=['a','b'];s.players[1].bot=true;
 s=botStep(s,start,rng);assert.ok(s.players[1].pending>0||Object.values(s.board).filter(u=>u.owner==='b').length>1);assert.equal(s.players[0].pending,0);
 for(const type of ['advance','turn','rearm','effect'])assert.throws(()=>configureTestMatch(s,{type,player:'a'},start),/Kuşatmada/);
});
test('final poison cannot be stalled with healing, steel heart or renewable poison masks',()=>{
 let s=fixture();s.board={'24,24':{owner:'a',hp:20},'25,25':{owner:'b',hp:10}};
 const final=SIEGE.peaceMs+25*SIEGE.shrinkMs;
 s=tick(s,start+final,rng);s.players[0].inventory={10:1,12:1};
 for(const move of [{type:'heal',x:24,y:24,amount:1},{type:'power',power:10},{type:'power',power:12}])
  assert.throws(()=>run(s,'a',move,final),/Güvenli alan kalmadı/);
 s=tick(s,start+final+100*SIEGE.shrinkMs,rng);assert.equal(s.winner,'a');
});
test('a stranded general can deploy into red and move anywhere free, including off its bridge',()=>{
 let s=fixture();s.players[0].pending=2;
 s.board={'0,10':{owner:'a',hp:100},'1,10':{owner:'a',hp:0},'20,20':{owner:'b',hp:10}};
 s=tick(s,start+210000,rng);assert.equal(s.board['0,10'].hp,85);assert.equal(s.board['1,10'],undefined);
 s=run(s,'a',{type:'place',x:0,y:11,expectedOwner:null},210000);assert.equal(s.board['0,11'].owner,'a');
 const move={type:'move-general',x:0,y:10,toX:20,toY:20};
 assert.throws(()=>run(s,'a',move,210000),/Boş/);assert.equal(s.board['0,10'].hp,85);
 assert.throws(()=>run(s,'b',{...move,toX:5},210000),/Kendi/);
 s=run(s,'a',{...move,toX:0,toY:12},210000);assert.equal(s.board['0,12'].zoneDamage,20);
 assert.throws(()=>run(s,'a',{...move,x:0,y:12,toX:2,toY:10},210001),/hattını/);
 s=run(s,'a',{type:'sell-troop',x:0,y:11},210001);
 s=run(s,'a',{...move,x:0,y:12,toX:2,toY:10},210001);
 assert.deepEqual(s.board['2,10'],{owner:'a',hp:85});assert.equal(s.board['0,12'],undefined);
 s=tick(s,start+255000,rng);assert.equal(s.board['0,11'],undefined);assert.equal(s.board['2,10'].hp,80);
});
test('a 100 HP general in the laser takes 5, 10, 20, 40, 80; troops never preserve a poisoned bridge',()=>{
 let s=fixture();s.board={'20,20':{owner:'b',hp:10},'0,15':{owner:'a',hp:100}};
 for(let x=1;x<=12;x++)s.board[x+',15']={owner:'a',hp:0};
 for(const [i,hp] of [95,85,65,25,0].entries()){
  s=tick(s,start+165000+i*45000,rng);
  assert.equal(s.board['0,15']?.hp||0,hp);
  assert.equal(Boolean(s.board['1,15']),i===0);
 }
});
test('troop refunds preserve connected supply lines, allow selling endpoints and protect the last unit',()=>{
 let s=fixture();s.board['10,11']={owner:'a',hp:0};s.board['10,12']={owner:'a',hp:0};
 const sell={type:'sell-troop',x:10,y:11};
 assert.throws(()=>run(s,'a',sell),/bağlıyor/);
 assert.equal(s.players[0].money,80);assert.ok(s.board['10,11']);
 s=run(s,'a',{...sell,y:12});assert.equal(s.players[0].money,81);
 s=run(s,'a',sell);assert.equal(s.players[0].money,82);assert.equal(s.board['10,11'],undefined);
 assert.throws(()=>run(s,'a',sell));assert.throws(()=>run(s,'a',{...sell,y:10}));
 s.board['10,10'].hp=0;assert.throws(()=>run(s,'a',{...sell,y:10}),/Son/);
 for(const type of ['unlock-sale','restore-troop','move-troop'])assert.throws(()=>run(s,'a',{type}));
});
test('each purchase has an independent 30-second delay; inventory use never starts or checks it',()=>{
 let s=fixture();s.players[0].money=1000;s.players[0].inventory={};
 const buy={type:'buy',power:10},heal={type:'heal',x:10,y:10,amount:1};
 const general={type:'general',x:9,y:10},recruit={type:'recruit',amount:1};
 s=run(s,'a',buy);s=run(s,'a',{type:'power',power:10});assert.equal(s.board['10,10'].hp,20);
 s=run(s,'a',heal);s=run(s,'a',general);s=run(s,'a',recruit);s=run(s,'a',{type:'buy',power:14});
 for(const a of [heal,{...general,x:8},recruit,buy])assert.throws(()=>run(s,'a',a,29999),/30 saniye/);
 s=run(s,'a',buy,30000);s=run(s,'a',{type:'power',power:10},30000);
 s=run(s,'a',heal,30000);s=run(s,'a',{...general,x:8},30000);s=run(s,'a',recruit,30000);
 s.players[0].inventory[5]=3;
 for(let i=0;i<3;i++)s=run(s,'a',{type:'power',power:5,x:12,y:10},120000);
 assert.equal(s.players[0].inventory[5],0);assert.equal(s.board['12,10'].hp,7);
});
test('mask blocks only one enemy poison cloud; laser damage and removal remain unconditional',()=>{
 let s=fixture();s.players[0].inventory[12]=1;s.players[1].inventory[4]=2;
 s.board['0,8']={owner:'a',hp:10};s.board['0,7']={owner:'a',hp:0};
 s.board['10,11']={owner:'a',hp:0};s.board['11,10']={owner:'a',hp:0};
 s=run(s,'a',{type:'power',power:12});s=tick(s,start+165000,rng);
 assert.equal(s.board['0,8'].hp,5);assert.equal(s.board['0,7'],undefined);assert.ok(s.players[0].mask);
 const cloud={type:'power',power:4,target:'a'};
 s=run(s,'b',cloud,165000);assert.ok(!s.players[0].mask);assert.ok(s.board['11,10']&&s.board['10,11']);
 s=run(s,'b',cloud,165000);assert.equal(Object.values(s.board).filter(u=>u.owner==='a'&&!u.hp).length,1);
});
test('chosen destination guides every nested shrink into corners or interior',()=>{
 for(const goal of [{x:0,y:0},{x:49,y:49},{x:0,y:49},{x:35,y:10}]){
  let s=fixture(goal);s.board={[goal.x+','+goal.y]:{owner:'a',hp:1e12},'25,24':{owner:'b',hp:1e12}};
  let last=s.siege.bounds;
  for(let step=1;step<=24;step++){
   s=tick(s,start+SIEGE.peaceMs+step*SIEGE.shrinkMs,rng);const b=s.siege.bounds;
   assert.ok(b.left>=last.left&&b.top>=last.top&&b.right<=last.right&&b.bottom<=last.bottom);
   assert.equal(b.right-b.left+1,50-step*2);assert.ok(b.left<=goal.x&&goal.x<=b.right&&b.top<=goal.y&&goal.y<=b.bottom);last=b;
  }
 }
 const s=fixture(null);assert.deepEqual(s.siege.focus,{x:18,y:18});
 s.stage='countdown';s.deadline=start;
 assert.deepEqual(tick(s,start,()=>0).siege.focus,{x:0,y:0});
 assert.deepEqual(tick(s,start,()=>.995).siege.focus,{x:49,y:49});
});
test('legacy sale licence is refunded once; obsolete use timers are cleared',()=>{
 const s=fixture();delete s.siege.focus;delete s.siege.marketVersion;
 Object.assign(s.players[0],{money:0,saleUnlocked:true,saleReady:999999,soldTroops:7,cooldowns:{14:1e12}});
 migrateSiegeRoom(s);migrateSiegeRoom(s);
 assert.equal(s.players[0].money,100);assert.equal(s.players[0].saleUnlocked,undefined);
 assert.deepEqual(s.players[0].cooldowns,{});assert.ok(Number.isInteger(s.siege.focus.x));
});

test('active immunity cannot stop laser damage',()=>{
 let s=fixture();s.board['0,10']={owner:'a',hp:100};
 s=tick(s,start+165000,rng);s.players[0].inventory[14]=1;
 s=run(s,'a',{type:'power',power:14},209000);
 s=tick(s,start+210000,rng);assert.equal(s.board['0,10'].hp,85);
});

test('a blocked frontline can wear down its exposed flank without annexing a red cell',()=>{
 let s=tick(fixture(),start+165000,rng);s.players[0].pending=3;
 s.board={'1,9':{owner:'a',hp:10},'0,10':{owner:'b',hp:0},'1,10':{owner:'b',hp:0},'2,10':{owner:'b',hp:10}};
 const old=s.players[0].pending;s=run(s,'a',{type:'place',x:1,y:10,expectedOwner:'b'},165000);
 assert.ok(!s.board['0,10']);assert.equal(s.board['1,10'].owner,'b');assert.equal(s.players[0].pending,old-1);
 assert.ok(s.events.at(-1).flank);
});

test('a bridge general swaps with its own soldier without opening a gap',()=>{
 let s=fixture();s.board={'40,40':{owner:'b',hp:10}};
 for(let x=0;x<11;x++)s.board[x+',8']={owner:'a',hp:x===5?65:0};
 const move={type:'move-general',x:5,y:8,toX:0,toY:9};
 assert.throws(()=>run(s,'a',move),/hattını/);
 const next=run(s,'a',{...move,toY:8});
 assert.equal(next.board['0,8'].hp,65);assert.deepEqual(next.board['5,8'],{owner:'a',hp:0});assert.deepEqual(Object.keys(next.board).sort(),Object.keys(s.board).sort());
});
