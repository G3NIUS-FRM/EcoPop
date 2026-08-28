import { useEffect, useState, useCallback } from 'react';

// Lightweight hash-based router. We don't pull in react-router-dom because the
// project only has a single "user-page" route outside the admin tabs. The hook
// reads `location.hash`, normalises it, and exposes a `navigate(to)` helper
// that updates the hash (which fires `hashchange` and re-renders consumers).
//
// Supported routes:
//   ''  or '#/'        → admin shell (default)
//   '#/user-page'      → end-user mobile page (full screen, no admin chrome)
//
// Unknown hashes fall back to the admin shell.

const ROUTES = ['/', '/user-page'];

function parseHash(rawHash) {
  let h = rawHash || '';
  // Strip leading '#' then any leading '/' so '#user-page' === '#/user-page'
  if (h.startsWith('#')) h = h.slice(1);
  if (!h.startsWith('/')) h = '/' + h;
  return h || '/';
}

export function useHashRoute() {
  const [path, setPath] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    function onChange() {
      setPath(parseHash(window.location.hash));
      // When the user navigates to the user-page via the URL bar (not a click),
      // make sure the page scrolls to the top instead of preserving the admin
      // scroll position. Browsers usually do this on real navigation; hash
      // changes are inconsistent.
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to) => {
    const target = to.startsWith('#') ? to : `#${to}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
    } else {
      // Same hash → manually trigger re-render (hashchange won't fire).
      setPath(parseHash(target));
    }
  }, []);

  const isKnown = ROUTES.includes(path);
  return { path, navigate, isKnown };
}
