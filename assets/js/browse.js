/* Page-turn facsimile via StPageFlip — single centred leaf (cover stands alone) */
Site.chrome('browse.html');

(async () => {
  const idx = await Site.data('index');
  const images = idx.map(p => `img/pages/${p.image}.jpg`);

  const shell = document.getElementById('flipbook');
  const W = Math.min(560, window.innerWidth - 28);   // one leaf, centred
  const H = Math.round(W * 1.34);
  shell.style.width = W + 'px';
  shell.style.height = H + 'px';

  const pf = new St.PageFlip(shell, {
    width: W, height: H, size: 'fixed',
    maxShadowOpacity: 0.5, showCover: false, usePortrait: true, mobileScrollSupport: false,
    drawShadow: true, flippingTime: 700,
  });
  pf.loadFromImages(images);

  const status = document.getElementById('pf-status');
  const open = document.getElementById('pf-open');
  function update() {
    const pg = pf.getCurrentPageIndex();
    const im = idx[Math.min(pg, idx.length - 1)];
    status.textContent = `Image ${im.image}${im.folio ? ' · f. ' + im.folio : ''} — ${im.topic || ''}`;
    open.href = `read.html?p=${+im.image}`;
  }
  pf.on('flip', update);
  setTimeout(update, 350);

  document.getElementById('pf-prev').onclick = () => pf.flipPrev();
  document.getElementById('pf-next').onclick = () => pf.flipNext();
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') pf.flipPrev();
    if (e.key === 'ArrowRight') pf.flipNext();
  });
})();
