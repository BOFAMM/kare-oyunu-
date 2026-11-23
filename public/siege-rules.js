import {POWERS} from './rules.js';

export const SIEGE=Object.freeze({repurchaseMs:30000,peaceMs:120000,countdownMs:10000,incomeMs:25000,income:20,shrinkMs:45000,startMoney:80,startTroops:0});
const changes={
 10:{desc:'Haritadaki her generaline 10 can ekle.'},
 11:{name:'Gelir ablukası',hostile:true,target:'player',desc:'Rakibin sıradaki 20 dolarlık ödemesini durdur.'},
 12:{name:'Zehir maskesi',desc:'Rakibin sıradaki Zehir Bulutu saldırısını bir kez engelle. Lazer hasarı sürer.'},
 14:{desc:'Sekiz saniye boyunca rakip saldırı ve güçlerinden korun. Lazer hasarı devam eder.'}
};
export const SIEGE_POWERS=POWERS.filter(c=>[4,5,7,10,11,12,14].includes(c.id)).map(c=>({...c,...changes[c.id]}));
