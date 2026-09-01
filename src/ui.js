import { CARS, CAR_BY_ID } from './cars.js';
import { save, buyCar, selectCar, setSetting, setName, resetAll, persist } from './store.js';
import { audio } from './audio.js';
import { Preview } from './preview.js';

const $ = (s) => document.querySelector(s);
const CRATE_PRICE = 100;
const REASONS = {
  hit: ['Flattened', (s) => `A ${s || 'cow'} had the right of way.`],
  trample: ['Trampled', () => 'The stampede waits for no one.'],
  drown: ['Sunk', () => 'Cars famously cannot swim.'],
  swept: ['Swept away', () => 'Rode that log a little too far.'],
  eagle: ['Snatched', () => 'Never idle under open sky.'],
};

export class UI {
  constructor() {
    this.game = null;
    this.preview = new Preview();
    this.screen = 'title';
    this.modal = null;
    this.selected = save.selected;
    this.bind();
    this.refreshBadges();
    this.setHUD(0, 0);
  }
  attach(game) { this.game = game; }
  show(name) {
    this.screen = name;
    for (const s of ['title', 'hud', 'over']) $(`#${s}`).hidden = s !== name;
    if (name === 'title') this.refreshBadges();
  }
  modalOpen() { return !!this.modal; }
  openModal(name) {
    this.closeModal();
    this.modal = name;
    $(`#${name}`).hidden = false;
    $('#scrim').hidden = false;
    audio.play('whoosh', { vol: 0.5 });
    if (name === 'shop') this.renderShop();
    if (name === 'scores') this.renderScores();
    if (name === 'settings') this.renderSettings();
  }
  closeModal() {
    if (!this.modal) return;
    $(`#${this.modal}`).hidden = true;
    $('#scrim').hidden = true;
    this.modal = null;
    this.refreshBadges();
  }
  refreshBadges() {
    for (const el of document.querySelectorAll('[data-coins]')) el.textContent = save.coins;
    for (const el of document.querySelectorAll('[data-best]')) el.textContent = save.best;
  }
  setHUD(score, coins) {
    $('#hud-score').textContent = score;
    $('#hud-coins').textContent = coins;
    $('#hud-best').textContent = save.best > 0 ? `best ${save.best}` : '';
  }
  coinPop() {
    const el = $('#hud-coin-wrap');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  showGameOver({ score, coins, reason, best, rank, isBest, species }) {
    const [title, sub] = REASONS[reason] || REASONS.hit;
    $('#over-title').textContent = title;
    $('#over-sub').textContent = sub(species);
    $('#over-score').textContent = score;
    $('#over-best').textContent = best;
    $('#over-coins').textContent = `+${coins}`;
    $('#over-record').hidden = !isBest;
    const signed = $('#over-sign');
    signed.hidden = !(rank >= 0 && !save.name);
    $('#over-rank').hidden = rank < 0 || isBest;
    $('#over-rank').textContent = rank >= 0 ? `#${rank + 1} on your board` : '';
    this.show('over');
    this.refreshBadges();
    $('#over').classList.remove('enter'); void $('#over').offsetWidth; $('#over').classList.add('enter');
  }

  bind() {
    const g = () => this.game;
    for (const b of document.querySelectorAll('[data-open]')) b.addEventListener('click', (e) => { e.stopPropagation(); audio.unlock(); this.openModal(b.dataset.open); });
    for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => this.closeModal());
    $('#scrim').addEventListener('click', () => this.closeModal());
    $('#btn-play').addEventListener('click', () => { audio.unlock(); g().start(); });
    $('#btn-again').addEventListener('click', () => g().start());
    $('#btn-home').addEventListener('click', () => g().toTitle());
    $('#sign-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#sign-name').value.trim().slice(0, 12); if (v) { setName(v); $('#over-sign').hidden = true; audio.play('buy', { vol: 0.6 }); } });
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape') this.closeModal(); });
    $('#btn-crate').addEventListener('click', () => this.openCrate());
    $('#shop-action').addEventListener('click', () => this.shopAction());
    for (const t of ['music', 'sfx']) $(`#set-${t}`).addEventListener('change', (e) => { setSetting(t, e.target.checked); audio.applySettings(); if (t === 'sfx' && e.target.checked) audio.play('coin', { vol: 0.5 }); });
    $('#set-name').addEventListener('change', (e) => setName(e.target.value.trim().slice(0, 12)));
    $('#btn-reset').addEventListener('click', () => {
      if ($('#btn-reset').dataset.armed) { resetAll(); this.selected = 'runabout'; g().setCar('runabout'); this.renderSettings(); this.refreshBadges(); $('#btn-reset').textContent = 'Progress wiped'; delete $('#btn-reset').dataset.armed; }
      else { $('#btn-reset').dataset.armed = '1'; $('#btn-reset').textContent = 'Tap again to confirm'; }
    });
    // Live preview loop.
    let last = performance.now();
    const loop = (t) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (t - last) / 1000); last = t; this.preview.render(dt, this.modal === 'shop'); };
    requestAnimationFrame(loop);
  }

  // Garage ----------------------------------------------------------------------
  renderShop() {
    this.preview.attach($('#preview-canvas'));
    const grid = $('#shop-grid');
    if (!grid.dataset.built) {
      grid.dataset.built = '1';
      for (const c of CARS) {
        const card = document.createElement('button');
        card.className = 'card'; card.dataset.id = c.id;
        card.innerHTML = `<img alt="" src="${this.preview.thumb(c.id)}"><span class="card-name">${c.name}</span><span class="card-price"></span>`;
        card.addEventListener('click', () => { this.selected = c.id; this.updateShop(); audio.play('whoosh', { vol: 0.4, rate: 1.4 }); });
        grid.appendChild(card);
      }
    }
    this.preview.showCar(this.selected);
    this.updateShop();
  }
  updateShop() {
    const c = CAR_BY_ID[this.selected];
    const owned = save.owned.includes(c.id);
    const equipped = save.selected === c.id;
    if (this.preview.live?.id !== c.id) this.preview.showCar(c.id);
    $('#shop-name').textContent = c.name;
    $('#shop-desc').textContent = c.desc;
    const btn = $('#shop-action');
    btn.disabled = false;
    if (equipped) { btn.textContent = 'Driving this'; btn.disabled = true; btn.className = 'btn ghost'; }
    else if (owned) { btn.textContent = 'Drive it'; btn.className = 'btn primary'; }
    else { btn.innerHTML = `Buy for <b class="coin-inline">${c.price}</b>`; btn.className = 'btn gold'; btn.disabled = save.coins < c.price; }
    for (const card of document.querySelectorAll('#shop-grid .card')) {
      const cc = CAR_BY_ID[card.dataset.id];
      const o = save.owned.includes(cc.id);
      card.classList.toggle('selected', cc.id === this.selected);
      card.classList.toggle('owned', o);
      card.classList.toggle('equipped', save.selected === cc.id);
      card.querySelector('.card-price').textContent = save.selected === cc.id ? 'driving' : o ? 'owned' : cc.price;
    }
    const unowned = CARS.filter((x) => !save.owned.includes(x.id));
    const crate = $('#btn-crate');
    crate.disabled = save.coins < CRATE_PRICE || unowned.length === 0;
    $('#crate-left').textContent = unowned.length ? `${unowned.length} left to find` : 'Garage complete';
    this.refreshBadges();
  }
  shopAction() {
    const c = CAR_BY_ID[this.selected];
    if (save.owned.includes(c.id)) { selectCar(c.id); this.game.setCar(c.id); audio.play('honk', { vol: 0.6 }); }
    else if (buyCar(c.id, c.price)) { this.game.setCar(c.id); audio.play('buy'); this.preview.live.kick = 1; }
    this.updateShop();
  }
  openCrate() {
    const unowned = CARS.filter((x) => !save.owned.includes(x.id));
    if (!unowned.length || save.coins < CRATE_PRICE) return;
    const prize = unowned[Math.floor(Math.random() * unowned.length)];
    save.coins -= CRATE_PRICE; persist();
    const btn = $('#btn-crate'); btn.disabled = true;
    const panel = $('#shop-showcase'); panel.classList.add('shaking');
    audio.play('stampede', { vol: 0.4, rate: 1.6 });
    // Flick through a few decoys before landing on the prize.
    let i = 0;
    const tick = () => {
      if (i < 9) { this.preview.showCar(CARS[Math.floor(Math.random() * CARS.length)].id); i++; setTimeout(tick, 90 + i * 25); return; }
      panel.classList.remove('shaking');
      save.owned.push(prize.id); save.selected = prize.id; persist();
      this.selected = prize.id; this.game.setCar(prize.id);
      this.updateShop();
      audio.play('record', { vol: 0.8 });
      panel.classList.remove('reveal'); void panel.offsetWidth; panel.classList.add('reveal');
    };
    tick();
  }

  // Scores ----------------------------------------------------------------------
  renderScores() {
    const body = $('#scores-body');
    body.innerHTML = '';
    if (!save.scores.length) { $('#scores-empty').hidden = false; return; }
    $('#scores-empty').hidden = true;
    save.scores.forEach((s, i) => {
      const tr = document.createElement('tr');
      const d = new Date(s.date);
      tr.innerHTML = `<td class="rank">${i + 1}</td><td class="name">${escape(s.name || 'Anonymous driver')}</td><td class="car">${CAR_BY_ID[s.car]?.name || '?'}</td><td class="date">${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td><td class="score">${s.score}</td>`;
      body.appendChild(tr);
    });
    $('#stat-runs').textContent = save.runs;
    $('#stat-coins').textContent = save.totalCoins;
    $('#stat-cars').textContent = `${save.owned.length}/${CARS.length}`;
  }
  renderSettings() {
    $('#set-music').checked = save.music; $('#set-sfx').checked = save.sfx; $('#set-name').value = save.name;
    $('#btn-reset').textContent = 'Reset all progress'; delete $('#btn-reset').dataset.armed;
  }
}
function escape(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
