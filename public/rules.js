export const SIZE=50;
export const REEL_DURATION_MS=1900;
export const ROLL_REVEAL_MS=REEL_DURATION_MS;
export const multiplierLabel=value=>(value<0?'−':'+')+Math.abs(value);
export const ODDS=[{v:1,w:4500},{v:-1,w:3500},{v:2,w:750},{v:-2,w:750},{v:5,w:200},{v:-5,w:200},{v:10,w:100}];
export const REEL_PITCH=108;
export const reelEase=t=>1-(1-t)**4;
export function reelPlan(value,rng=Math.random){
 const start=4, stop=32;
 const cards=Array.from({length:40},()=>face(rng()));
 cards[stop]=value;
 const edge=rng()<.5?12:88;
 return {cards,startX:start*REEL_PITCH+50,stopX:stop*REEL_PITCH+edge,stop};
}
export const COLORS=['#4d9fe8','#e87864','#b38be2','#efbd52','#63bd90','#ed91b1'];
export const POWERS=[
 {id:1,name:'Dolu kese',icon:'◈',price:30,uses:1,desc:'Kasana 30$ ekle. Başlangıçta seçilirse hemen uygulanır.'},
 {id:2,name:'Yer değişimi',icon:'⇄',price:35,uses:1,target:'player',hostile:true,desc:'Ordunun tamamını, generaller dahil, rakibin ordusuyla takas et.'},
 {id:3,name:'Kese takası',icon:'⇆',price:25,uses:1,target:'player',hostile:true,desc:'Kasandaki dolarları seçtiğin rakibin kasasıyla takas et.'},
 {id:4,name:'Zehir bulutu',icon:'☁',price:30,uses:1,target:'player',hostile:true,desc:'Rakibin normal askerlerinin yarısını kaldır. Generaller korunur.'},
 {id:5,name:'Denizaltı füzesi',icon:'➶',price:45,uses:3,target:'cell',hostile:true,desc:'3×3 alandaki her birime 1 hasar. Kendi generallerin korunur; kendi normal askerlerin etkilenebilir. 3 atış.'},
 {id:6,name:'Işın kapısı',icon:'◎',price:20,uses:1,target:'cell',desc:'Generalini hedef kareye taşı; tüm ordunun şeklini aynen koru. Dolu alan reddedilir.'},
 {id:7,name:'Çeyrek pay',icon:'¼',price:30,uses:1,target:'player',hostile:true,desc:'Rakibin parasının ve birim sayısının %25’ini al. General sayılır ama silinmez.'},
 {id:8,name:'Mola vakti',icon:'Ⅱ',price:25,uses:3,target:'player',hostile:true,desc:'Rakibin sıradaki hamlesini atlat. 3 kullanım.'},
 {id:9,name:'Çifte şans',icon:'×2',price:20,uses:2,desc:'Bu hamledeki pozitif zar kazancını ikiye katla. Olasılık değişmez. 2 kullanım.'},
 {id:10,name:'Çelik yürek',icon:'♥',price:30,uses:1,desc:'Tüm generallerin canı 20 olur. Yeni generaller de 20 canla gelir.'},
 {id:11,name:'Kasa kilidi',icon:'▣',price:35,uses:2,desc:'Sıra sana dönene kadar rakiplerin harcamasını, güçlerini ve dolara dönüşümü kilitle. 2 kullanım.'},
 {id:12,name:'Şans kalkanı',icon:'◇',price:15,uses:1,desc:'Bu hamledeki eksi zarın bütün kaybını önle. Zardan önce etkinleştir.'},
 {id:13,name:'Yarım pay',icon:'½',price:40,uses:1,target:'player',hostile:true,desc:'Rakibin birim sayısının yarısını al. Generaller sayılır ama korunur; gerçek alınan asker kadar kazanırsın.'},
 {id:14,name:'Dokunulmazlık',icon:'⬡',price:25,uses:3,desc:'Sıra sana dönene kadar saldırı ve rakip güçlerinden korun. 3 kullanım.'},
 {id:15,name:'Yeniden dizilim',icon:'▦',price:20,uses:-1,desc:'Generaller yerinde kalır; normal askerleri bitişik olarak yeniden diz. Yeniden dizilim hakları saldırıda kullanılamaz; diğer güçler kullanılabilir.'}
];
export const key=(x,y)=>x+','+y;
export const xy=k=>k.split(',').map(Number);
export const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
export const neighbors=(x,y)=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inside(a,b));
export function units(s,id){return Object.entries(s.board).filter(([,u])=>u.owner===id);}
export function connected(s,id){const todo=units(s,id).filter(([,u])=>u.hp>0).map(([k])=>k), found=new Set(todo);for(let i=0;i<todo.length;i++)for(const [x,y]of neighbors(...xy(todo[i]))){const k=key(x,y);if(s.board[k]?.owner===id&&!found.has(k)){found.add(k);todo.push(k);}}return found;}
export function adjacent(s,id,x,y){const own=units(s,id);const c=own.some(([,u])=>u.hp)?connected(s,id):new Set(own.map(([k])=>k));return neighbors(x,y).some(([a,b])=>c.has(key(a,b)));}
export function face(r){if(!(r>=0&&r<1))throw Error('Rastgele değer 0 ile 1 arasında olmalı.');let n=r*10000;for(const o of ODDS){if(n<o.w)return o.v;n-=o.w;}return 10;}
export function project(x,y){return {x:(x-y)*24,y:(x+y)*16};}
export function unproject(x,y){return {x:Math.round((x/24+y/16)/2),y:Math.round((y/16-x/24)/2)};}
export function shuffled(a,rng){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function dismissalPlan(s,id,k){
 const unit=s.board[k];if(unit?.owner!==id)return {ok:false,reason:'Kendi askerlerinden birini seç.'};
 const component=new Set([k]),todo=[k];
 for(let i=0;i<todo.length;i++)for(const [x,y]of neighbors(...xy(todo[i]))){const n=key(x,y);if(s.board[n]?.owner===id&&!component.has(n)){component.add(n);todo.push(n);}}
 component.delete(k);
 if(component.size){const queue=[component.values().next().value],seen=new Set(queue);for(let i=0;i<queue.length;i++)for(const [x,y]of neighbors(...xy(queue[i]))){const n=key(x,y);if(component.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}}if(seen.size!==component.size)return {ok:false,reason:'Bu kareyi silmek orduyu böler. Uçlardan veya dış kenarlardan seç.'};}
 const transfer=unit.hp?todo.slice(1).find(n=>!s.board[n].hp):null;
 if(unit.hp&&!transfer)return {ok:false,reason:'General rütbesini aktaracak normal asker kalmadı.'};
 return {ok:true,transfer};
}
export function betPreview(s,id,troops,money){const p=s.players.find(p=>p.id===id);if(!p||![troops,money].every(n=>Number.isSafeInteger(n)&&n>=0)||troops>units(s,id).length||money>p.money)return null;return ODDS.map(({v})=>({value:v,gain:v>0?(troops+money)*v*(p.double?2:1):0,loss:v<0&&!p.lucky?Math.min(troops*-v,units(s,id).filter(([,u])=>!u.hp).length):0,money:v<0&&!p.lucky?Math.min(money*-v,p.money):0}));}

// A vacant destination must reconnect every branch formerly joined by the general.
export function generalDestinations(s,owner,x,y){
 const origin=key(x,y),seen=new Set([origin]),branches=[];
 for(const [ax,ay] of neighbors(x,y)){
  const start=key(ax,ay);if(seen.has(start)||s.board[start]?.owner!==owner)continue;
  const queue=[start],edges=new Set();seen.add(start);
  for(let i=0;i<queue.length;i++)for(const [nx,ny] of neighbors(...xy(queue[i]))){
   const k=key(nx,ny);if(seen.has(k))continue;
   if(s.board[k]?.owner===owner){seen.add(k);queue.push(k);}
   else if(!s.board[k])edges.add(k);
  }
  branches.push(edges);
 }
 return (tx,ty)=>{
  if(!inside(tx,ty))return false;
  const k=key(tx,ty),u=s.board[k];
  return u?u.owner===owner&&!u.hp:branches.every(edges=>edges.has(k));
 };
}
