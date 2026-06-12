import { setConfig as setNxConfig } from 'https://da.live/nx2/scripts/nx.js';
import { loadArea, loadBlock, setConfig, loadStyle } from './nx.js';
import { setPlaceholders } from './lab-placeholders.js';

await loadStyle('https://da.live/nx2/styles/styles.css');

const hostnames = ['adobelabs.dev'];

// Supported locales
const locales = { '': { ietf: 'en', title: 'English', lang: 'en', tk: 'etj3wuq.css' } };

const linkBlocks = [];

const imsClientId = 'adobelabs';
const imsScope = 'ab.manage,AdobeID,gnav,openid,org.read,read_organizations,session,additional_info.ownerOrg,additional_info.projectedProductContext,account_cluster.read';

// Widget patterns to look for
const widgets = [
  { fragment: '/fragments/' },
  { youtube: 'https://www.youtube' },
];

const conf = {
  hostnames,
  locales,
  imsClientId,
  imsScope,
  linkBlocks,
};

const initIms = (() => {
  let details;
  return () => {
    details ??= (async () => {
      try {
        const module = await import('https://da.live/nx2/utils/ims.js');
        const loaded = await module.loadIms();
        return loaded;
      } catch {
        return null;
      }
    })();
    return details;
  };
})();

function decorateLinks(area) {
  const anchors = area.querySelectorAll('a');
  for (const a of anchors) {
    const { href } = a;
    const url = new URL(href);
    if (url.origin.includes('.da.') && url.hostname.includes('--')) {
      url.hostname = url.hostname.replace('.da.', '.aem.');
      a.href = url.toString();
    }
    if (url.origin !== window.location.origin) {
      a.setAttribute('target', '_blank');
    }
  }
}

// How to decorate an area before loading it
const decorateArea = async ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    img?.removeAttribute('loading');
  };

  decorateLinks(area);
  eagerLoad(area, 'img');

  // Set IMS-based placeholders
  const details = await initIms();
  setPlaceholders(area, details?.email);
};

function detectTutorial() {
  const { classList } = document.body;
  if (!classList.contains('tutorial-template')) return;
  const section = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'tutorial-nav';
  section.append(block);
  document.querySelector('main').append(section);
  import('./lightbox.js');
}

function isTrackPage() {
  if (!document.body.classList.contains('tutorial-template')) return false;
  const pathname = window.location.pathname.replace(/\/$/, '');
  const lastSegment = pathname.split('/').pop();
  return !Number.isFinite(Number(lastSegment));
}

const loadNav = async (name) => {
  const position = name === 'sitenav' ? 'beforebegin' : 'afterend';
  const main = document.querySelector('main');
  const nav = document.createElement('nav');
  nav.dataset.status = 'decorated';
  nav.className = name;
  main.insertAdjacentElement(position, nav);
  await loadBlock(nav);
  delete nav.dataset.status;
};

function setColorScheme() {
  const { classList } = document.body;
  const hasScheme = classList.contains('light-theme') || classList.contains('dark-theme');
  if (hasScheme) return;
  const scheme = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark-theme'
    : 'light-theme';
  classList.add(scheme);
}

export async function loadPage() {
  if (localStorage.getItem('sitenav-collapsed') === 'true') {
    document.body.classList.add('sitenav-collapsed');
  }
  const isHome = window.location.pathname === '/';
  if (isHome) document.body.classList.add('home');
  await setNxConfig(conf);
  setColorScheme();
  detectTutorial();

  setConfig({ locales, widgets, decorateArea });

  // AK functions
  await loadArea();

  // Lazy project functions
  loadNav('sitenav');
  if (!isHome && !isTrackPage()) loadNav('pagenav');

  // Quick Edit
  const loadQuickEdit = async (...args) => {
    // eslint-disable-next-line import/no-cycle
    const { default: initQuickEdit } = await import('../tools/quick-edit/quick-edit.js');
    initQuickEdit(...args);
  };
  const addSidekickListeners = (sk) => {
    sk.addEventListener('custom:quick-edit', loadQuickEdit);
  };
  const sk = document.querySelector('aem-sidekick');
  if (sk) {
    addSidekickListeners(sk);
  } else {
    document.addEventListener('sidekick-ready', () => {
      addSidekickListeners(document.querySelector('aem-sidekick'));
    }, { once: true });
  }
}

loadPage();

(() => {
  const hasQE = new URL(window.location.href).searchParams.has('quick-edit');
  // eslint-disable-next-line import/no-cycle
  if (hasQE) import('../tools/quick-edit/quick-edit.js').then((mod) => mod.default());
})();
