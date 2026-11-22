// Player-facing values use touch controls. The private administrator form keeps its own inputs.
const eligible='input#code,input#name,input[type=number]';
function prepare(root){
 for(const input of root.querySelectorAll(eligible)){
  if(input.closest('#admin-dialog'))continue;
  input.readOnly=true;input.inputMode='none';
 }
}
prepare(document);
new MutationObserver(records=>{
 for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.querySelector?.(eligible))prepare(node);
}).observe(document.body,{childList:true,subtree:true});
const pad=document.createElement('dialog');
pad.setAttribute('aria-label','Değer seçimi');
document.body.append(pad);
function openPad(input){
 const name=input.id==='name',code=input.id==='code',numeric=!name&&!code;
 let value=input.value;
 pad.replaceChildren();
 const title=document.createElement('h2');title.textContent=name?'Komutan adı':code?'Oda kodu':'Miktar seç';pad.append(title);
 const current=document.createElement('output');current.style.cssText='display:block;font-size:24px;margin:12px 0';pad.append(current);
 const keys=document.createElement('div');keys.style.cssText='display:grid;grid-template-columns:repeat('+ (name?7:3)+',1fr);gap:4px';pad.append(keys);
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{fn();draw()};keys.append(b);return b;}
 function draw(){current.textContent=value||'—';done.disabled=code?value.length!==6:!value.length;}
 if(numeric){
  const min=Number(input.min||0),max=input.max?Number(input.max):1000000;
  for(const delta of [-10,-1,1,10,50])button((delta>0?'+':'')+delta,()=>value=String(Math.max(min,Math.min(max,Number(value)+delta))));
  button('Tümü',()=>value=String(max));
 }else{
  for(const k of name?'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789':'1234567890')button(k,()=>{if(value.length<input.maxLength)value+=k});
  button('Sil',()=>value=value.slice(0,-1));button('Temizle',()=>value='');
 }
 function close(){pad.close();input.focus();}
 button('Vazgeç',close);const done=button('Tamam',()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));close();});
 draw();pad.showModal();
}
function field(target){return target.matches?.(eligible)&&!target.closest('#admin-dialog');}
document.addEventListener('click',e=>{if(field(e.target))openPad(e.target);});
document.addEventListener('keydown',e=>{if(field(e.target)&&['Enter',' '].includes(e.key)){e.preventDefault();openPad(e.target);}});
