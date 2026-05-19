import { ref } from 'vue';

const PUBLIC_ROUTES = new Set(['/login', '/auth-callback']);

function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [path, queryStr = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryStr));
  const segments = path.split('/').filter(Boolean);
  return { path: '/' + segments.join('/'), segments, query };
}

function match(segments) {
  if (segments.length === 0)                          return { name: 'home',      params: {} };
  if (segments[0] === 'login')                        return { name: 'login',     params: {} };
  if (segments[0] === 'auth-callback')                return { name: 'login',     params: {} };
  if (segments[0] === 'lesson'   && segments[1])      return { name: 'lesson',    params: { id: segments.slice(1).join('/') } };
  if (segments[0] === 'results'  && segments[1])      return { name: 'results',   params: { sessionId: segments[1] } };
  if (segments[0] === 'dashboard')                    return { name: 'dashboard', params: {} };
  if (segments[0] === 'freetype')                     return { name: 'freetype',  params: {} };
  if (segments[0] === 'badges')                       return { name: 'badges',    params: {} };
  if (segments[0] === 'settings')                     return { name: 'settings',  params: {} };
  return { name: 'not-found', params: {} };
}

export const currentRoute = ref({ name: 'home', params: {}, query: {}, path: '/' });

function applyHash() {
  const { path, segments, query } = parseHash(location.hash);
  const { name, params } = match(segments);
  currentRoute.value = { name, params, query, path };
}

export function navigate(path) {
  if (!path.startsWith('#')) path = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === path) applyHash();
  else location.hash = path;
}

export function initRouter() {
  window.addEventListener('hashchange', applyHash);
  applyHash();
}

export function isPublicRoute(path) {
  return PUBLIC_ROUTES.has(path);
}
