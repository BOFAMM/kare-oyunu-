import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,act,tick,botStep,configureTestMatch} from '../engine.mjs';
import {SIEGE,SIEGE_POWERS} from '../public/siege-rules.js';
const start=10100, rng=()=>.37;
function fixture(){
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
 s=tick(s,start,rng);
 s.board={'10,10':{owner:'a',hp:10},'12,10':{owner:'b',hp:10}};
 return s;
}
const run=(s,id,a,ms=0)=>act(s,id,a,{now:start+ms,rng});
test('placement waits for both confirmations, then ten seconds; only money accrues',()=>{
 let s=fixture();assert.equal(s.siege.warAt,start+180000);
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
 assert.throws(()=>run(s,'a',{...move,expectedOwner:'b'},179999),/gelişim/);
 s=run(s,'a',{...move,expectedOwner:'b'},180000);assert.equal(s.board['11,10'].owner,'a');
});
test('siege attacks preserve defenders bridges; general purchase HP equals price; heal only targets generals',()=>{
 let s=fixture();s.players[0].pending=1;s.board['11,10']={owner:'b',hp:0};s.board['11,11']={owner:'b',hp:0};
 assert.throws(()=>run(s,'a',{type:'place',x:11,y:10,expectedOwner:'b'},180000),/bağlı/);
 s=run(s,'a',{type:'general',x:10,y:11});assert.deepEqual(s.board['10,11'],{owner:'a',hp:20});assert.equal(s.players[0].money,60);
 s=run(s,'a',{type:'heal',amount:5,x:10,y:11});assert.equal(s.board['10,11'].hp,25);assert.equal(s.players[0].money,55);
 s=run(s,'a',{type:'place',x:9,y:10,expectedOwner:null});
 assert.throws(()=>run(s,'a',{type:'heal',amount:1,x:9,y:10}),/general/);
});
test('poison grants one ring of grace, kills troops and damages generals by five per pulse',()=>{
 let s=fixture();s.board['0,5']={owner:'a',hp:0};s.board['1,5']={owner:'a',hp:0};s.board['0,6']={owner:'a',hp:12};
 s=tick(s,start+180000,rng);assert.equal(s.siege.war,true);assert.equal(s.siege.inset,0);
 s=tick(s,start+225000,rng);assert.ok(s.board['0,5']);assert.equal(s.board['0,6'].hp,12);
 s=tick(s,start+270000,rng);assert.equal(s.board['0,5'],undefined);assert.ok(s.board['1,5']);assert.equal(s.board['0,6'].hp,7);
 s=tick(s,start+315000,rng);assert.equal(s.board['1,5'],undefined);assert.equal(s.board['0,6'].hp,2);
 assert.throws(()=>run(s,'a',{type:'general',x:0,y:6},315000),/Lazer/);
});
test('all seven siege cards can be granted, bought and used with their mode-specific targets',()=>{
 for(const card of SIEGE_POWERS){
  let s=fixture();s.players[0].money=1000;s.players[0].inventory={};
  s=run(s,'a',{type:'buy',power:card.id});assert.equal(s.players[0].inventory[card.id],card.uses,card.name);
  s.board['10,11']={owner:'a',hp:0};s.board['12,11']={owner:'b',hp:0};
  const move={type:'power',power:card.id,target:'b',x:card.id===6?15:12,y:10};
  if(card.hostile)assert.throws(()=>run(s,'a',move),/gelişim/);
  s=run(s,'a',move,180000);
  assert.equal(s.players[0].inventory[card.id],card.uses===-1?-1:card.uses-1,card.name);
 }
});
test('asymmetric boundaries stay nested; eliminated general blocks attacks, replacement permits them',()=>{
 let s=fixture();s.players[0].pending=3;s.board['10,10'].hp=0;s.board['11,10']={owner:'b',hp:0};
 const move={type:'place',x:11,y:10,expectedOwner:'b'};
 assert.throws(()=>run(s,'a',move,180000),/general/);
 s=run(s,'a',{type:'general',x:9,y:10},180000);
 assert.equal(run(s,'a',move,180000).board['11,10'].owner,'a');
 s=tick(s,start+225000,()=>.99);
 assert.deepEqual(s.siege.bounds,{left:2,right:49,top:2,bottom:49});
 assert.deepEqual(SIEGE_POWERS.map(p=>p.id),[4,5,7,10,11,12,14]);
 for(const id of [1,2,3,6,8,9,13,15])assert.throws(()=>run(s,'a',{type:'buy',power:id},225000));
});
test('center eventually becomes toxic; simultaneous wipe draws and rematch keeps mode',()=>{
 let s=fixture();s.board={'24,24':{owner:'a',hp:10},'25,25':{owner:'b',hp:10}};
 s=tick(s,start+SIEGE.peaceMs+1000*SIEGE.shrinkMs,rng);assert.equal(s.stage,'ended');assert.equal(s.winner,null);
 s=run(s,'a',{type:'rematch'});assert.equal(s.mode,'siege');assert.equal(s.stage,'lobby');
});
test('bot acts even when the turn cursor points at a human; classic admin turn controls rejected',()=>{
 let s=fixture();s.order=['a','b'];s.players[1].bot=true;
 s=botStep(s,start,rng);assert.equal(s.players[1].pending,3);assert.equal(s.players[0].pending,0);
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
test('after poison splits a formation, an isolated soldier cannot expand a disconnected front',()=>{
 let s=fixture();
 s.players[0].pending=2;s.board={'1,9':{owner:'a',hp:0},'0,9':{owner:'a',hp:0},'0,10':{owner:'a',hp:0},'0,11':{owner:'a',hp:0},'1,11':{owner:'a',hp:10},'20,20':{owner:'b',hp:10}};
 s=tick(s,start+270000,rng);
 assert.throws(()=>run(s,'a',{type:'place',x:2,y:9,expectedOwner:null},270000),/bağlı/);
 s=run(s,'a',{type:'place',x:2,y:11,expectedOwner:null},270000);
 assert.equal(s.board['2,11'].owner,'a');
});
