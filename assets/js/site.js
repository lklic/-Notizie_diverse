/* ============================================================
   Notizie diverse — shared site layer
   ============================================================ */
const Site = (() => {
  const NAV = [
    ['index.html', 'Home'],
    ['read.html', 'Read & zoom'],
    ['browse.html', 'Turn the pages'],
    ['explore.html', 'Explore'],
    ['ragguagli.html', 'Ragguagli'],
    ['map.html', 'Map'],
    ['about.html', 'About'],
  ];

  // commodity category palette
  const CAT = {
    spice:        ['#a8551f', 'Spices & drugs'],
    wool:         ['#7a6a3a', 'Wool'],
    cloth:        ['#4f6d8c', 'Cloth'],
    silk:         ['#8e3b6b', 'Silk'],
    dye:          ['#6a4c93', 'Dyes'],
    metal:        ['#5c6670', 'Metals'],
    coin:         ['#c9a227', 'Coinage'],
    foodstuff:    ['#3f7d57', 'Foodstuffs'],
    'hide-leather':['#9c6b3f', 'Hides & leather'],
    other:        ['#8a755a', 'Other'],
  };
  const catColor = k => (CAT[k] || CAT.other)[0];
  const catLabel = k => (CAT[k] || CAT.other)[1];

  // thematic section palette
  const SEC = {
    'front-matter':   '#8a755a',
    'wool-gazetteer': '#7a6a3a',
    'spice-gazetteer':'#a8551f',
    'ragguagli':      '#1f6f6b',
    'cloth-dye':      '#4f6d8c',
    'coinage-assay':  '#c9a227',
    'metrology-cambio':'#2a8a83',
    'regional-survey':'#8e3b6b',
    'fairs-usances':  '#6a4c93',
    'statute':        '#8e2b2b',
    'maritime-galley':'#33617e',
    'blank-binding':  '#b8a888',
    'other':          '#8a755a',
  };
  const secColor = k => SEC[k] || SEC.other;

  // ---- data cache ----
  const _cache = {};
  async function data(name) {
    if (!_cache[name]) {
      _cache[name] = fetch(`data/${name}.json`).then(r => {
        if (!r.ok) throw new Error(`data/${name}.json ${r.status}`);
        return r.json();
      });
    }
    return _cache[name];
  }

  // ---- IIIF tilesource (runtime-portable @id) ----
  async function iiifTileSource(n) {
    const base = new URL(`iiif/${n}/`, document.baseURI).href.replace(/\/$/, '');
    const info = await fetch(`${base}/info.json`).then(r => r.json());
    info['@id'] = base;            // override "./NNN" with the real deployed location
    return info;
  }

  // ---- helpers ----
  const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = i => String(i).padStart(3, '0');
  const qs = k => new URLSearchParams(location.search).get(k);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ---- chrome (nav + footer) ----
  function chrome(active) {
    const header = el('header', 'nav');
    header.innerHTML = `<div class="inner">
      <a class="brand" href="index.html"><b>Notizie</b> diverse</a>
      <button class="navtoggle" aria-label="menu">☰</button>
      <nav class="links">${NAV.map(([h, t]) =>
        `<a href="${h}" class="${h === active ? 'active' : ''}">${t}</a>`).join('')}</nav>
    </div>`;
    const mount = document.getElementById('nav') || document.body;
    mount.prepend ? document.body.prepend(header) : document.body.insertBefore(header, document.body.firstChild);
    header.querySelector('.navtoggle').onclick = () =>
      header.querySelector('.links').classList.toggle('open');

    const f = document.getElementById('footer');
    if (f) f.outerHTML = footerHTML();
  }

  function footerHTML() {
    return `<footer class="site"><div class="wrap"><div class="cols">
      <div>
        <h4>Notizie diverse</h4>
        <p style="max-width:46ch">A merchant's reference book of the Frescobaldi family of Florence
        (c.&nbsp;1417–1429): commodities, weights, measures, values and the <em>ragguagli</em> that
        bound the marketplaces of the Mediterranean and Europe into one trading world.</p>
        <small>Diplomatic transcription &amp; English translation produced with Claude (Opus&nbsp;4.8) and
        flagged as a best-effort reading of a dense <em>mercantesca</em> hand.</small>
      </div>
      <div>
        <h4>The book</h4>
        <p><a href="read.html">Read &amp; zoom</a><br>
        <a href="browse.html">Turn the pages</a><br>
        <a href="explore.html">Explore the data</a><br>
        <a href="map.html">Trade-route map</a></p>
      </div>
      <div>
        <h4>Source</h4>
        <p><a href="https://hollis.harvard.edu/discovery/fulldisplay?docid=alma990150284390203941&context=L&vid=01HVD_INST:HVD2" target="_blank" rel="noopener">Harvard Library catalog ↗</a><br>
        <a href="manifest.json" target="_blank" rel="noopener">IIIF manifest ↗</a><br>
        Barcode 32044103438974</p>
        <small>Images © Harvard Library.</small>
      </div>
    </div></div></footer>`;
  }

  return { NAV, CAT, SEC, catColor, catLabel, secColor, data, iiifTileSource, esc, pad, qs, el, chrome, footerHTML };
})();
