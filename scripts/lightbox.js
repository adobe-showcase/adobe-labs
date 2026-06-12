import { loadStyle } from './nx.js';

await loadStyle('/scripts/lightbox.css');

const overlay = document.createElement('div');
overlay.className = 'lightbox';
overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><div class="lightbox-img-wrap"></div>';
document.body.append(overlay);

const imgWrap = overlay.querySelector('.lightbox-img-wrap');

function scaleUp(img) {
  const { naturalWidth } = img;
  if (!naturalWidth) return;
  img.style.width = `${naturalWidth * 2}px`;
}

function open(source) {
  imgWrap.innerHTML = '';
  imgWrap.append(source.closest('picture')?.cloneNode(true) ?? source.cloneNode(true));
  document.body.classList.add('lightbox-open');

  const clonedImg = imgWrap.querySelector('img');
  if (clonedImg) {
    if (clonedImg.complete) scaleUp(clonedImg);
    else clonedImg.addEventListener('load', () => scaleUp(clonedImg), { once: true });
  }

  const onKey = (e) => {
    if (e.key === 'Escape') close(onKey);
  };
  document.addEventListener('keydown', onKey);
  overlay.dataset.keyHandler = true;
  overlay._keyHandler = onKey;
}

function close(onKey) {
  document.body.classList.remove('lightbox-open');
  const handler = onKey ?? overlay._keyHandler;
  if (handler) document.removeEventListener('keydown', handler);
  delete overlay._keyHandler;
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay || e.target === overlay.querySelector('.lightbox-close')) {
    close();
  }
});

const main = document.querySelector('main');

// Mark all eligible images with the zoom cursor
main.querySelectorAll('img').forEach((img) => {
  if (!img.closest('a')) img.classList.add('zoomable');
});

// Also mark images that load after init (lazy / block-rendered)
new MutationObserver((mutations) => {
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.nodeType !== 1) continue;
      const imgs = node.matches('img') ? [node] : [...node.querySelectorAll('img')];
      imgs.forEach((img) => { if (!img.closest('a')) img.classList.add('zoomable'); });
    }
  }
}).observe(main, { childList: true, subtree: true });

main.addEventListener('click', (e) => {
  const img = e.target.closest('img');
  if (!img) return;
  if (img.closest('a')) return;
  open(img);
});
