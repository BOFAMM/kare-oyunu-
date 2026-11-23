import test from 'node:test';
import assert from 'node:assert/strict';
import {guideAdvice} from '../public/guide-model.js';
import {createRoom,addPlayer,act} from '../engine.mjs';

function scene(mode='siege'){
 const s=createRoom('ROOM','me','Ada',0);
 addPlayer(s,'me','Ada');addPlayer(s,'other','Elif');
 s.mode=mode;s.stage='playing';s.order=['me','other'];s.round=7;s.deadline=50000;
 s.board={'10,10':{owner:'me',hp:10},'20,20':{owner:'other',hp:10}};
 if(mode==='siege')s.siege={war:true,inset:1,bounds:{left:2,top:2,right:49,bottom:49},focus:{x:49,y:49},nextIncome:25000,nextShrink:45000};
 return {state:s,p:s.players[0],mine:true,picks:[]};
}
const tip=(data,ui={})=>guideAdvice(data,ui,1000);
test('coach covers lobby, draft, valid spawn, ready, countdown and outcome',()=>{
 const d=scene(),s=d.state,p=d.p;
 s.stage='lobby';assert.equal(tip(d).selector,'#start');
 s.stage='draft';assert.match(tip(d).selector,/skin/);p.generalSkin='elf-1';assert.match(tip(d).selector,/pick/);d.picks=[4,5];assert.equal(tip(d).selector,'#confirm-powers');
 s.stage='placement';const [x,y]=tip(d).tile;
 for(let i=0;i<2;i++)for(let j=0;j<5;j++)assert.equal(s.board[(x+i)+','+(y+j)],undefined);
 p.spawn={x,y};assert.equal(tip(d).selector,'#siege-ready');p.ready=true;assert.equal(tip(d).mood,'happy');
 s.stage='countdown';assert.match(tip(d).text,/iki dakika/);s.stage='ended';s.winner=p.id;assert.equal(tip(d).mood,'happy');
});
test('coach suggests a legal siege advance, skips protected targets, then points to a legal capture',()=>{
 const d=scene(),s=d.state;d.p.pending=2;s.board['11,10']={owner:'other',hp:0};s.players[1].shield=true;
 const first=tip(d).tile;assert.ok(!s.board[first.join(',')]);act(s,'me',{type:'place',x:first[0],y:first[1],expectedOwner:null},{now:1000});
 s.players[1].shield=false;const second=tip(d).tile;assert.deepEqual(second,[11,10]);
 assert.equal(act(s,'me',{type:'place',x:11,y:10,expectedOwner:'other'},{now:1000}).board['11,10'].owner,'me');
});
test('coach identifies an exposed general, then recommends a server-accepted rescue',()=>{
 const d=scene(),s=d.state;delete s.board['10,10'];s.board['1,5']={owner:'me',hp:7,zoneDamage:10};
 assert.equal(tip(d).mood,'alert');assert.match(tip(d).text,/10 can/);assert.deepEqual(tip(d).tile,[1,5]);
 d.target={type:'move-general',x:1,y:5};const [toX,toY]=tip(d).tile;assert.ok(toX>=2&&toY>=2);
 const after=act(s,'me',{...d.target,toX,toY},{now:1000});assert.equal(after.board[toX+','+toY].hp,7);
});
test('coach classic roll, shields, forced loss, end turn, and turn ownership',()=>{
 const d=scene('classic');d.mine=false;assert.equal(tip(d).selector,null);d.mine=true;
 d.p.inventory[12]=1;assert.equal(tip(d).selector,'#powers');d.p.inventory={};
 assert.equal(tip(d).selector,'#troop-slider');assert.equal(tip(d,{bet:true}).selector,'#roll');d.p.rolled=true;
 d.state.board['11,10']={owner:'me',hp:0};d.p.lossRemaining=1;
 assert.deepEqual(tip(d).tile,[11,10]);assert.ok(act(d.state,'me',{type:'dismiss',x:11,y:10},{now:1000}));
 d.p.lossRemaining=0;assert.equal(tip(d).selector,'#end');
});
test('coach distinguishes affordable market purchases, cooldowns and final closure',()=>{
 const d=scene();d.p.money=0;assert.equal(tip(d).selector,'#siege-income');
 d.p.money=20;assert.equal(tip(d).selector,'#siege-market');d.p.cooldowns={recruit:2000};assert.equal(tip(d).selector,'#siege-income');
 d.state.siege.inset=25;assert.equal(tip(d).mood,'alert');assert.equal(tip(d).selector,null);
});
