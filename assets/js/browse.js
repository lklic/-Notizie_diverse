/* Page-turn facsimile via StPageFlip */
Site.chrome('browse.html');

(async () => {
  const idx = await Site.data('index');
  const images = idx.map(p => `img/pages/${p.image}.jpg`);

  const shell = document.getElementById('flipbook');
  const mobile = window.innerWidth < 760;
  const avail = Math.min(window.innerWidth - 28, 1180);
  const W = mobile ? avail : Math.floor(avail / 2);   // single page width
  const H = Math.round(W * 1.34);
  // size the box to exactly one spread (or one page on mobile) so there's no empty flank
  shell.style.width = (mobile ? W : W * 2) + 'px';
  shell.style.height = H + 'px';
  shell.style.maxWidth = '100%';

  const pf = new St.PageFlip(shell, {
    width: W, height: H, size: 'stretch',
    minWidth: 260, maxWidth: 900, minHeight: 340, maxHeight: 1220,
    maxShadowOpacity: 0.5, showCover: false, usePortrait: mobile, mobileScrollSupport: false,
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
