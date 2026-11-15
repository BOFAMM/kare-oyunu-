import {GENERALS} from './cosmetics.js';
const cache=new Map();
export function spriteId(id){return GENERALS.some(g=>g.id===id)?id:GENERALS[0].id;}
export function spriteFrame(age,loop=true,reduced=false){return reduced?0:loop?Math.floor(Math.max(0,age)/90)%10:Math.min(9,Math.floor(Math.max(0,age)/90));}
export function drawCharacter(c,skin,action,age,x,y,{loop=true,reduced=false,alpha=1}={}){if(typeof Image==='undefined')return false;skin=spriteId(skin);const path='/assets/characters/'+skin+'/'+action+'.png';let img=cache.get(path);if(!img){img=new Image();img.src=path;cache.set(path,img);}if(!img.complete||!img.naturalWidth)return false;const frame=spriteFrame(age,loop,reduced),w=skin.startsWith('elf')?260:230,h=w*.55;c.save();c.globalAlpha*=alpha;c.drawImage(img,(frame%5)*400,Math.floor(frame/5)*220,400,220,x-w*.5,y-h*(skin.startsWith('elf')?.785:.82),w,h);c.restore();return true;}

export function preloadCharacter(skin){if(typeof Image==='undefined')return;for(const action of ['idle','walk','attack','hurt','die']){const path='/assets/characters/'+spriteId(skin)+'/'+action+'.png';if(!cache.has(path)){const img=new Image();img.src=path;cache.set(path,img);}}}
