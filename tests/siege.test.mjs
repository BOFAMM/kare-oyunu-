import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,act,tick,botStep,configureTestMatch} from '../engine.mjs';
import {SIEGE,SIEGE_POWERS} from '../public/siege-rules.js';
const start=2300, rng=()=>.37;
function fixture(){
 let s=createRoom('ROOM','a','Al',0);s.mode='siege';
 addPlayer(s,'a','Al');addPlayer(s,'b','Mor');
 s=act(s,'a',{type:'start'},{now:0,rng});
 for(const p of s.players)s=act(s,p.id,{type:'choose',powers:p.offers.slice(0,2)},{now:100,rng});
 s=tick(s,start,rng);
 s.board={'10,10':{owner:'a',hp:10},'12,10':{owner:'b',hp:10}};
 return s;
}
const run=(s,id,a,ms=0)=>act(s,id,a,{now:start+ms,rng});
test('siege starts with personal reserves, no rolls or turn passing; income and haste survive skipped ticks',()=>{
 let s=fixture();assert.equal(s.siege.warAt,start+120000);
 assert.deepEqual(s.players.map(p=>[p.money,p.pending]),[[80,5],[80,5]]);
 for(const type of ['roll','end','convert','dismiss'])assert.throws(()=>run(s,'a',{type}));
 s=tick(s,start+19999);assert.equal(s.players[1].money,80);assert.equal(s.players[0].pending,9);
 s=tick(s,start+20000);assert.equal(s.players[0].money,120);assert.equal(s.players[0].pending,10);
 assert.equal(tick(s,start+20000),s);
 s.players[1].money=600;s=run(s,'b',{type:'haste'},22000);assert.equal(s.players[1].nextTroop,start+23000);
 assert.throws(()=>run(s,'b',{type:'haste'},22000));s=tick(s,start+26000);
 assert.equal(s.players[1].pending,12);assert.equal(s.players[0].pending,11);
});
test('concurrent intents do not turn a stale empty-cell click into an attack or spend a reserve',()=>{
 let s=fixture(),move={type:'place',x:11,y:10,expectedOwner:null};
 s=run(s,'b',move);assert.throws(()=>run(s,'a',move),/değişti/);
 assert.equal(s.players[0].pending,5);assert.equal(s.board['11,10'].owner,'b');
 assert.throws(()=>run(s,'a',{...move,expectedOwner:'b'},119999),/gelişim/);
 s=run(s,'a',{...move,expectedOwner:'b'},120000);assert.equal(s.board['11,10'].owner,'a');
});
test('siege attacks preserve defenders bridges; general purchase HP equals price; heal only targets generals',()=>{
 let s=fixture();s.board['11,10']={owner:'b',hp:0};s.board['11,11']={owner:'b',hp:0};
 assert.throws(()=>run(s,'a',{type:'place',x:11,y:10,expectedOwner:'b'},120000),/bağlı/);
 s=run(s,'a',{type:'general',x:10,y:11});assert.deepEqual(s.board['10,11'],{owner:'a',hp:20});assert.equal(s.players[0].money,60);
 s=run(s,'a',{type:'heal',amount:5,x:10,y:11});assert.equal(s.board['10,11'].hp,25);assert.equal(s.players[0].money,55);
 s=run(s,'a',{type:'place',x:9,y:10,expectedOwner:null});
 assert.throws(()=>run(s,'a',{type:'heal',amount:1,x:9,y:10}),/general/);
});
test('poison grants one ring of grace, kills troops and damages generals by five per pulse',()=>{
 let s=fixture();s.board['0,5']={owner:'a',hp:0};s.board['1,5']={owner:'a',hp:0};s.board['0,6']={owner:'a',hp:12};
 s=tick(s,start+120000);assert.equal(s.siege.war,true);assert.equal(s.siege.inset,0);
 s=tick(s,start+135000);assert.ok(s.board['0,5']);assert.equal(s.board['0,6'].hp,12);
 s=tick(s,start+150000);assert.equal(s.board['0,5'],undefined);assert.ok(s.board['1,5']);assert.equal(s.board['0,6'].hp,7);
 s=tick(s,start+165000);assert.equal(s.board['1,5'],undefined);assert.equal(s.board['0,6'].hp,2);
 assert.throws(()=>run(s,'a',{type:'general',x:0,y:6},165000),/Lazer/);
});
test('all fifteen siege cards can be granted, bought and used with their mode-specific targets',()=>{
 for(const card of SIEGE_POWERS){
  let s=fixture();s.players[0].money=1000;s.players[0].inventory={};
  s=run(s,'a',{type:'buy',power:card.id});assert.equal(s.players[0].inventory[card.id],card.uses,card.name);
  s.board['10,11']={owner:'a',hp:0};s.board['12,11']={owner:'b',hp:0};
  const move={type:'power',power:card.id,target:'b',x:card.id===6?15:12,y:10};
  if(card.hostile)assert.throws(()=>run(s,'a',move),/gelişim/);
  s=run(s,'a',move,120000);
  assert.equal(s.players[0].inventory[card.id],card.uses===-1?-1:card.uses-1,card.name);
 }
});
test('shipment denial, extra deliveries, embargo, mask and timed shield follow actual events',()=>{
 let s=fixture();s.players[0].inventory={8:2,9:1,11:2,12:1,14:1};
 const cast=(n,t)=>{s=run(s,'a',{type:'power',power:n,target:'b'},t)};
 cast(8,120000);cast(9,120000);cast(11,120000);cast(12,120000);cast(14,120000);
 s.board['0,3']={owner:'a',hp:10};s=tick(s,start+140000);
 assert.equal(s.players[0].shield,false);assert.equal(s.players[0].pending,44);assert.equal(s.players[1].pending,39);
 assert.equal(s.players[0].money-s.players[1].money,40);
 s=tick(s,start+150000);assert.equal(s.board['0,3'].hp,10);assert.equal(s.players[0].mask,false);
 s=tick(s,start+165000);assert.equal(s.board['0,3'].hp,5);
});
test('center eventually becomes toxic; simultaneous wipe draws and rematch keeps mode',()=>{
 let s=fixture();s.board={'24,24':{owner:'a',hp:10},'25,25':{owner:'b',hp:10}};
 s=tick(s,start+SIEGE.peaceMs+1000*SIEGE.shrinkMs);assert.equal(s.stage,'ended');assert.equal(s.winner,null);
 s=run(s,'a',{type:'rematch'});assert.equal(s.mode,'siege');assert.equal(s.stage,'lobby');
});
test('bot acts even when the turn cursor points at a human; classic admin turn controls rejected',()=>{
 let s=fixture();s.order=['a','b'];s.players[1].bot=true;
 s=botStep(s,start,rng);assert.equal(s.players[1].pending,4);assert.equal(s.players[0].pending,5);
 for(const type of ['advance','turn','rearm','effect'])assert.throws(()=>configureTestMatch(s,{type,player:'a'},start),/Kuşatmada/);
});
test('final poison cannot be stalled with healing, steel heart or renewable poison masks',()=>{
 let s=fixture();s.board={'24,24':{owner:'a',hp:20},'25,25':{owner:'b',hp:10}};
 const final=SIEGE.peaceMs+25*SIEGE.shrinkMs;
 s=tick(s,start+final);s.players[0].inventory={10:1,12:1};
 for(const move of [{type:'heal',x:24,y:24,amount:1},{type:'power',power:10},{type:'power',power:12}])
  assert.throws(()=>run(s,'a',move,final),/Güvenli alan kalmadı/);
 s=tick(s,start+final+100*SIEGE.shrinkMs);assert.equal(s.winner,'a');
});
test('after poison splits a formation, an isolated soldier cannot expand a disconnected front',()=>{
 let s=fixture();
 s.board={'1,9':{owner:'a',hp:0},'0,9':{owner:'a',hp:0},'0,10':{owner:'a',hp:0},'0,11':{owner:'a',hp:0},'1,11':{owner:'a',hp:10},'20,20':{owner:'b',hp:10}};
 s=tick(s,start+150000);
 assert.throws(()=>run(s,'a',{type:'place',x:2,y:9,expectedOwner:null},150000),/bağlı/);
 s=run(s,'a',{type:'place',x:2,y:11,expectedOwner:null},150000);
 assert.equal(s.board['2,11'].owner,'a');
});
