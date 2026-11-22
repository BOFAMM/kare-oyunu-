import {POWERS} from './rules.js';

export const SIEGE=Object.freeze({peaceMs:120000,incomeMs:20000,income:40,troopMs:4000,shrinkMs:15000,hastePrice:600,startMoney:80,startTroops:5});
const changes={
 1:{name:'Saha erzağı',desc:'Hemen 4 yerleştirme hakkı al.'},
 8:{name:'İkmal kesintisi',desc:'Rakibin sıradaki asker üretimini engelle. Depodaki askerler korunur.'},
 9:{name:'Çifte sevkiyat',desc:'Sonraki dört asker üretiminin her birinde bir ek asker kazan.'},
 10:{desc:'Haritadaki her generaline 10 can ekle. Yeni generaller ödenen bedel kadar canla başlar.'},
 11:{name:'Gelir ablukası',hostile:true,target:'player',desc:'Rakibin sıradaki 40 dolarlık ödemesini durdur.'},
 12:{name:'Zehir maskesi',desc:'Ordun bir sonraki zehir darbesinden korunur. İlk zarar anında tüketilir.'},
 14:{desc:'Sekiz saniye boyunca rakip saldırı ve güçlerinden korun. Lazer zehrine karşı işlemez.'},
 15:{desc:'Bağlantıları koruyarak askerleri geri çek. Aldığın dizilim haklarıyla yalnızca boş kareye yerleş.'}
};
export const SIEGE_POWERS=POWERS.map(card=>({...card,...changes[card.id]}));
