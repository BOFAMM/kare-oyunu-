import {GENERALS} from './cosmetics.js';
import {POWERS} from './rules.js';
import {powerNotice} from './battle-fx.js';

const emblem = ['','bag','swap','coin','poison','missile','gate','quarter','block','double','heart','lock','lucky','half','shield','grid'];
export const icon = name => `<svg class="sigil" aria-hidden="true" focusable="false"><use href="/assets/arena/sigils.svg#${name}"></use></svg>`;
export const powerIcon = id => icon(emblem[id] || 'spark');

export function setPane(name) {
  document.body.dataset.pane = name;
  document.querySelectorAll('#mobile-dock button').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.pane === name)));
}

export function installArena({modal, rules, powerCard, play}) {
  const byId = id => document.getElementById(id);
  const generals = () => modal('General arşivi', '<div class="general-archive">' + GENERALS.map(g =>
    `<article style="--unit-color:${g.color}"><img src="${g.portrait}" alt=""><h3>${g.name}</h3><small>${({bow:'Yay',sword:'Kılıç',staff:'Asa',wand:'Değnek'})[g.weapon]}</small></article>`
  ).join('') + '</div>');
  const powers = () => modal('Güç kitabı', '<div class="shop-grid">' + POWERS.map(p =>
    powerCard(p, '', `<small>${p.price} $ · ${p.uses === -1 ? 'Sınırsız kullanım' : p.uses + ' kullanım'}</small>`)
  ).join('') + '</div>');
  byId('guide-generals').onclick = generals;
  byId('guide-powers').onclick = powers;
  byId('guide-rules').onclick = rules;
  byId('quick-play').onclick = play;
  byId('mobile-dock').onclick = event => {
    const button = event.target.closest('button[data-pane]');
    if (button) setPane(button.dataset.pane);
  };
  byId('modal').addEventListener('close',()=>{
    const notice=byId('arena-callout');
    if(notice.parentNode===byId('modal'))document.body.appendChild(notice);
  });
  menuMotion(true);
}

let scene;
export function menuMotion(active) {
  scene?.destroy();
  scene = active ? window.ScrollCraft.mount(document.getElementById('welcome')) : null;
}

// Keep a burst of placements readable without delaying the next move.
export function moment(events, state, myId) {
  const ranked = ['win','eliminate','power','promote','hit','heal','buy','recruit','convert','turn','dismiss','place'];
  const type = ranked.find(kind => events.some(e => e.type === kind));
  if (!type || type === 'win') return null;
  const event = events.filter(e => e.type === type).at(-1);
  const player = state.players.find(p => p.id === event.player);
  const name = player?.name || 'Komutan';
  const count = events.filter(e => e.type === type && e.player === event.player).reduce((sum,e) => sum + (e.count || 1),0);
  const detail = name + ' · ' + state.round + '. tur';
  switch (type) {
    case 'power': {
      const effect = powerNotice(event, state.players);
      return {title:effect.title, detail:effect.detail, badge:emblem[event.power], tone:'arcane'};
    }
    case 'turn': return {title:event.player === myId ? 'Sıra sende!' : name + ' oynuyor', detail:state.round + '. tur · ' + (state.round <= 5 ? 'Barış dönemi' : 'Savaş dönemi'), badge:'flag', tone:'gold'};
    case 'eliminate': return {title:'Komutan elendi', detail:name, badge:'helm', tone:'danger'};
    case 'promote': return {title:event.fromX == null ? 'Yeni general!' : 'Rütbe aktarıldı', detail, badge:'helm', tone:'gold'};
    case 'hit': return {title:event.capture ? 'Kare ele geçirildi!' : 'İsabet!', detail, badge:'sword', tone:'danger'};
    case 'heal': return {title:'General iyileşti', detail:event.amount ? name + ' · +' + event.amount + ' can' : 'Can yenilendi', badge:'heart', tone:'jade'};
    case 'recruit': return {title:'Takviye hazır!', detail:name + ' · +' + event.amount + ' asker hakkı', badge:'helm', tone:'jade'};
    case 'buy': return {title:'Güç alındı', detail:name + ' · ' + POWERS.find(p => p.id === event.power)?.name, badge:'chest', tone:'arcane'};
    case 'convert': return {title:'+' + event.amount + ' dolar', detail, badge:'coin', tone:'gold'};
    case 'dismiss': return {title:'Birlik çekildi', detail:name + ' · −' + count + ' asker', burst:type, player:event.player, name, count, badge:'shield', tone:'danger'};
    case 'place': return {title:'Alan genişledi!', detail:name + ' · +' + count + ' kare', burst:type, player:event.player, name, count, badge:'grid', tone:'jade'};
  }
}

let hideMoment, lastBurst;
export function announce(result) {
  if (!result) return;
  const box = document.getElementById('arena-callout');
  const owner=document.querySelector('dialog[open]') || document.body;
  if(box.parentNode!==owner)owner.appendChild(box);
  const now=performance.now();
  const continuing=result.burst && lastBurst?.burst===result.burst && lastBurst.player===result.player && now-lastBurst.time<650;
  if (result.burst) {
    const count=result.count+(continuing ? lastBurst.count : 0);
    result.detail=result.name+' · '+(result.burst==='place'?'+'+count+' kare':'−'+count+' asker');
    lastBurst={burst:result.burst,player:result.player,count,time:now};
  } else lastBurst=null;
  document.getElementById('reel-result').classList.add('hidden');
  clearTimeout(hideMoment);
  box.dataset.tone = result.tone;
  document.getElementById('callout-title').textContent = result.title;
  document.getElementById('callout-detail').textContent = result.detail;
  document.getElementById('callout-mark').innerHTML = icon(result.badge);
  box.classList.remove('hidden');
  for (const animation of box.getAnimations()) animation.cancel();
  if (!continuing && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    box.animate([{opacity:.85,translate:'0 12px',scale:'.92'}, {opacity:1,translate:'0 -3px',scale:'1.035',offset:.65}, {opacity:1,translate:'0 0',scale:'1'}], {duration:260,easing:'ease-out'});
  }
  hideMoment = setTimeout(() => box.classList.add('hidden'), result.tone === 'arcane' ? 1850 : 1200);
}
