/* Ragguagli — conversion-rate explorer & consistency report */
Site.chrome('ragguagli.html');

const $ = id => document.getElementById(id);
const pageLink = p => `<a href="read.html?p=${+p}">f.${p}</a>`;
const fmt = n => (n == null ? '—' : (Math.round(n * 1000) / 1000).toLocaleString());

(async () => {
  let D;
  try { D = await Site.data('ragguagli'); }
  catch (e) { $('meta').innerHTML = 'Ragguagli dataset not built yet.'; return; }

  $('meta').textContent = `${D.meta.records} numeric rate records · ${D.meta.bcn_weight_places} cities weighed against Barcelona · ${D.meta.pairs} distinct rate groups`;

  // ---- Barcelona weight pivot ----
  $('bcn-table').innerHTML = `<table class="convtable">
    <tr><th>City</th><th>units = 1 Barcelona quintale</th><th>unit</th><th>sources</th><th>agreement</th></tr>` +
    D.bcn_weight.map(r => {
      const badge = r.n < 2 ? `<span class="faint">single leaf</span>`
        : r.agree ? `<span class="chip on" style="background:#2f7d57; border-color:#2f7d57">consistent</span>`
        : `<span class="chip on" style="background:#a8551f; border-color:#a8551f">varies ${fmt(r.min)}–${fmt(r.max)}</span>`;
      return `<tr><td><a href="map.html?place=${encodeURIComponent(r.place)}">${Site.esc(r.place)}</a></td>
        <td style="font-family:var(--mono)"><strong>${fmt(r.mean)}</strong></td>
        <td>${Site.esc(r.unit)}</td>
        <td>${r.values.map(v => pageLink(v.page)).join(' ')}</td>
        <td>${badge}</td></tr>`;
    }).join('') + `</table>`;

  // ---- converter (dependent menus: only marketplaces that actually connect) ----
  const adj = {};
  D.records.forEach(r => {
    if (r.from_place && r.to_place && r.from_place !== r.to_place) {
      (adj[r.from_place] = adj[r.from_place] || new Set()).add(r.to_place);
      (adj[r.to_place] = adj[r.to_place] || new Set()).add(r.from_place);
    }
  });
  const cities = Object.keys(adj).sort();
  $('fromCity').innerHTML = cities.map(c => `<option>${Site.esc(c)}</option>`).join('');
  const partnersOf = a => [...(adj[a] || [])].sort();
  const refreshTo = () => {
    const a = $('fromCity').value, prev = $('toCity').value, ps = partnersOf(a);
    $('toCity').innerHTML = ps.map(c => `<option>${Site.esc(c)}</option>`).join('');
    $('toCity').value = ps.includes(prev) ? prev : (ps.includes('Barcelona') ? 'Barcelona' : ps[0]);
  };
  $('fromCity').value = adj['Avignon'] ? 'Avignon' : cities[0];
  refreshTo();
  const renderConv = () => {
    const a = $('fromCity').value, b = $('toCity').value;
    const rs = D.records.filter(r =>
      (r.from_place === a && r.to_place === b) || (r.from_place === b && r.to_place === a));
    if (!rs.length) { $('converter').innerHTML = `<p class="muted">The notebook records no direct rate between ${Site.esc(a)} and ${Site.esc(b)}. Try the Barcelona cross-rates below.</p>`; return; }
    const byType = {};
    rs.forEach(r => (byType[r.type] = byType[r.type] || []).push(r));
    $('converter').innerHTML = Object.entries(byType).map(([t, list]) =>
      `<h3 style="margin-top:18px; text-transform:capitalize">${t}</h3>
      <table class="convtable"><tr><th>Leaf</th><th>${Site.esc(a)}</th><th></th><th>${Site.esc(b)}</th>${list.some(r=>r.commodity)?'<th>commodity</th>':''}<th>reading</th></tr>` +
      list.map(r => {
        const fwd = r.from_place === a;
        const L = fwd ? `${fmt(r.left_qty)} ${Site.esc(r.left_unit)}` : `${fmt(r.right_qty)} ${Site.esc(r.right_unit)}`;
        const R = fwd ? `${fmt(r.right_qty)} ${Site.esc(r.right_unit)}` : `${fmt(r.left_qty)} ${Site.esc(r.left_unit)}`;
        return `<tr><td>${pageLink(r.page)}</td><td>${L}</td><td class="faint">=</td><td>${R}</td>${list.some(x=>x.commodity)?`<td>${Site.esc(r.commodity||'')}</td>`:''}
          <td class="faint" style="font-size:.8rem">${Site.esc(r.confidence)}${r.note ? ' · ' + Site.esc(r.note) : ''}</td></tr>`;
      }).join('') + `</table>`).join('');
  };
  $('fromCity').onchange = () => { refreshTo(); renderConv(); };
  $('toCity').onchange = renderConv;
  renderConv();

  // ---- consistency report ----
  const multi = D.pairs.filter(p => p.multi).sort((a, b) => (a.agree - b.agree) || (b.spread - a.spread));
  $('consistency').innerHTML = multi.length ? `<table class="convtable" style="color:#e6d6ba">
    <tr><th style="color:#caa">Conversion</th><th style="color:#caa">leaves</th><th style="color:#caa">readings</th><th style="color:#caa">verdict</th></tr>` +
    multi.map(p => {
      const vals = p.records.map(r => {
        const lo = (r.confidence === 'low');
        return `<span title="${Site.esc(r.confidence)} · f.${r.page}" style="${lo ? 'opacity:.55;text-decoration:line-through dotted' : ''}">${fmt(r.left_qty)}=${fmt(r.right_qty)}</span>`;
      }).join(' · ');
      const summary = p.typical_100 ? `100 ${Site.esc(p.from)} ≈ <strong>${fmt(p.typical_100)}</strong> ${Site.esc(p.to)}` : `ratio ≈ <strong>${fmt(p.ratio_mean)}</strong>`;
      const tag = p.agree ? `<span style="color:#7bd6a0">● agree</span>` : `<span style="color:#e0a050">▲ varies ${Math.round(p.spread * 100)}%</span>`;
      return `<tr><td>${Site.esc(p.from)} → ${Site.esc(p.to)} <span class="faint">(${Site.esc(p.type)}${p.commodity ? ', ' + Site.esc(p.commodity) : ''}; ${Site.esc(p.left_unit)}/${Site.esc(p.right_unit)})</span><br><span class="faint" style="font-size:.85rem">${summary}</span></td>
        <td>${p.records.map(r => pageLink(r.page)).join(' ')}</td>
        <td style="font-family:var(--mono); font-size:.82rem">${vals}</td><td>${tag}</td></tr>`;
    }).join('') + `</table><p class="faint" style="font-size:.82rem; color:#cbb88f; margin-top:10px">Agreement is judged on the higher-confidence readings; <span style="text-decoration:line-through dotted">struck</span> values are low-confidence and excluded.</p>` : '<p style="color:#cbb88f">No rate is stated on more than one leaf in comparable units.</p>';

  // ---- price ranges ----
  $('prices').innerHTML = (D.prices && D.prices.length) ? `<table class="convtable">
    <tr><th>Good</th><th>Place</th><th>range</th><th>unit</th><th>leaves</th></tr>` +
    D.prices.map(p => `<tr><td style="text-transform:capitalize">${Site.esc(p.commodity)}</td><td>${Site.esc(p.place)}</td>
      <td style="font-family:var(--mono)">${fmt(p.min)} – ${fmt(p.max)}</td><td>${Site.esc(p.unit)}</td>
      <td>${p.pages.map(pageLink).join(' ')}</td></tr>`).join('') + `</table>` : '<p class="muted">—</p>';

  // ---- cross-rates via Barcelona ----
  $('cross').innerHTML = `<table class="convtable">
    <tr><th>City A</th><th></th><th>City B</th><th>1 unit of A =</th></tr>` +
    D.cross_weight.slice(0, 60).map(c =>
      `<tr><td>${Site.esc(c.a)} <span class="faint">(${Site.esc(c.a_unit)})</span></td><td class="faint">⇄</td>
        <td>${Site.esc(c.b)} <span class="faint">(${Site.esc(c.b_unit)})</span></td>
        <td style="font-family:var(--mono)">${fmt(c.a_per_b)} ${Site.esc(c.b_unit)}</td></tr>`).join('') + `</table>
    <p class="faint" style="font-size:.85rem; margin-top:8px">Derived, not stated: each city's weight is bridged through its rate to the Barcelona quintale.</p>`;
})();
