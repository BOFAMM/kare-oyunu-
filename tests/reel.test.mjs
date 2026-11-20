import test from 'node:test';
import assert from 'node:assert/strict';
import {ODDS,REEL_PITCH,REEL_DURATION_MS,ROLL_REVEAL_MS,reelPlan,reelEase} from '../public/rules.js';
test('weighted strip settles under the center marker on the authoritative card',()=>{
 const counts={};let seed=917;
 const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<1500;i++){
  const expected=ODDS[i%ODDS.length].v,plan=reelPlan(expected,rng);
  assert.equal(plan.cards[Math.floor(plan.stopX/REEL_PITCH)],expected);
  assert.ok(plan.stopX%REEL_PITCH<100);
  plan.cards.forEach((v,index)=>{if(index!==plan.stop)counts[v]=(counts[v]||0)+1;});
 }
 for(const {v,w}of ODDS)assert.ok(Math.abs(counts[v]/58500-w/10000)<.012);
 assert.equal(reelEase(0),0);assert.equal(reelEase(1),1);
 assert.ok(reelEase(.25)-reelEase(0)>reelEase(1)-reelEase(.75));
 assert.equal(ROLL_REVEAL_MS,REEL_DURATION_MS);
});
test('bet preview matches multipliers, resource caps and power modifiers',async()=>{const {betPreview}=await import('../public/rules.js');const s={players:[{id:'a',money:3,double:true}],board:{'0,0':{owner:'a',hp:10},'1,0':{owner:'a',hp:0}}};let rows=betPreview(s,'a',2,3);assert.equal(rows.find(r=>r.value===2).gain,20);assert.deepEqual(rows.find(r=>r.value===-2),{value:-2,gain:0,loss:1,money:3});s.players[0].lucky=true;assert.equal(betPreview(s,'a',2,3).find(r=>r.value===-2).loss,0);assert.equal(betPreview(s,'a',99,3),null);});
