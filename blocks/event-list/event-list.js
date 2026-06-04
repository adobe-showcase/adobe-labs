const DEFAULT_IMAGE = '/img/default-lab-card.png';

const STATUS_LABELS = { live: 'Live now', upcoming: 'Upcoming', past: 'Past' };
const STATUS_RANK = { live: 0, upcoming: 1, past: 2 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Parse a human display date like "April 20-22, 2026", "June 23, 2026", or
// "June 30 - July 2, 2026" into start/end calendar dates. Used only as a
// fallback for events that don't yet have structured start-date/end-date.
function parseEventDates(dateValue) {
  if (!dateValue) return null;
  const str = dateValue.replace(/[‒-―]/g, '-').replace(/\s+/g, ' ').trim();
  const yearMatch = str.match(/\d{4}/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);

  const head = str.slice(0, yearMatch.index).replace(/,\s*$/, '').trim();
  const [startPart, endPart] = head.split('-').map((p) => p.trim());

  const start = new Date(`${startPart}, ${year}`);
  if (Number.isNaN(start.getTime())) return null;

  let end = start;
  if (endPart) {
    if (/^\d+$/.test(endPart)) {
      // End is just a day number, e.g. "16-17"; reuse the start month.
      const month = startPart.replace(/\s*\d+$/, '').trim();
      end = new Date(`${month} ${endPart}, ${year}`);
    } else {
      // End carries its own month, e.g. "June 30 - July 2".
      end = new Date(`${endPart}, ${year}`);
    }
    if (Number.isNaN(end.getTime())) end = start;
  }
  return { start, end };
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// "Today" as YYYY-MM-DD in the event's own timezone so "live" is judged by
// the event's local day, not the viewer's. Falls back to viewer local time
// when the timezone is missing or invalid.
function todayInTimeZone(timeZone) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, ...opts }).format(new Date());
  } catch (e) {
    return new Intl.DateTimeFormat('en-CA', opts).format(new Date());
  }
}

// Resolve an event's start/end as ISO dates, preferring the structured
// start-date/end-date fields and falling back to parsing the display string.
function getEventDates(event) {
  if (ISO_DATE.test(event.startDate || '')) {
    const startISO = event.startDate;
    const endISO = ISO_DATE.test(event.endDate || '') ? event.endDate : startISO;
    return { startISO, endISO };
  }
  const parsed = parseEventDates(event.date);
  if (!parsed) return null;
  return { startISO: toISODate(parsed.start), endISO: toISODate(parsed.end) };
}

// Build a human display label from ISO dates, collapsing ranges
// ("April 20 – 22, 2026", "June 30 – July 2, 2026"). Dates are constructed
// from their parts to avoid the UTC-midnight off-by-one of new Date(iso).
function formatDisplayDate(startISO, endISO) {
  const toLocal = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const start = toLocal(startISO);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (!endISO || endISO === startISO) return fmt.format(start);
  return fmt.formatRange(start, toLocal(endISO));
}

function decorateStatus(event) {
  const dates = getEventDates(event);
  // Authored event-date wins (legacy or custom labels); otherwise generate.
  const displayDate = event.date
    || (dates ? formatDisplayDate(dates.startISO, dates.endISO) : '');
  if (!dates) {
    // Undated/unparseable: keep visible but sort to the end of upcoming.
    return { ...event, displayDate, status: 'upcoming', startISO: '9999-12-31' };
  }
  const { startISO, endISO } = dates;
  const today = todayInTimeZone(event.timezone);
  let status = 'live';
  if (today < startISO) status = 'upcoming';
  else if (today > endISO) status = 'past';
  return { ...event, displayDate, status, startISO, endISO };
}

async function fetchEventData() {
  const resp = await fetch('/events/query-index.json');
  if (!resp.ok) throw Error('Could not fetch event index');
  const { data } = await resp.json();
  return data.map(decorateStatus).sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    // Past: most recent first. Live and upcoming: soonest first.
    return a.status === 'past'
      ? b.startISO.localeCompare(a.startISO)
      : a.startISO.localeCompare(b.startISO);
  });
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

    const badge = document.createElement('span');
    badge.className = `event-list-card-badge is-${event.status}`;
    badge.textContent = STATUS_LABELS[event.status];
    imgContainer.append(badge);

    const textContainer = document.createElement('div');
    textContainer.className = 'event-list-card-text';

    const title = document.createElement('p');
    title.className = 'event-list-card-title';
    title.textContent = event.title;

    const date = document.createElement('p');
    date.className = 'event-list-card-date';
    date.textContent = event.displayDate || '';

    const description = document.createElement('p');
    description.className = 'event-list-card-description';
    description.textContent = event.description;

    textContainer.append(title, date, description);
    link.append(imgContainer, textContainer);
    card.append(link);
    return card;
  });

  const ul = document.createElement('ul');
  ul.className = 'docket-event-list';
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
