import test from 'node:test';
import assert from 'node:assert/strict';
import {ODDS,reelPlan,reelEase,reelClickTimes,multiplierLabel,REEL_DURATION_MS,ROLL_REVEAL_MS} from '../public/rules.js';
test('filler cards follow weighted probabilities instead of uniform face selection',()=>{
 let seed=20261114;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),counts={};let total=0;
 for(let i=0;i<1000;i++){const p=reelPlan(10,rng);assert.equal(p.faces[p.stop],10);p.faces.forEach((v,index)=>{if(index!==p.stop){counts[v]=(counts[v]||0)+1;total++;}});}
 for(const {v,w}of ODDS)assert.ok(Math.abs(counts[v]/total-w/10000)<.007,'face '+v);assert.ok(counts[10]<total*.02);
});
test('needle stops inside the real winning card near either edge at all viewport widths',()=>{
 for(const random of [.01,.49,.51,.99])for(const width of [300,760,1400])for(const {v}of ODDS){const p=reelPlan(v,()=>random),pointer=width*p.pointerFraction,distance=p.stop*108+p.hitX-pointer;const underPointer=pointer+distance;assert.equal(Math.floor(underPointer/108),p.stop);assert.ok(p.hitX>=7&&p.hitX<=93);assert.ok(p.hitX<15||p.hitX>85);assert.equal(p.pointerFraction,.5);}
});
test('reel slows monotonically and tick intervals grow along the same trajectory',()=>{
 assert.equal(reelEase(0),0);assert.equal(reelEase(1),1);const times=reelClickTimes(8400,320,REEL_DURATION_MS);assert.ok(times.length>70);const gaps=times.slice(1).map((t,i)=>t-times[i]);for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]>=gaps[i-1]-1e-8);assert.ok(gaps.at(-1)>gaps[0]*10);assert.equal(REEL_DURATION_MS,5000);assert.equal(ROLL_REVEAL_MS,REEL_DURATION_MS);
 assert.equal(multiplierLabel(10),'+10');assert.equal(multiplierLabel(-2),'−2');
});

test('bet preview matches multipliers, resource caps and power modifiers',async()=>{const {betPreview}=await import('../public/rules.js');const s={players:[{id:'a',money:3,double:true}],board:{'0,0':{owner:'a',hp:10},'1,0':{owner:'a',hp:0}}};let rows=betPreview(s,'a',2,3);assert.equal(rows.find(r=>r.value===2).gain,20);assert.deepEqual(rows.find(r=>r.value===-2),{value:-2,gain:0,loss:1,money:3});s.players[0].lucky=true;assert.equal(betPreview(s,'a',2,3).find(r=>r.value===-2).loss,0);assert.equal(betPreview(s,'a',99,3),null);});
