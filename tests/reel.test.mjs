import test from 'node:test';
import assert from 'node:assert/strict';
import {ODDS,multiplierLabel,REEL_DURATION_MS,ROLL_REVEAL_MS} from '../public/rules.js';
import {dicePose,faces} from '../public/dice.js';

test('twelve pentagonal faces settle on every authoritative roll result',()=>{
 assert.equal(faces.length,12);
 assert.ok(faces.every(f=>f.corners.length===5));
 for(const {v}of ODDS){
  const pose=dicePose(v,1);
  const front=[...faces].sort((a,b)=>pose(b.z)[2]-pose(a.z)[2])[0];
  assert.equal(front.value,v);
  assert.ok(pose(front.z)[2]>.9);
  assert.ok(faces.every(f=>pose(f.z).every(Number.isFinite)));
 }
 assert.equal(multiplierLabel(10),'+10');
 assert.equal(multiplierLabel(-2),'−2');
 assert.equal(REEL_DURATION_MS,5000);
 assert.equal(ROLL_REVEAL_MS,REEL_DURATION_MS);
});
test('bet preview matches multipliers, resource caps and power modifiers',async()=>{const {betPreview}=await import('../public/rules.js');const s={players:[{id:'a',money:3,double:true}],board:{'0,0':{owner:'a',hp:10},'1,0':{owner:'a',hp:0}}};let rows=betPreview(s,'a',2,3);assert.equal(rows.find(r=>r.value===2).gain,20);assert.deepEqual(rows.find(r=>r.value===-2),{value:-2,gain:0,loss:1,money:3});s.players[0].lucky=true;assert.equal(betPreview(s,'a',2,3).find(r=>r.value===-2).loss,0);assert.equal(betPreview(s,'a',99,3),null);});
