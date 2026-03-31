/** Backend dashboards — only shown for `sudo projects` (not public `projects` / `ls`). */
export const SEECHORDS_BACKEND_LINKS = [
  { name: 'Fly', url: 'https://fly.io/dashboard' },
  { name: 'Turso', url: 'https://app.turso.tech/' },
];

function seechordsBackendHtmlLines() {
  return SEECHORDS_BACKEND_LINKS.map(
    (b) =>
      `<a href="${b.url}" target="_blank" rel="noopener noreferrer">${b.name}</a>`
  );
}

/** Lines for `sudo projects` (HTML). */
export function getSudoProjectsLines() {
  return ['seechords — backend', '', 'Backend:', ...seechordsBackendHtmlLines()];
}
