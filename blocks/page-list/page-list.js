const DEFAULT_IMAGE = '/img/default-lab-card.png';

async function fetchSiteData() {
  const normalizedPath = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;

  // Walk up the path until we find a query-index.json
  const segments = normalizedPath.split('/').filter(Boolean);
  while (segments.length > 0) {
    const basePath = `/${segments.join('/')}/`;
    const resp = await fetch(`${basePath}query-index.json`); // eslint-disable-line no-await-in-loop
    if (resp.ok) {
      const { data } = await resp.json();
      return data.sort((a, b) => {
        const segmentsA = a.path.split('/').length - 1;
        const segmentsB = b.path.split('/').length - 1;
        return segmentsA - segmentsB;
      });
    }
    segments.pop();
  }
  throw Error('Could not fetch query index');
}

function createCards(siteData) {
  const currentDepth = window.location.pathname.split('/').filter(Boolean).length;
  const cards = Object.keys(siteData).reduce((acc, key) => {
    const itemPath = siteData[key].path;
    const itemDepth = itemPath.split('/').filter(Boolean).length;
    const notDirectChild = itemDepth !== currentDepth + 1;
    const notDescendant = !itemPath.startsWith(window.location.pathname);
    const lastSegment = itemPath.split('/').pop();
    const isNumberOnly = /^\d+$/.test(lastSegment);

    if (notDescendant || notDirectChild || isNumberOnly) return acc;

    const card = document.createElement('li');
    card.classList.add('docket-page-list-card');

    const link = document.createElement('a');
    link.href = siteData[key].path;

    const imgContainer = document.createElement('div');
    imgContainer.className = 'docket-page-list-card-image';
    const img = document.createElement('img');
    img.src = DEFAULT_IMAGE;
    imgContainer.append(img);

    if (siteData[key].labNumber) {
      const badge = document.createElement('span');
      badge.className = 'docket-page-list-card-badge';
      badge.textContent = siteData[key].labNumber;
      imgContainer.append(badge);
    }
    const textContainer = document.createElement('div');
    textContainer.className = 'docket-page-list-card-text-container';

    const title = document.createElement('p');
    title.classList.add('docket-page-list-card-title');
    title.innerText = siteData[key].title;

    textContainer.append(title);
    link.append(imgContainer, textContainer);
    card.append(link);
    acc.push(card);

    return acc;
  }, []);
  const ul = document.createElement('ul');
  ul.classList.add('docket-page-list');
  ul.append(...cards);
  return ul;
}

export default async function init(el) {
  try {
    const siteData = await fetchSiteData();
    const cards = createCards(siteData);
    el.append(cards);
  } catch (err) {
    console.error(err);
  }
}
