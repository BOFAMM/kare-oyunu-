import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {moment,powerIcon} from '../public/arena.js';
import {POWERS} from '../public/rules.js';
import {Board} from '../public/board.js';

const state={round:6,players:[{id:'a',name:'Lâl'},{id:'b',name:'Ayaz'}]};
test('all fifteen powers have a unique shipped emblem and a named screen announcement',async()=>{
 const svg=await readFile(new URL('../public/assets/arena/sigils.svg',import.meta.url),'utf8');
 const signs=new Set();
 for(const power of POWERS){
  const event={type:'power',power:power.id,player:'a',target:'b'};
  const notice=moment([event],state,'a');
  assert.ok(notice.title&&notice.detail);
  assert.ok(svg.includes('id="'+notice.badge+'"'));assert.ok(powerIcon(power.id).includes('#'+notice.badge));
  signs.add(notice.badge);
 }
 assert.equal(signs.size,15);
});
test('group quick placements for one actor, preserve captures and prioritize elimination',()=>{
 const events=['a','b','a'].map(player=>({type:'place',player,x:10,y:10}));
 assert.equal(moment(events,state,'a').detail,'Lâl · +2 kare');
 const b=Object.create(Board.prototype);Object.assign(b,{effects:[],characterActions:new Map()});
 for(const event of events)b.effect(event);
 assert.equal(b.effects.filter(e=>!e.hideText&&e.player==='a').length,1);
 assert.equal(b.effects.at(-1).count,2);
 assert.equal(moment([{type:'hit',player:'a',capture:true}],state,'a').title,'Kare ele geçirildi!');
 assert.equal(moment([...events,{type:'eliminate',player:'b'}],state,'a').detail,'Ayaz');
 assert.equal(moment([],state,'a'),null);
});
