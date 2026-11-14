import test from 'node:test';
import assert from 'node:assert/strict';
import {Board} from '../public/board.js';
test('board renders transfers, retreat, defeat, turn and loss preview without changing state',()=>{
 globalThis.requestAnimationFrame=()=>{};const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const b=Object.create(Board.prototype);Object.assign(b,{ctx,w:900,h:700,dpr:1,zoom:1,pan:{x:0,y:0},terrain:{},effects:[],birth:new Map(),oldBoard:{},reduced:false,lossMode:true,hover:{x:10,y:10}});
 const s={code:'123',seq:0,events:[],stage:'playing',players:[{id:'a',color:'#00bfff'}],board:{'10,10':{owner:'a',hp:10},'11,10':{owner:'a',hp:0}}};b.setState(s,'a');const before=JSON.stringify(s);b.draw(performance.now());assert.equal(JSON.stringify(s),before);
 const next=structuredClone(s);delete next.board['10,10'];next.board['11,10'].hp=10;next.seq=1;next.events=[{id:1,type:'dismiss',x:10,y:10}];b.setState(next,'a');for(const type of ['turn','promote','fall','damage','place','hit'])b.effect({type,player:'a',x:11,y:10,fromX:10,fromY:10});b.effects.push({type:'fall',x:11,y:10,start:performance.now()});b.draw(performance.now()+100);assert.ok(b.effects.some(e=>e.type==='retreat'));delete globalThis.requestAnimationFrame;
});
