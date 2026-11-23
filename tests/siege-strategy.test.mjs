import test from 'node:test';
import assert from 'node:assert/strict';
import {act,addPlayer,botStep,createRoom,tick} from '../engine.mjs';
import {key} from '../public/rules.js';

function arena(){
 const s=createRoom('AI','bot','Mavi',0);
 addPlayer(s,'bot','Mavi',true);addPlayer(s,'red','Kırmızı');
 s.mode='siege';s.stage='playing';s.order=['red','bot'];
 s.siege={war:true,inset:0,warAt:0,nextIncome:25000,nextShrink:45000,
  bounds:{left:0,top:0,right:49,bottom:49},focus:{x:49,y:49}};
 s.board={'12,12':{owner:'bot',hp:10},'35,12':{owner:'red',hp:10}};
 return s;
}
test('auto placement approaches the closest opposing army on either side, spending only its reserve',()=>{
 for(const direction of [-1,1]){
  const s=arena();
  s.board={'24,24':{owner:'bot',hp:10},[key(24+5*direction,24)]:{owner:'red',hp:10},[key(24-20*direction,24)]:{owner:'far',hp:10}};
  addOpponent(s);s.players[0].pending=3;
  const result=act(s,'bot',{type:'auto-place'},{now:1000});
  for(let n=1;n<=3;n++)assert.equal(result.board[key(24+n*direction,24)]?.owner,'bot');
  assert.equal(result.players[0].pending,0);assert.equal(result.events.at(-1).count,3);
 }
});
function addOpponent(s){s.players.push({...s.players[1],id:'far',name:'Uzak'});}
test('auto placement can build from a stranded general across red cells toward safety',()=>{
 const s=arena();s.siege.bounds={left:5,right:48,top:0,bottom:43};
 s.board={'2,10':{owner:'bot',hp:5},'12,10':{owner:'red',hp:10}};s.players[0].pending=3;
 const result=act(s,'bot',{type:'auto-place'},{now:1000});
 for(const x of [3,4,5])assert.equal(result.board[key(x,10)]?.owner,'bot');
});
test('bot picks safe expansion toward the corner instead of a retreating enemy',()=>{
 const s=arena();s.board={'12,12':{owner:'bot',hp:10},'9,12':{owner:'red',hp:10}};
 s.players[0].pending=1;
 const result=botStep(s,1000);
 assert.ok(result.board['13,12']||result.board['12,13']);
});
test('bot aims missiles at a hostile cluster, keeps its front line and respects shields',()=>{
 const s=arena();
 for(const x of [11,12,13])s.board[key(x,13)]={owner:'bot',hp:0};
 for(const x of [34,35,36])s.board[key(x,13)]={owner:'red',hp:0};
 s.players[0].inventory={5:3};s.players[0].cooldowns={5:30000};
 const result=botStep(s,1000);
 assert.equal(result.players[0].inventory[5],2);assert.equal(result.board['35,12'].hp,9);
 for(const x of [11,12,13])assert.equal(result.board[key(x,13)].owner,'bot');
 const shielded=structuredClone(s);shielded.players[1].shield=true;shielded.players[1].shieldUntil=9000;
 assert.equal(botStep(shielded,1000).players[0].inventory[5],3);
});
test('bot buys a profitable card, uses it during its purchase lock and can recover a missing general',()=>{
 const s=arena();s.players[0].money=65;s.players[1].money=100;
 const owned=botStep(s,1000);assert.equal(owned.players[0].inventory[7],1);
 const used=botStep(owned,2200);assert.equal(used.players[0].inventory[7],0);assert.equal(used.players[1].money,75);
 const recovery=arena();recovery.board['12,12'].hp=0;recovery.players[0].money=10;
 const result=botStep(recovery,1000);
 assert.ok(Object.values(result.board).some(u=>u.owner==='bot'&&u.hp===10));
});
test('bot evacuates a vulnerable general before the pulse and can escape from red land alone',()=>{
 for(const x of [0,2]){
  const s=arena();s.board={[key(x,10)]:{owner:'bot',hp:3},'35,12':{owner:'red',hp:10}};
  s.siege.inset=1;s.siege.bounds={left:2,top:2,right:49,bottom:49};s.siege.nextShrink=4500;
  const next=botStep(s,1000);const event=next.events.find(e=>e.type==='move-general');
  assert.ok(event);assert.ok(event.x>=4&&event.y>=4);
  assert.equal(tick(next,4500).board[key(event.x,event.y)].hp,3);
 }
});
test('six bots complete a seeded siege using legal moves and nonnegative budgets',()=>{
 let s=arena(),seed=7;
 const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 s.stage='lobby';
 for(let i=2;i<6;i++)addPlayer(s,'bot'+i,'Komutan '+i,true);
 for(const [i,p] of s.players.entries()){
  p.bot=true;p.money=80;p.inventory={5:1,14:1};
  if(i>1)s.board[key(8+i*5,22)]={owner:p.id,hp:10};
 }
 s.stage='playing';s.order=s.players.map(p=>p.id);
 let sawPower=false,sawZone=false;
 for(let t=1000;t<=1300000&&s.stage==='playing';t+=1800){
  s=tick(s,t,rng);s=botStep(s,t,rng);
  sawPower||=s.events.some(e=>e.type==='power');sawZone||=s.siege.inset>0;
  assert.ok(s.players.every(p=>p.pending>=0&&p.money>=0));
 }
 assert.ok(sawPower);assert.ok(sawZone);assert.equal(s.stage,'ended');
});
