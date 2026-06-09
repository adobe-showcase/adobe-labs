const SIZE_MAP = { small: '25%', medium: '50%', large: '75%', full: '100%' };

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const picture = rows[0]?.querySelector('picture');
  if (!picture) return;

  const config = rows.slice(1).reduce((acc, row) => {
    const [keyEl, valEl] = row.children;
    if (keyEl && valEl) acc[keyEl.textContent.toLowerCase().trim()] = valEl.textContent.trim();
    row.remove();
    return acc;
  }, {});

  const hasAlignment = ['left', 'center', 'right'].some((a) => el.classList.contains(a));
  const resolvedWidth = config.width ?? SIZE_MAP[config.size?.toLowerCase()] ?? null;

  if (resolvedWidth || hasAlignment) {
    picture.style.display = 'block';
    if (resolvedWidth) picture.style.width = resolvedWidth;
  }

  if (config.height) {
    const val = /^\d+$/.test(config.height) ? `${config.height}px` : config.height;
    const img = picture.querySelector('img');
    if (img) {
      img.style.height = val;
      img.style.objectFit = 'cover';
    }
  }
}
