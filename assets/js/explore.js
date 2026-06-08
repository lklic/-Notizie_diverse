/* Faceted exploration of the leaves */
Site.chrome('explore.html');

let PAGES = [], COMM = [], SECS = [];
const state = { q: '', section: '', categories: new Set(), commodity: '', place: '' };
const $ = id => document.getElementById(id);

(async () => {
  [PAGES, COMM, SECS] = await Promise.all([Site.data('pages'), Site.data('commodities'), Site.data('sections')]);

  // seed from URL
  state.q = Site.qs('q') || '';
  state.section = Site.qs('section') || '';
  state.commodity = (Site.qs('commodity') || '').toLowerCase();
  state.place = Site.qs('place') || '';
  if (Site.qs('category')) state.categories.add(Site.qs('category'));
  $('q').value = state.q;

  // section facet
  $('f-section').innerHTML = SECS.filter(s => s.key !== 'other')
    .map(s => `<span class="chip" data-section="${s.key}" style="border-left:5px solid ${Site.secColor(s.key)}">
      ${Site.esc(s.label)} <span class="faint">${s.pages.length}</span></span>`).join('');

  // category facet
  $('f-category').innerHTML = Object.keys(Site.CAT)
    .map(k => `<span class="chip" data-category="${k}"><span class="cat-dot" style="background:${Site.catColor(k)}"></span>${Site.catLabel(k)}</span>`).join('');

  // top commodities facet
  $('f-commodity').innerHTML = COMM.filter(c => c.count >= 3).slice(0, 26)
    .map(c => `<span class="chip" data-commodity="${Site.esc(c.name)}"><span class="cat-dot" style="background:${Site.catColor(c.category)}"></span>${Site.esc(c.name)} <span class="faint">${c.count}</span></span>`).join('');

  document.querySelector('.facets').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    if (c.dataset.section != null) state.section = (state.section === c.dataset.section) ? '' : c.dataset.section;
    if (c.dataset.category != null) { c.dataset.category && (state.categories.has(c.dataset.category) ? state.categories.delete(c.dataset.category) : state.categories.add(c.dataset.category)); }
    if (c.dataset.commodity != null) state.commodity = (state.commodity === c.dataset.commodity.toLowerCase()) ? '' : c.dataset.commodity.toLowerCase();
    render();
  });
  $('q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });

  render();
})();

function pageMatches(p) {
  if (p.is_blank && (state.q || state.section || state.categories.size || state.commodity || state.place)) {
    // blanks only show in unfiltered view
  }
  if (state.section && p.section !== state.section) return false;
  if (state.place) {
    const has = p.entities.places.some(pl => (pl.modern || pl.normalized || pl.original) === state.place);
    if (!has) return false;
  }
  if (state.categories.size) {
    const cats = new Set(p.entities.commodities.map(c => c.category));
    if (![...state.categories].some(c => cats.has(c))) return false;
  }
  if (state.commodity) {
    const has = p.entities.commodities.some(c => (c.english || c.original || '').toLowerCase().includes(state.commodity));
    if (!has) return false;
  }
  if (state.q) {
    const hay = (p.topic + ' ' + p.transcription_md + ' ' + p.translation_md + ' ' + p.interpretive_note).toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}

function render() {
  const anyFilter = state.q || state.section || state.categories.size || state.commodity || state.place;
  let res = PAGES.filter(p => (anyFilter ? !p.is_blank : true)).filter(pageMatches);

  // active filter pills
  const pills = [];
  if (state.section) pills.push(['section', SECS.find(s => s.key === state.section)?.label || state.section]);
  [...state.categories].forEach(c => pills.push(['category:' + c, Site.catLabel(c)]));
  if (state.commodity) pills.push(['commodity', '“' + state.commodity + '”']);
  if (state.place) pills.push(['place', state.place]);
  if (state.q) pills.push(['q', 'search: ' + state.q]);
  $('active').innerHTML = pills.length
    ? '<div class="eyebrow">Active filters</div><div class="chips">' + pills.map(([k, l]) =>
        `<span class="chip on" data-clear="${k}">${Site.esc(l)} <span class="x">✕</span></span>`).join('') +
      '</div><button class="chip" data-clear="all" style="margin-top:8px">clear all</button>'
    : '';
  $('active').querySelectorAll('[data-clear]').forEach(b => b.onclick = () => clearFilter(b.dataset.clear));

  // sync facet active states
  document.querySelectorAll('[data-section]').forEach(c => c.classList.toggle('on', c.dataset.section === state.section));
  document.querySelectorAll('[data-category]').forEach(c => c.classList.toggle('on', state.categories.has(c.dataset.category)));
  document.querySelectorAll('[data-commodity]').forEach(c => c.classList.toggle('on', c.dataset.commodity.toLowerCase() === state.commodity));

  syncURL();

  $('count').textContent = `${res.length} leaf${res.length === 1 ? '' : 'ves'}${anyFilter ? ' match' : ''}`;
  $('results').innerHTML = res.length ? res.map(card).join('')
    : '<p class="muted">No leaves match these filters. <a href="explore.html">Reset</a>.</p>';
}

function card(p) {
  const cats = [...new Set(p.entities.commodities.map(c => c.category))].slice(0, 5);
  const dots = cats.map(c => `<span class="cat-dot" title="${Site.catLabel(c)}" style="background:${Site.catColor(c)}"></span>`).join('');
  const places = [...new Set(p.entities.places.map(pl => pl.modern || pl.normalized))].filter(Boolean).slice(0, 4);
  return `<a class="card" href="read.html?p=${+p.image}">
    <div class="thumb"><img src="img/thumbs/${p.image}.jpg" loading="lazy" alt="Image ${p.image}"></div>
    <div class="body">
      <div class="meta"><span class="sectionbar" style="background:${Site.secColor(p.section)}; font-size:.62rem; padding:2px 7px">${Site.esc(SECS.find(s=>s.key===p.section)?.label||p.section)}</span></div>
      <h3>${Site.esc(p.topic || 'Leaf ' + p.image)}</h3>
      <div class="meta">Image ${p.image}${p.folio ? ' · f. ' + p.folio : ''} ${dots}</div>
      ${places.length ? `<div class="chips">${places.map(pl => `<span class="chip" style="font-size:.72rem; padding:2px 8px">${Site.esc(pl)}</span>`).join('')}</div>` : ''}
    </div></a>`;
}

function clearFilter(k) {
  if (k === 'all') { state.q = state.section = state.commodity = state.place = ''; state.categories.clear(); $('q').value = ''; }
  else if (k === 'section') state.section = '';
  else if (k === 'commodity') state.commodity = '';
  else if (k === 'place') state.place = '';
  else if (k === 'q') { state.q = ''; $('q').value = ''; }
  else if (k.startsWith('category:')) state.categories.delete(k.slice(9));
  render();
}

function syncURL() {
  const u = new URLSearchParams();
  if (state.q) u.set('q', state.q);
  if (state.section) u.set('section', state.section);
  if (state.commodity) u.set('commodity', state.commodity);
  if (state.place) u.set('place', state.place);
  if (state.categories.size) u.set('category', [...state.categories][0]);
  history.replaceState(null, '', 'explore.html' + (u.toString() ? '?' + u : ''));
}
