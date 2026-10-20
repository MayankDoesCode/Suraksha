// Demo-only logos (fictional "Acme Corp"), as SVG data URLs so the demo works offline.
const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 128 128">${body}</svg>`)}`;

const SHIELD = '<rect width="128" height="128" fill="#fff"/><circle cx="64" cy="64" r="54" fill="#1b3a8c"/><polygon points="64,24 100,100 28,100" fill="#fff"/><rect x="30" y="80" width="68" height="12" fill="#f5c400"/>';

export const ACME_LOGO = svg(SHIELD);
/** Same artwork with a "PRO" ribbon and slightly different blue: a typical impersonator edit. */
export const ACME_LOGO_COPY = svg(
  SHIELD.replace('#1b3a8c', '#1f3f96') + '<rect x="72" y="8" width="48" height="16" fill="#f5c400"/><text x="96" y="21" font-size="12" text-anchor="middle" fill="#1b3a8c" font-family="Arial" font-weight="700">PRO</text>'
);
/** An unrelated brand's logo (partner / parody / independent account). */
export const OTHER_LOGO = svg(
  '<rect width="128" height="128" fill="#c62828"/><path d="M0 0 L128 128 M0 40 L88 128 M40 0 L128 88" stroke="#111" stroke-width="10"/><circle cx="64" cy="64" r="22" fill="#2e7d32"/>'
);
