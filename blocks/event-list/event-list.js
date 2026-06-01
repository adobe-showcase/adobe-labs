const DEFAULT_IMAGE = 'https://adobelabs.dev/media_197fd103d3332517ce59fb4590f838b4290bae8f9.png';

async function fetchEventData() {
  const resp = await fetch('/events/query-index.json');
  if (!resp.ok) throw Error('Could not fetch event index');
  const { data } = await resp.json();
  return data.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : 0;
    const dateB = b.date ? new Date(b.date) : 0;
    return dateB - dateA;
  });
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function createCards(events) {
  const cards = events.map((event) => {
    const card = document.createElement('li');
    card.className = 'event-list-card';

    const link = document.createElement('a');
    link.href = event.path;

    const imgContainer = document.createElement('div');
    imgContainer.className = 'event-list-card-image';
    const img = document.createElement('img');
    img.src = event.image || DEFAULT_IMAGE;
    img.alt = event.title || '';
    imgContainer.append(img);

    const textContainer = document.createElement('div');
    textContainer.className = 'event-list-card-text';

    const title = document.createElement('p');
    title.className = 'event-list-card-title';
    title.textContent = event.title;

    const date = document.createElement('p');
    date.className = 'event-list-card-date';
    date.textContent = formatDate(event.date);

    const description = document.createElement('p');
    description.className = 'event-list-card-description';
    description.textContent = event.description;

    textContainer.append(title, date, description);
    link.append(imgContainer, textContainer);
    card.append(link);
    return card;
  });

  const ul = document.createElement('ul');
  ul.className = 'event-list';
  ul.append(...cards);
  return ul;
}

export default async function init(el) {
  try {
    const events = await fetchEventData();
    if (!events?.length) return;
    const cards = createCards(events);
    el.append(cards);
  } catch (err) {
    console.error(err);
  }
}
