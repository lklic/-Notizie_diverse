/* Page-turn facsimile via StPageFlip */
Site.chrome('browse.html');

(async () => {
  const idx = await Site.data('index');
  const images = idx.map(p => `img/pages/${p.image}.jpg`);

  const shell = document.getElementById('flipbook');
  const W = Math.min(520, Math.floor((Math.min(window.innerWidth, 1200) - 60) / 2));
  const H = Math.round(W * 1.34);
  // give the stretch layout an explicit box so it never collapses to 0
  shell.style.width = (W * 2) + 'px';
  shell.style.height = H + 'px';
  shell.style.maxWidth = '100%';

  const pf = new St.PageFlip(shell, {
    width: W, height: H, size: 'stretch',
    minWidth: 280, maxWidth: 700, minHeight: 380, maxHeight: 940,
    maxShadowOpacity: 0.5, showCover: true, usePortrait: true, mobileScrollSupport: false,
    drawShadow: true, flippingTime: 700,
  });
  pf.loadFromImages(images);

  const status = document.getElementById('pf-status');
  const open = document.getElementById('pf-open');
  function update() {
    const pg = pf.getCurrentPageIndex();          // 0-based leaf index
    const im = idx[Math.min(pg, idx.length - 1)];
    status.textContent = `Image ${im.image}${im.folio ? ' · f. ' + im.folio : ''} — ${im.topic || ''}`;
    open.href = `read.html?p=${+im.image}`;
  }
  pf.on('flip', update);
  setTimeout(update, 300);

  document.getElementById('pf-prev').onclick = () => pf.flipPrev();
  document.getElementById('pf-next').onclick = () => pf.flipNext();
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') pf.flipPrev();
    if (e.key === 'ArrowRight') pf.flipNext();
  });
})();
