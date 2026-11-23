import {SIZE,connected,dismissalPlan,generalDestinations,inside,key,neighbors,units,xy} from './rules.js';

const note=(title,text,selector=null,mood='calm',tile=null)=>({title,text,selector,mood,tile});
const field=(title,text,tile,mood)=>note(title,text,'#board',mood,tile);
const range=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
const exposure=(b,[x,y])=>Math.max(0,b.left-x,x-b.right)+Math.max(0,b.top-y,y-b.bottom);
function frontier(s,p,army){
 const starts=army.some(([,u])=>u.hp)?connected(s,p.id):new Set(army.map(([k])=>k));
 const seen=new Set(),result=[];
 for(const k of starts)for(const cell of neighbors(...xy(k))){
  const id=key(...cell);
  if(!seen.has(id)&&s.board[id]?.owner!==p.id){seen.add(id);result.push(cell);}
 }
 return result;
}
function best(items,score){
 let chosen=null,maximum=-Infinity;
 for(const item of items){const value=score(item);if(value>maximum){maximum=value;chosen=item;}}
 return chosen;
}
function landing(s,p){
 const center=[24,23],vacancies=[];
 for(let y=0;y<=SIZE-5;y++)for(let x=0;x<=SIZE-2;x++)vacancies.push([x,y]);
 vacancies.sort((a,b)=>range(a,center)-range(b,center));
 return vacancies.find(([x,y])=>{
  for(let j=0;j<5;j++)for(let i=0;i<2;i++)if(s.board[key(x+i,y+j)])return false;
  return true;
 });
}
function fieldPlan(s,p){
 const army=units(s,p.id),generals=army.filter(([,u])=>u.hp),candidates=frontier(s,p,army);
 const enemies=Object.entries(s.board).filter(([,u])=>u.owner!==p.id);
 const zone=s.siege,b=zone?.bounds,focus=zone?.focus;
 const enemyCells=enemies.map(([k])=>xy(k));
 const near=point=>enemyCells.reduce((d,c)=>Math.min(d,range(point,c)),SIZE*2);
 const score=point=>-(b?exposure(b,point)*SIZE*3:0)-(focus?range(point,[focus.x,focus.y])*(zone.war?1.3:.45):0)-near(point);
 const vacant=()=>best(candidates.filter(c=>!s.board[key(...c)]),score);
 return {army,generals,candidates,enemies,vacant};
}
function rescue(s,p,army,source){
 const {bounds:b,focus}=s.siege,valid=generalDestinations(s,p.id,...source);
 const cells=[];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(valid(x,y))cells.push([x,y]);
 const friends=new Set(army.map(([k])=>k));
 return best(cells,point=>{
  const support=neighbors(...point).some(n=>friends.has(key(...n)));
  return -exposure(b,point)*SIZE*5+(support?SIZE*2:0)-(focus?range(point,[focus.x,focus.y]):0);
 });
}
function tacticalAttack(s,p,plan){
 if(!p.pending||!plan.generals.length||!(s.mode==='siege'?s.siege.war:s.round>5))return null;
 return best(plan.candidates,c=>{
  const k=key(...c),u=s.board[k];
  if(!u||s.players.find(q=>q.id===u.owner)?.shield||s.siege&&exposure(s.siege.bounds,c))return -Infinity;
  // A normal edge must be removable without splitting its owner's formation.
  if(u.hp<=1&&!dismissalPlan(s,u.owner,k).ok){
   // A general with one hit left can be captured even without a successor.
   if(!u.hp||neighbors(...c).filter(n=>s.board[key(...n)]?.owner===u.owner).length>1)return -Infinity;
  }
  return u.hp===1?1000:u.hp?30-Math.min(u.hp,24):10;
 });
}
function targetAdvice(s,p,t,plan){
 if(t.type==='heal'){
  const weakest=best(plan.generals,([,u])=>-u.hp);
  if(weakest)return field('Yaralı general','En az canı kalan generalin burada. İyileştirmek için ona dokun.',xy(weakest[0]));
 }
 if(t.type==='move-general'){
  const dest=rescue(s,p,plan.army,[t.x,t.y]);
  if(dest){
   const swap=!!s.board[key(...dest)];
   const text=swap?'Kendi askerinle yer değiştirebilirsin. Dokunduğunda general buraya, asker eski mevziye geçer.':'Bu kareye dokunursan generalin mevcut canıyla taşınır. Ordunun bağlantısı korunur.';
   return field(exposure(s.siege.bounds,dest)?'Ulaşılabilir mevzi':'Güvenli mevzi',text,dest);
  }
 }
 if(t.type==='general'){
  const dest=plan.vacant();if(dest)return field('Yeni komutan','Bu boş kare orduna kenardan bağlı. Generalini buraya çağırabilirsin.',dest,'happy');
 }
 if(t.power===5){
  const scores=new Map(),shielded=new Set(s.players.filter(q=>q.shield).map(q=>q.id));
  for(const [k,u] of Object.entries(s.board)){
   if(shielded.has(u.owner)||u.owner===p.id&&u.hp)continue;
   const [x,y]=xy(k);
   for(let j=Math.max(0,y-1);j<=Math.min(SIZE-1,y+1);j++)for(let i=Math.max(0,x-1);i<=Math.min(SIZE-1,x+1);i++){
    const id=key(i,j);scores.set(id,(scores.get(id)||0)+(u.owner===p.id?-3:u.hp===1?3:1));
   }
  }
  const shot=best([...scores].filter(([,n])=>n>0),([,n])=>n);
  if(shot)return field('Atış merkezi','Bu karenin çevresindeki 3 × 3 bölgeyi vurursun. Kendi erlerinin isabet almasını da hesaba kattım.',xy(shot[0]),'alert');
 }
 if(t.power===6&&plan.army.length){
  const anchor=xy((plan.generals[0]||plan.army[0])[0]);
  const goals=plan.enemies.filter(([,u])=>u.hp).map(([k])=>xy(k));
  const tiles=plan.army.map(([k])=>xy(k)),valid=[];
  for(const dest of neighbors(...anchor)){
   const dx=dest[0]-anchor[0],dy=dest[1]-anchor[1];
   if(tiles.every(([x,y])=>inside(x+dx,y+dy)&&(!s.board[key(x+dx,y+dy)]||s.board[key(x+dx,y+dy)].owner===p.id)))valid.push(dest);
  }
  const dest=best(valid,c=>-goals.reduce((n,g)=>Math.min(n,range(c,g)),SIZE*2));
  if(dest)return field('Işın geçidi','Bu kareyi seçersen tüm dizilimin aynı yönde kayar. Yeni yerde rakiple çakışan birliğin yok.',dest);
 }
 return note('Hedef seçimi','Uygun bir hedef göremiyorum. Vazgeç ile haritaya dönüp başka bir hamle seçebilirsin.','#cancel-target');
}
export function guideAdvice({state:s,p,mine,target,picks=[],animating},ui={},now=Date.now()){
 const siege=s.mode==='siege',stage=s.stage;
 if(stage==='lobby'){
  if(p.id!==s.host)return note('Kamp ateşi','Oda kurucusu maçı başlattığında generalini ve güçlerini birlikte seçeceğiz.');
  return s.players.length<2?note('Takım toplanıyor','Bir arkadaşına oda kodunu verebilir veya bot ekleyip hemen başlayabilirsin.','#bot'):note('Meydan çağırıyor','En az iki komutan hazır. Maçı başlatıp generallerimizi seçelim.','#start','happy');
 }
 if(stage==='draft'){
  if(p.chosen)return note('Birliğin hazır','Seçimlerini yaptın. Diğer komutanlar hazır olduğunda sahaya ineceğiz.',null,'happy');
  if(!p.generalSkin)return note('Generalini seç','Ordunu hangi komutan yönetsin? Portresine dokun.','[data-skin]:not(:disabled)');
  if(picks.length<2)return note('Gücünü seç',picks.length?'Bir kart daha seç. İki gücü de maçta kullanabilirsin.':'Üç karttan ikisini alabilirsin. İlk kartın için bir simgeye dokun.','[data-pick][aria-pressed=false]');
  return note('Hazırız','İki kartın seçildi. Takımını onaylayıp sahaya inelim.','#confirm-powers','happy');
 }
 if(stage==='countdown')return note('Karargâh kuruldu',siege?'Sayım bitince iki dakikalık hazırlık başlar. İlk işimiz takviye almak.':'Sayım bitince ilk komutan çarkı çevirecek.',null,'happy');
 if(stage==='placement'){
  if(siege&&p.spawn)return p.ready?note('Sıradaki birlikler','Yerimiz belli. Diğer komutanların hazırlığını bekliyoruz.',null,'happy'):note('Mevziyi onayla',p.spawn.moved?'Seçtiğin yer doluydu. En yakın boş yere yerleştik. Hazırım düğmesine dokun.':'Birliklerin yerinde. Hazırım düğmesine dokun.','#siege-ready','happy');
  if(!siege&&!mine)return note('Keşif zamanı','Diğer komutan yerini seçiyor. Sıran geldiğinde boş bir kamp yeri işaretleyeceğim.');
  const dest=landing(s,p);
  return dest?field('Karargâhını kur','Burada iki kare genişliğinde, beş kare uzunluğunda boş arazi var. Dokunursan generalin başa yerleşir.',dest):note('Karargâh için yer aranıyor','Tahtada boş bir 2 × 5 alan kalmadı.');
 }
 if(stage==='ended')return note(s.winner===p.id?'Zafer senin!':'Çarpışma sona erdi',s.winner===p.id?'Birliklerin meydanı tuttu. Sonuçları birlikte inceleyebiliriz.':'Generallerin ve orduların son durumunu sonuç ekranında görebilirsin.',null,s.winner===p.id?'happy':'calm');
 if(p.eliminated)return note('Gözcü kulesi','Birliğin elendi. Hayatta kalan komutanların karşılaşmasını izleyebilirsin.');
 if(!siege&&!mine)return note('Sıradaki komutan','Rakip oynarken dış kenarlarını gözle. Sıra sana geçince hamleni göstereceğim.');
 if(animating||now<(s.revealUntil||0))return note('Çark dönüyor','Sonuç belli olunca birliklerini nereye yönlendirebileceğimizi göstereceğim.');
 if(siege&&s.siege.inset>=25)return note('Son lazer darbesi','Güvenli alan kapandı. Sahadaki generallerin kalan canı sonucu belirliyor.',null,'alert');
 const plan=fieldPlan(s,p);
 if(target)return targetAdvice(s,p,target,plan);
 if(!siege&&p.lossRemaining){
  const soldier=plan.army.find(([k,u])=>!u.hp&&dismissalPlan(s,p.id,k).ok);
  return soldier?field('Geri çekil!',p.lossRemaining+' birlik çekilecek. Bu asker geri çekilirse diğer birlikler bağlı kalır.',xy(soldier[0]),'alert'):note('Birlik kaybı','Kayıpları güvenli sırayla tamamlamak için otomatik çekilmeyi seç.','#auto-loss','alert');
 }
 if(!siege&&s.round>=3&&!p.rolled&&(!s.lock||s.lock===p.id)){
  if(p.inventory[12]&&!p.lucky)return note('Kaybı önle','Şans kalkanın var. Çarkı çevirmeden Güçlerim menüsünden açarsan eksi sonuçta kayıp yaşamazsın.','#powers');
  if(p.inventory[9]&&!p.double)return note('Kazancı katla','Bahisten önce Çifte şans kullanabilirsin. Artı bir sonuç gelirse kazancın ikiye katlanır.','#powers','happy');
 }
 if(siege){
  const {bounds:b,war}=s.siege;
  const danger=plan.generals.find(([k])=>exposure(b,xy(k))>0);
  if(danger)return field('Lazer hattındasın!',(danger[1].zoneDamage||5)+' canlık darbe yaklaşıyor. Bu generale dokun, sonra güvenli bir kareye taşı.',xy(danger[0]),'alert');
  if(!plan.generals.length&&p.money>=10&&!(p.cooldowns?.general>now))return note('Komutan çağır','Saldırı için bir general gerek. Marketten yeni general alıp ordunun yanına yerleştir.','#siege-market','alert');
  if(war&&(p.inventory[10]||0)>0&&plan.generals.some(([,u])=>u.hp<=5))return note('General yaralı','Çelik yürek kartın hazır. Açıp kullanırsan her generalin 10 can kazanır.','[data-card="10"]','alert');
 }
 if(p.pending||p.reform){
  const attack=tacticalAttack(s,p,plan);
  if(attack)return field('Cephede fırsat','Rakibin bu karesine kenardan ulaşıyorsun. Bir yedek harcayarak vurabilirsin.',attack,'happy');
  const dest=plan.vacant();
  if(dest)return field(siege&&s.siege.war?'Hattı ileri taşı':'Ordunu genişlet',siege&&exposure(s.siege.bounds,dest)?'Buraya asker koyabilirsin. Kırmızıdaki asker daralma anında düşer; güvenli bölgeye doğru ilerle.':'Bu boş kare orduna bağlı. Dokunarak bir yedek askeri sahaya indir.',dest);
 }
 if(siege){
  if(p.money>0&&!(p.cooldowns?.recruit>now))return note('Takviye zamanı','Bir dolar bir asker eder. Marketi aç, Asker al ile birliğine yedek kat.','#siege-market');
  return note('Sahayı oku',p.cooldowns?.recruit>now?'Takviye alımı yenileniyor. Sahadaki bir askere dokunursan 1 dolar geri alırsın.':'Gelir çubuğu dolunca 20 dolar gelecek. Şimdilik generalinin konumunu koru.','#siege-income');
 }
 if(!p.rolled){
  if(!ui.bet)return note('Bahsi hazırla','İlk denemede küçük bir birlik kullan. Asker bahsini sürgüyle belirle.','#troop-slider');
  return note('Çark sende','Bahsin hazır. Çarkı çevirip birliğinin sonucunu görelim.','#roll','happy');
 }
 return note('Hamleyi tamamla','Sahadaki işin bitti. Hamleyi bitir düğmesiyle sırayı sonraki komutana ver.','#end','happy');
}
