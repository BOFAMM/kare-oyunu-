import {THEMES} from '/cosmetics.js';
const base='/worlds/';
const storage='kare-world-preference';
let selected='',land=null;
const materials=new Image();
materials.src=base+'materials.webp';
materials.onload=()=>window.dispatchEvent(new Event('kare-landscape'));
const actors=new Image();
actors.src=base+'actors.webp';
const choose=id=>{
 selected=THEMES.some(theme=>theme.id===id)?id:'';
 land=null;
 if(selected){ land=new Image();land.src=base+selected+'.webp'; }
 window.dispatchEvent(new Event('kare-landscape'));
};
try{choose(localStorage.getItem(storage));}catch{choose('');}
const dialog=document.createElement('dialog');
dialog.className='world-picker';
dialog.setAttribute('aria-labelledby','world-title');
dialog.innerHTML='<div class="modal-head"><h2 id="world-title">Dünya atlası</h2><button class="icon" aria-label="Kapat">×</button></div><p>Bu cihazda haritanın çevresini seç.</p><div class="world-grid"></div>';
document.body.append(dialog);
dialog.querySelector('.icon').onclick=()=>dialog.close();
for(const {id,name} of [{id:'',name:'Kale kıyısı'},...THEMES]){
 const button=document.createElement('button');
 const art=new Image();art.alt='';art.loading='lazy';art.src=id?base+id+'.webp':'/assets/arena/ocean.webp';
 button.append(art,document.createTextNode(name));button.dataset.world=id;
 button.onclick=()=>{choose(id);try{localStorage.setItem(storage,id);}catch{}dialog.close();};
 dialog.querySelector('.world-grid').append(button);
}
for(const [selector,label] of [['.camp-treasures','Dünyalar'],['#map-controls','Dünya']]){
 const button=document.createElement('button');button.className='world-open';
 button.textContent=label;button.title='Dünya atlasını aç';
 button.onclick=()=>{for(const b of dialog.querySelectorAll('[data-world]'))b.setAttribute('aria-pressed',String(b.dataset.world===selected));dialog.showModal();};
 document.querySelector(selector).append(button);
}
window.kareEnvironment={ground(){
 if(!selected||!materials.naturalWidth)return null;
 const index=THEMES.findIndex(theme=>theme.id===selected);
 return {image:materials,x:index%4*256,y:Math.floor(index/4)*256};
},draw(ctx,w,h,t){
 if(!land?.naturalWidth)return false;
 const scale=Math.max((w+16)/land.width,(h+12)/land.height),dw=land.width*scale,dh=land.height*scale;
 const drift=t?Math.sin(t/12000)*5:0;
 ctx.drawImage(land,(w-dw)/2+drift,(h-dh)/2,dw,dh);
 if(actors.naturalWidth){
  const row=THEMES.findIndex(theme=>theme.id===selected),frame=Math.floor(t/(row===2?145:205))%4;
  const sw=actors.width/4,sh=actors.height/7,size=Math.min(145,Math.max(64,w*.13));
  const x=t?(t/(row===5?140:90)+w*.18)%(w+size)-size:w*.14;
  const y=h*.25+Math.sin(t/3100)*h*.04;
  ctx.drawImage(actors,frame*sw,row*sh,sw,sh,x,y,size,size);
 }
 return true;
}};
