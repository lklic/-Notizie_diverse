/* Trade-route map */
Site.chrome('map.html');

let map, PLACES = [], ROUTES = [], COMM = [], BY = {}, markers = {}, routeLines = [], regionLayer;

(async () => {
  [PLACES, ROUTES, COMM] = await Promise.all([Site.data('places'), Site.data('routes'), Site.data('commodities')]);
  PLACES.forEach(p => BY[p.name] = p);

  map = L.map('map', { minZoom: 3, maxZoom: 9, scrollWheelZoom: true })
    .setView([41.5, 9], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap, &copy; CARTO · places after the Frescobaldi notebook (c.1417–29)',
    subdomains: 'abcd', maxZoom: 9,
  }).addTo(map);

  drawRoutes();
  drawPlaces();

  // commodity selector
  const top = COMM.filter(c => c.count >= 2).slice(0, 80);
  $('commodity').innerHTML = `<option value="">— none —</option>` +
    top.map(c => `<option value="${Site.esc(c.name)}">${Site.esc(c.name)} (${c.count})</option>`).join('');
  $('commodity').onchange = e => highlightCommodity(e.target.value);

  $('showRoutes').onchange = e => routeLines.forEach(l => e.target.checked ? l.addTo(map) : l.remove());
  $('showRegions').onchange = e => toggleRegions(e.target.checked);

  const want = Site.qs('place');
  if (want && BY[want]) { openPlace(want); map.setView([BY[want].lat, BY[want].lon], 6); }
})();

function $(id) { return document.getElementById(id); }
const rad = c => Math.max(5, Math.min(34, 4 + Math.sqrt(c) * 4));

function drawRoutes() {
  ROUTES.forEach(r => {
    const a = BY[r.a], b = BY[r.b];
    if (!a || !b) return;
    const line = L.polyline([[a.lat, a.lon], [b.lat, b.lon]], {
      color: '#1f6f6b', weight: Math.max(1, Math.min(7, r.count)), opacity: Math.min(.7, .18 + r.count * .06),
    });
    line._edge = r;
    line.on('click', () => showEdge(r));
    line.bindTooltip(`${r.a} ⇄ ${r.b} · ${r.count} link${r.count > 1 ? 's' : ''}`, { sticky: true });
    line.addTo(map); routeLines.push(line);
  });
}

function drawPlaces() {
  regionLayer = L.layerGroup().addTo(map);
  PLACES.forEach(p => {
    const isRegion = p.kind === 'region';
    const m = L.circleMarker([p.lat, p.lon], {
      radius: rad(p.count),
      color: isRegion ? '#33617e' : '#7d3f17',
      weight: isRegion ? 2 : 1.5, dashArray: isRegion ? '4 3' : null,
      fillColor: isRegion ? '#33617e' : '#b9762f',
      fillOpacity: isRegion ? 0.12 : 0.78,
    });
    m._place = p;
    m.on('click', () => openPlace(p.name));
    m.bindTooltip(`${p.name} · ${p.count}`, { direction: 'top' });
    markers[p.name] = m;
    if (isRegion) m.addTo(regionLayer); else m.addTo(map);
  });
}

function toggleRegions(on) {
  if (on) regionLayer.addTo(map); else regionLayer.remove();
}

function openPlace(name) {
  const p = BY[name]; if (!p) return;
  const pageLinks = p.pages.map(im => `<a class="chip" href="read.html?p=${+im}">f.${im}</a>`).join(' ');
  const edges = ROUTES.filter(r => r.a === name || r.b === name)
    .slice(0, 8).map(r => `${r.a === name ? r.b : r.a} <span class="faint">(${r.count})</span>`).join(', ');
  $('placeinfo').innerHTML = `<div class="note-card" style="margin:0">
    <h3 style="margin:0 0 4px">${Site.esc(name)}</h3>
    <div class="folio-tag">${Site.esc(p.region)} · ${p.kind} · ${p.count} mentions</div>
    ${p.originals && p.originals.length ? `<p class="faint" style="font-size:.85rem; margin:.5em 0">scribe writes: <em>${p.originals.map(Site.esc).join(', ')}</em></p>` : ''}
    ${edges ? `<p style="font-size:.9rem; margin:.4em 0"><strong>Linked to:</strong> ${edges}</p>` : ''}
    <p style="font-size:.85rem; margin:.5em 0 .2em"><strong>On leaves:</strong></p>
    <div class="chips">${pageLinks}</div></div>`;
  if (markers[name]) markers[name].openTooltip();
}

function showEdge(r) {
  const rows = r.examples.map(e =>
    `<tr><td><a href="read.html?p=${+e.page}">f.${e.page}</a></td><td>${Site.esc(e.what)}</td><td>${Site.esc(e.value || '')}</td></tr>`).join('');
  $('placeinfo').innerHTML = `<div class="note-card" style="margin:0">
    <h3 style="margin:0 0 4px">${Site.esc(r.a)} ⇄ ${Site.esc(r.b)}</h3>
    <div class="folio-tag">${r.count} recorded conversion${r.count > 1 ? 's' : ''}</div>
    <table class="convtable" style="margin-top:8px"><tr><th>Leaf</th><th>What</th><th>Value</th></tr>${rows}</table></div>`;
}

function highlightCommodity(name) {
  if (!name) { Object.values(markers).forEach(m => m.setStyle({ fillOpacity: m._place.kind === 'region' ? 0.12 : 0.78, opacity: 1 })); $('placeinfo').innerHTML = ''; return; }
  const c = COMM.find(x => x.name === name);
  const pageset = new Set(c ? c.pages : []);
  let hit = [];
  Object.values(markers).forEach(m => {
    const on = m._place.pages.some(im => pageset.has(im));
    m.setStyle({ fillOpacity: on ? 0.9 : 0.06, opacity: on ? 1 : 0.25 });
    if (on) hit.push(m._place.name);
  });
  $('placeinfo').innerHTML = `<div class="note-card" style="margin:0">
    <h3 style="margin:0 0 4px; text-transform:capitalize">${Site.esc(name)}</h3>
    <div class="folio-tag">appears on ${pageset.size} leaves · ${hit.length} places lit</div>
    <p style="font-size:.9rem; margin:.5em 0">${hit.slice(0, 24).map(Site.esc).join(' · ') || '—'}</p>
    <a class="chip" href="explore.html?commodity=${encodeURIComponent(name)}">see leaves →</a></div>`;
}
