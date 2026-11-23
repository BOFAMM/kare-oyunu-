import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,cp,rm} from 'node:fs/promises';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRoom,addPlayer,tick} from '../engine.mjs';

test('two HTTP clients racing for a cell spend one unit, retain the losing order budget and can continue',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'kare-siege-race-'));
 const root=fileURLToPath(new URL('../',import.meta.url));
 let child;
 try{
  await mkdir(path.join(dir,'public'));await mkdir(path.join(dir,'.data'));
  for(const f of ['engine.mjs','server.mjs','package.json','public/siege-rules.js','public/rules.js','public/cosmetics.js'])await cp(path.join(root,f),path.join(dir,f));
  let s=createRoom('111111','a','Lâl');addPlayer(s,'a','Lâl');addPlayer(s,'b','Ayaz');
  s.mode='siege';s.order=['a','b'];s.stage='countdown';s.deadline=0;
  s.board={'20,20':{owner:'a',hp:10},'22,20':{owner:'b',hp:10}};
  s=tick(s,Date.now());for(const p of s.players)p.pending=5;
  await writeFile(path.join(dir,'.data/rooms.json'),JSON.stringify({rooms:[[s.code,s]],sessions:['a','b'].map(id=>[id,{id,code:s.code}])}));
  child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,PORT:'0',HOST:'127.0.0.1',KARE_OWNER_LAB:'0'},windowsHide:true});
  const [out]=await once(child.stdout,'data',{signal:AbortSignal.timeout(5000)});
  const base='http://127.0.0.1:'+String(out).match(/localhost:(\d+)/)[1];
  const place=(id,x,y)=>fetch(base+'/api/action',{method:'POST',headers:{Authorization:'Bearer '+id,'Content-Type':'application/json'},body:JSON.stringify({type:'place',x,y,expectedOwner:null})});
  const replies=await Promise.all(['a','b'].map(id=>place(id,21,20)));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,400]);
  const winner=replies[0].ok?'a':'b',loser=winner==='a'?'b':'a';
  const state=(await (await fetch(base+'/api/state',{headers:{Authorization:'Bearer '+loser}})).json()).state;
  assert.equal(state.board['21,20'].owner,winner);
  const poll=revision=>fetch(base+'/api/state?since='+revision,{headers:{Authorization:'Bearer '+loser}}).then(r=>r.json());
  const same=await poll(state.revision);assert.equal(same.unchanged,true);assert.equal(same.state,undefined);
  const newer=await poll(state.revision-1);assert.equal(newer.state.revision,state.revision);
  assert.equal(state.players.find(p=>p.id===winner).pending,4);assert.equal(state.players.find(p=>p.id===loser).pending,5);
  assert.equal((await place(loser,loser==='a'?19:23,20)).status,200);
 }finally{
  if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
  await rm(dir,{recursive:true,force:true});
 }
});