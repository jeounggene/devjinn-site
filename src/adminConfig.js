/** Default for `sudo projects`; override with `VITE_ADMIN_PASSWORD` in `.env.local` if you want. */
const DEFAULT_SUDO_PASSWORD = 'urmom';

export function getAdminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD ?? DEFAULT_SUDO_PASSWORD;
}

export function isSudoPasswordConfigured() {
  return Boolean(getAdminPassword());
}
