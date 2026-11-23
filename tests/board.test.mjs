import test from 'node:test';
import assert from 'node:assert/strict';
import {Board} from '../public/board.js';
test('board renders transfers, retreat, defeat, turn and loss preview without changing state',()=>{
 globalThis.requestAnimationFrame=()=>{};const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const b=Object.create(Board.prototype);Object.assign(b,{ctx,w:900,h:700,dpr:1,zoom:1,pan:{x:0,y:0},terrain:{},effects:[],birth:new Map(),oldBoard:{},reduced:false,lossMode:true,hover:{x:10,y:10}});
 const s={code:'123',seq:0,events:[],stage:'playing',players:[{id:'a',color:'#00bfff'}],board:{'10,10':{owner:'a',hp:10},'11,10':{owner:'a',hp:0}}};b.setState(s,'a');const before=JSON.stringify(s);b.draw(performance.now());assert.equal(JSON.stringify(s),before);
 const next=structuredClone(s);delete next.board['10,10'];next.board['11,10'].hp=10;next.seq=1;next.events=[{id:1,type:'dismiss',x:10,y:10}];b.setState(next,'a');for(const type of ['turn','promote','fall','damage','place','hit'])b.effect({type,player:'a',x:11,y:10,fromX:10,fromY:10});for(const power of [2,3,4,6,7,8,9,10,11,12,13,14,15])b.effect({type:'power',power,player:'a',source:[10,10],destination:[11,10],removed:[[10,10]]});b.effects.push({type:'fall',x:11,y:10,start:performance.now()});b.draw(performance.now()+100);assert.ok(b.effects.some(e=>e.type==='retreat'));delete globalThis.requestAnimationFrame;
});

test('siege touch pickup and drag-to-drop stay deliberate, and brush movement never sells a friendly tile',()=>{
 const oldListener=globalThis.addEventListener;globalThis.addEventListener=()=>{};
 try{
  const handlers={},actions=[],b=Object.create(Board.prototype);
  Object.assign(b,{id:'a',pointers:new Map(),pan:{x:0,y:0},canvas:{focus(){},setPointerCapture(){},addEventListener:(name,fn)=>handlers[name]=fn},
   state:{mode:'siege',stage:'playing',board:{'10,10':{owner:'a',hp:10},'11,10':{owner:'a',hp:0}}},
   tile:(x,y)=>({x:Math.floor(x/20),y:Math.floor(y/20)}),
   onCell(x,y){actions.push([x,y]);if(x===10&&y===10){b.target='move-general';b.carriedGeneral={x,y};}else{b.target=null;b.carriedGeneral=null;}}});
  b.bind();
  function point(type,x,y,pointerType='touch'){handlers['pointer'+type]({clientX:x*20,clientY:y*20,pointerId:1,button:0,pointerType});}
  point('down',10,10);point('up',10,10);assert.deepEqual(actions,[[10,10]]);
  point('down',12,13);point('move',17,18);point('up',17,18);
  assert.deepEqual(actions,[[10,10],[17,18]]);assert.deepEqual(b.pan,{x:0,y:0});
  point('down',11,10);point('move',14,10);point('up',14,10);
  assert.equal(actions.length,2);assert.equal(b.pan.x,60);
  point('down',12,10,'mouse');point('move',11,10,'mouse');point('up',11,10,'mouse');
  assert.deepEqual(actions.at(-1),[12,10]);assert.equal(actions.length,3);
 }finally{if(oldListener)globalThis.addEventListener=oldListener;else delete globalThis.addEventListener;}
});
