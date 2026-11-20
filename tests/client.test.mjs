import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as rules from '../public/rules.js';
import {THEMES,GENERALS,generalById,teamColor} from '../public/cosmetics.js';
import {FX_DURATION,powerNotice} from '../public/battle-fx.js';
import {act} from '../engine.mjs';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
// A strict DOM harness: getElementById never accepts CSS selectors, matching browsers.
function client(){
 const nodes=new Map(),history=[],timers=new Map();let timerId=0,backend;
 function element(id){const hidden=new Set();return {id,style:{setProperty(){}},dataset:{},disabled:false,value:id==='bet-troops'?'3':'0',max:'',open:false,clientWidth:760,
  classList:{toggle(k,on){if(on===undefined)on=!hidden.has(k);on?hidden.add(k):hidden.delete(k);},add(k){hidden.add(k);},remove(k){hidden.delete(k);},contains:k=>hidden.has(k)},
  set innerHTML(v){this.html=v;for(const match of v.matchAll(/id="([^"]+)"/g))if(!nodes.has(match[1]))nodes.set(match[1],element(match[1]));},get innerHTML(){return this.html||'';},
  set textContent(v){this.text=v;if(id==='reel-title')history.push(v);},get textContent(){return this.text||'';},
  animate(){return {cancel(){}};},querySelectorAll:()=>[],setAttribute(){},focus(){},close(){this.open=false;},showModal(){this.open=true;},appendChild(){},remove(){}};}
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],element(m[1]));
 const selectors={'#target-hint span':element('hint-text'),'#countdown strong':element('count-number'),'.reel-window':element('reel-window'),'.needle':element('needle')};
 const document={getElementById:id=>nodes.get(id)||null,querySelector:q=>selectors[q]||null,querySelectorAll:()=>[],createElement:()=>element('new'),body:element('body')};
 const context={...rules,THEMES,GENERALS,generalById,teamColor,FX_DURATION,powerNotice,installAdmin:()=>{},document,console,Date,Math,Promise,AbortSignal,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},localStorage:{getItem:()=> 'off',setItem(){}},location:{reload(){}},navigator:{},
  Board:class{reduced=false;setState(){}effect(){}focus(){}fit(){}zoomBy(){}},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){},
  fetch:async(url,options)=>{try{backend=act(backend,'a',JSON.parse(options.body));return {ok:true,json:async()=>({id:'a',state:backend})};}catch(e){return {ok:false,status:400,json:async()=>({error:e.message})};}}
 };
 vm.runInNewContext(source+'\nglobalThis.testClient={update,activate,cell,inventory,get busy(){return animating},get queue(){return reelQueue},get target(){return target}};',context);
 return {nodes,selectors,history,api:context.testClient,
  set(s){backend=s;context.testClient.update({id:'a',state:s});},
  async flush(){for(let i=0;i<30;i++){await Promise.resolve();await Promise.resolve();for(const [id,t]of [...timers]){timers.delete(id);t.fn();}}await context.testClient.queue;}};
}
function state(){return {code:'123456',stage:'playing',host:'a',round:6,turn:1,cursor:0,order:['a','b'],deadline:Date.now()+45000,updated:Date.now(),seq:0,events:[],logs:[],board:{'10,10':{owner:'a',hp:10},'11,10':{owner:'a',hp:0},'30,30':{owner:'b',hp:10}},players:[{id:'a',name:'Gezgin',color:'#4d9fe8',money:10,pending:3,reform:0,inventory:{6:1,9:2,14:3},offers:[6,9,14],visits:1,noAttackUntil:0,generalHP:10},{id:'b',name:'Misket',color:'#e87864',money:0,pending:0,inventory:{},generalHP:10,bot:true}]};}
test('render and countdown use valid DOM selectors; HUD names the current player',()=>{const c=client(),s=state();c.set(s);assert.match(c.nodes.get('hud').innerHTML,/SIRA SENDE/);c.set({...s,cursor:1});assert.match(c.nodes.get('hud').innerHTML,/Misket/);c.set({...s,stage:'countdown'});assert.notEqual(c.selectors['#countdown strong'].textContent,'');});
test('targeted power closes its dialog and successfully applies at a map cell',async()=>{const c=client();c.set(state());c.nodes.get('modal').showModal();await c.api.activate(6);assert.equal(c.nodes.get('modal').open,false);assert.equal(c.api.target.power,6);assert.match(c.selectors['#target-hint span'].textContent,/Formasyon/);await c.api.cell(20,20);assert.equal(c.api.target,null);assert.equal(c.api.busy,false);});
test('own reel completes and unlocks game without needing a close click',async()=>{const c=client(),s=state();c.set(s);s.seq=1;s.events=[{id:1,type:'roll',player:'a',value:1,gain:3,lostTroops:0,lostMoney:0}];c.set(s);await c.flush();assert.equal(c.api.busy,false);assert.equal(c.nodes.get('reel-overlay').classList.contains('hidden'),true);assert.equal(c.nodes.get('end').disabled,false);assert.match(c.nodes.get('reel-result').textContent,/3 asker/);});
test('consecutive bot rolls are queued, never dropped during an earlier reel',async()=>{const c=client(),s=state();c.set(s);s.seq=1;s.events=[{id:1,type:'roll',player:'a',value:1,gain:3,lostTroops:0,lostMoney:0}];c.set(s);await Promise.resolve();s.seq=2;s.events.push({id:2,type:'roll',player:'b',value:-1,gain:0,lostTroops:2,lostMoney:0});c.set(s);await c.flush();assert.equal(c.history.length,2);assert.match(c.history[0],/Gezgin/);assert.match(c.history[1],/Misket/);assert.equal(c.api.busy,false);assert.equal(c.nodes.get('reel-overlay').classList.contains('hidden'),true);});
test('animation rendering error releases controls in finally and next reel still runs',async()=>{const c=client(),s=state();c.set(s);const title=c.nodes.get('reel-title');c.nodes.delete('reel-title');s.seq=1;s.events=[{id:1,type:'roll',player:'a',value:1,gain:3}];c.set(s);await c.flush();assert.equal(c.api.busy,false);assert.equal(c.nodes.get('end').disabled,false);c.nodes.set('reel-title',title);s.seq=2;s.events.push({id:2,type:'roll',player:'b',value:1,gain:2});c.set(s);await c.flush();assert.match(c.history[0],/Misket/);});
test('unavailable powers explain their turn restriction instead of targeting the board',async()=>{const c=client(),s=state();s.round=1;c.set(s);await c.api.activate(6);assert.equal(c.api.target,null);assert.match(c.nodes.get('toast').textContent,/3. tur/);});
test('loss mode accepts a general click, preserves HP and unlocks powers after completion',async()=>{
 const c=client(),s=state();s.players[0].lossRemaining=1;s.players[0].rolled=true;s.board['10,10'].hp=7;c.set(s);
 assert.equal(c.nodes.get('loss-tools').classList.contains('hidden'),false);assert.match(c.nodes.get('loss-count').textContent,/1 asker/);assert.equal(c.nodes.get('powers').disabled,true);
 await c.api.cell(10,10);assert.equal(c.nodes.get('loss-tools').classList.contains('hidden'),true);assert.equal(c.nodes.get('powers').disabled,false);
 assert.match(c.nodes.get('players').innerHTML,/♥ 7/);
});
test('manual loss invalid cell leaves loss controls available instead of freezing the screen',async()=>{
 const c=client(),s=state();s.players[0].lossRemaining=1;s.players[0].rolled=true;c.set(s);await c.api.cell(30,30);
 assert.match(c.nodes.get('toast').textContent,/Kendi asker/);assert.equal(c.nodes.get('auto-loss').disabled,false);assert.equal(c.api.busy,false);
 await c.nodes.get('auto-loss').onclick();assert.equal(c.nodes.get('loss-tools').classList.contains('hidden'),true);
});

test('bet sliders, presets, formula and saved bet respect current resources',async()=>{const c=client(),s=state();c.set(s);c.nodes.get('preset-4').onclick();assert.equal(c.nodes.get('bet-troops').value,2);assert.equal(c.nodes.get('bet-money').value,10);assert.match(c.nodes.get('bet-formula').textContent,/24 asker/);c.nodes.get('bet-section').onkeydown({target:{id:'troop-slider'},key:'ArrowLeft',shiftKey:false,preventDefault(){}});assert.equal(c.nodes.get('bet-troops').value,1);s.lock='b';c.set(s);c.nodes.get('preset-4').onclick();assert.equal(c.nodes.get('bet-money').value,0);assert.match(c.nodes.get('bet-badges').textContent,/Kasa kilitli/);});
