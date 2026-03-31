/** Backend dashboards — only shown for `sudo projects` (not public `projects` / `ls`). */
export const SEECHORDS_BACKEND_LINKS = [
  { name: 'Fly · seechords-worker', url: 'https://fly.io/apps/seechords-worker' },
  { name: 'Fly · seechords', url: 'https://fly.io/apps/seechords' },
  { name: 'Turso · seechords', url: 'https://app.turso.tech/jeounggene/databases/seechords' },
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
