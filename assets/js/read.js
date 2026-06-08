/* Reader: IIIF deep-zoom + transcription / translation */
Site.chrome('read.html');

let PAGES = [], BYIMG = {}, viewer = null, cur = null, mode = 'both';

const $ = id => document.getElementById(id);

(async () => {
  PAGES = await Site.data('pages');
  PAGES.forEach(p => BYIMG[p.image] = p);

  // thumbnail strip + jump menu
  $('thumbs').innerHTML = PAGES.map(p =>
    `<img data-img="${p.image}" src="img/thumbs/${p.image}.jpg" title="Image ${p.image}${p.folio ? ' · f. ' + p.folio : ''}" loading="lazy">`).join('');
  $('thumbs').addEventListener('click', e => { if (e.target.dataset.img) go(e.target.dataset.img); });

  $('jump').innerHTML = PAGES.map(p =>
    `<option value="${p.image}">Image ${p.image}${p.folio ? ' — f. ' + p.folio : ''} · ${truncate(p.topic, 42)}</option>`).join('');
  $('jump').addEventListener('change', e => go(e.target.value));

  viewer = OpenSeadragon({
    id: 'osd',
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
    showNavigator: true, navigatorPosition: 'BOTTOM_RIGHT',
    showRotationControl: true, gestureSettingsMouse: { clickToZoom: false },
    animationTime: 0.5, blendTime: 0.1, maxZoomPixelRatio: 2.5,
    visibilityRatio: 0.7, minZoomImageRatio: 0.8,
  });

  $('prev').onclick = () => step(-1);
  $('next').onclick = () => step(1);
  document.querySelectorAll('.seg button').forEach(b =>
    b.onclick = () => { mode = b.dataset.mode; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); renderText(); });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
  });

  const start = Site.qs('p') ? Site.pad(+Site.qs('p')) : PAGES[0].image;
  go(BYIMG[start] ? start : PAGES[0].image);
})();

function step(d) {
  const i = PAGES.findIndex(p => p.image === cur);
  const j = Math.min(PAGES.length - 1, Math.max(0, i + d));
  go(PAGES[j].image);
}

async function go(img) {
  cur = img;
  const p = BYIMG[img];
  $('jump').value = img;
  history.replaceState(null, '', `read.html?p=${+img}`);
  document.querySelectorAll('#thumbs img').forEach(t => t.classList.toggle('on', t.dataset.img === img));
  const onThumb = document.querySelector(`#thumbs img[data-img="${img}"]`);
  if (onThumb) onThumb.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });

  try {
    const ts = await Site.iiifTileSource(img);
    viewer.open(ts);
  } catch (err) {
    viewer.open({ type: 'image', url: `img/pages/${img}.jpg` }); // graceful fallback
  }
  renderText();
  $('content').scrollTop = 0;
}

function renderText() {
  const p = BYIMG[cur];
  if (!p) return;
  const sec = secPill(p.section);
  const folio = p.folio ? `<span class="folio-tag">f. ${Site.esc(p.folio)}</span>` : '';
  let html = `<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap">
      ${sec}<span class="folio-tag">Image ${p.image}</span>${folio}</div>
    <h2 style="margin:.3em 0 .2em">${Site.esc(p.topic || 'Leaf ' + p.image)}</h2>`;

  if (p.is_blank) {
    html += `<div class="note-card">This leaf carries no text. ${Site.esc(p.layout_note || '')}</div>`;
    $('content').innerHTML = html; return;
  }

  const dipl = `<div class="md-block"><div class="eyebrow">Diplomatic transcription</div>
      <div class="dipl">${mdInline(p.transcription_md)}</div></div>`;
  const tr = `<div class="md-block"><div class="eyebrow">English translation</div>
      <div class="transl">${marked.parse(p.translation_md || '*No translation (blank or illegible).*')}</div></div>`;

  if (mode === 'dipl') html += dipl;
  else if (mode === 'transl') html += tr;
  else html += dipl + `<hr class="rule">` + tr;

  if (p.interpretive_note)
    html += `<div class="note-card"><strong>Note.</strong> ${Site.esc(p.interpretive_note)}</div>`;

  html += entityBlock(p.entities);
  if (p.hardest_lines && p.hardest_lines.trim())
    html += `<p class="faint" style="font-size:.85rem; margin-top:18px"><em>Reading caveats:</em> ${Site.esc(p.hardest_lines)}</p>`;

  $('content').innerHTML = html;
}

function entityBlock(en) {
  if (!en) return '';
  let out = '<div class="entitybox">';
  if (en.places && en.places.length) {
    const seen = new Set();
    const chips = en.places.map(pl => {
      const name = pl.modern || pl.normalized || pl.original;
      if (seen.has(name)) return ''; seen.add(name);
      return `<a class="chip" href="map.html?place=${encodeURIComponent(name)}">${Site.esc(name)}</a>`;
    }).join('');
    out += `<h4>Places</h4><div class="chips">${chips}</div>`;
  }
  if (en.commodities && en.commodities.length) {
    const seen = new Set();
    const chips = en.commodities.map(c => {
      const name = c.english || c.original;
      if (seen.has(name.toLowerCase())) return ''; seen.add(name.toLowerCase());
      return `<a class="chip" href="explore.html?commodity=${encodeURIComponent(name.toLowerCase())}">
        <span class="cat-dot" style="background:${Site.catColor(c.category)}"></span>${Site.esc(name)}</a>`;
    }).join('');
    out += `<h4 style="margin-top:16px">Goods</h4><div class="chips">${chips}</div>`;
  }
  if (en.conversions && en.conversions.length) {
    out += `<h4 style="margin-top:16px">Exchange &amp; ragguagli <span class="faint">(${en.conversions.length})</span></h4>
      <table class="convtable"><tr><th>From</th><th>To</th><th>What</th><th>Value</th></tr>` +
      en.conversions.slice(0, 18).map(c =>
        `<tr><td>${Site.esc(c.from)}</td><td>${Site.esc(c.to)}</td><td>${Site.esc(c.what)}</td><td>${Site.esc(c.value || '')}</td></tr>`).join('') +
      `</table>`;
    if (en.conversions.length > 18) out += `<p class="faint" style="font-size:.85rem">…and ${en.conversions.length - 18} more on this leaf.</p>`;
  }
  out += '</div>';
  return out;
}

function secPill(key) {
  const labels = { 'front-matter': 'Front matter', 'wool-gazetteer': 'Wool', 'spice-gazetteer': 'Spices', 'ragguagli': 'Ragguagli', 'cloth-dye': 'Cloth & dye', 'coinage-assay': 'Coinage', 'metrology-cambio': 'Metrology & cambio', 'regional-survey': 'Regional survey', 'fairs-usances': 'Fairs & usances', 'statute': 'Statute', 'maritime-galley': 'Galley', 'blank-binding': 'Blank / binding', 'other': 'Other' };
  return `<span class="sectionbar" style="background:${Site.secColor(key)}">${labels[key] || key}</span>`;
}

// marked renders fenced blocks to <pre><code>; keep them but inside our .dipl wrapper they get mono styling
function mdInline(md) { return marked.parse(md || ''); }
function truncate(s, n) { s = s || ''; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
