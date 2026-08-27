import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver — MapView depends on it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// jsdom doesn't implement requestAnimationFrame timing exactly the same; the
// fallback that runs synchronously is fine for our tests.
if (typeof global.requestAnimationFrame !== 'function') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}
